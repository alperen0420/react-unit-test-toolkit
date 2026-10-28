import path from 'node:path';
import ts from 'typescript';
import { getProjectRoot, readProjectText, SOURCE_EXTS, TEST_EXTS } from './security.js';

export type ValidationResult = {
  valid: boolean;
  testFile: string;
  sourceFile: string;
  testCases: number;
  assertions: number;
  targetImportVerified: boolean;
  errors: string[];
  warnings: string[];
  note: string;
};

function stripKnownExtension(s: string): string {
  return s.replace(/\.(?:[jt]sx?|mjs|cjs|mts|cts)$/, '').replace(/\/index$/, '');
}

/** Fast static check. Unresolved import aliases and indirect imports are warnings, not proof of an invalid test. */
export function validateTestText(
  code: string, testAbs: string, sourceAbs: string,
): Omit<ValidationResult, 'testFile' | 'sourceFile'> {
  const kind = /\.[jt]sx$/.test(testAbs) ? ts.ScriptKind.TSX : /\.[jt]s$/.test(testAbs) ? ts.ScriptKind.TS : ts.ScriptKind.Unknown;
  const ast = ts.createSourceFile(testAbs, code, ts.ScriptTarget.Latest, true, kind);
  const errors: string[] = [];
  const warnings: string[] = [];
  const diagnostics = ts.transpileModule(code, {
    fileName: testAbs, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).diagnostics ?? [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
    }
  }
  let targetImportVerified = false;
  let testCases = 0;
  let assertions = 0;
  let testWithoutExpect = 0;
  const sourceBase = stripKnownExtension(sourceAbs);

  function recordModule(spec: string): void {
    if (!spec.startsWith('.')) return;
    const abs = path.resolve(path.dirname(testAbs), spec);
    if (stripKnownExtension(abs) === sourceBase) targetImportVerified = true;
  }

  function isAssertionCall(node: ts.CallExpression): boolean {
    const callee = node.expression;
    if (ts.isIdentifier(callee)) return callee.text === 'expect' || callee.text === 'assert';
    if (ts.isPropertyAccessExpression(callee)) {
      return ts.isIdentifier(callee.expression) && callee.expression.text === 'assert';
    }
    return false;
  }

  function containsAssertion(node: ts.Node): boolean {
    let found = false;
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && isAssertionCall(n)) found = true;
      ts.forEachChild(n, visit);
    };
    visit(node);
    return found;
  }

  function recordTestCase(fn: ts.Node | undefined): void {
    testCases++;
    if (!fn || !containsAssertion(fn)) testWithoutExpect++;
  }

  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      recordModule(node.moduleSpecifier.text);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      recordModule(node.moduleReference.expression.text);
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && callee.text === 'require' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        recordModule(node.arguments[0].text);
      }
      if (ts.isPropertyAccessExpression(callee)) {
        const full = callee.getText(ast);
        if (/^(test|it|describe)\.(only|skip)$/.test(full)) errors.push(`Forbidden focused/skipped block: ${full}`);
        if (/\.(toMatchSnapshot|toMatchInlineSnapshot)$/.test(full)) warnings.push('Snapshot assertion found; verify it is intentional.');
      }
      if (ts.isIdentifier(callee) && ['test', 'it'].includes(callee.text)) recordTestCase(node.arguments[1]);
      // Jest/Vitest: test.each(cases)('name', () => { expect(...) })
      if (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression)) {
        const p = callee.expression;
        if (p.name.text === 'each' && ts.isIdentifier(p.expression) && ['test', 'it'].includes(p.expression.text)) {
          recordTestCase(node.arguments[1]);
        }
      }
      if (isAssertionCall(node)) assertions++;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!targetImportVerified) warnings.push('Could not statically verify target import. Check aliases, indirect usage or dynamic require manually; not proof of invalid test.');
  if (testCases === 0) errors.push('No supported test(...) or it(...) cases found.');
  if (testWithoutExpect > 0) warnings.push(`${testWithoutExpect} test case(s) have no inline assertion; review callbacks, helper assertions or expected throws.`);
  if (assertions === 0) errors.push('No expect/assert call found.');
  return {
    valid: errors.length === 0, testCases, assertions, targetImportVerified, errors, warnings,
    note: 'Heuristic syntax/test structure check only; passing does not prove observable behavior or assertion quality.',
  };
}

export async function validateTest(testFile: string, sourceFile: string): Promise<ValidationResult> {
  const root = await getProjectRoot();
  const test = await readProjectText(root, testFile, TEST_EXTS);
  const source = await readProjectText(root, sourceFile, SOURCE_EXTS);
  return { testFile: test.relative, sourceFile: source.relative, ...validateTestText(test.text, test.absolute, source.absolute) };
}
