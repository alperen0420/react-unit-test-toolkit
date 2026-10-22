import path from 'node:path';
import ts from 'typescript';
import { getProjectRoot, readProjectText, SOURCE_EXTS, TEST_EXTS } from './security.js';

export type ValidationResult = {
  valid: boolean;
  testFile: string;
  sourceFile: string;
  testCases: number;
  assertions: number;
  errors: string[];
  warnings: string[];
  note: string;
};

function stripKnownExtension(s: string): string {
  return s.replace(/\.(?:[jt]sx?)$/, '').replace(/\/index$/, '');
}

export function validateTestText(
  code: string,
  testAbs: string,
  sourceAbs: string,
): Omit<ValidationResult, 'testFile' | 'sourceFile'> {
  const ast = ts.createSourceFile(testAbs, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const errors: string[] = [];
  const warnings: string[] = [];
  const transpiled = ts.transpileModule(code, {
    fileName: testAbs,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  for (const diagnostic of transpiled.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
    }
  }
  let importsSource = false;
  let testCases = 0;
  let assertions = 0;
  let testWithoutExpect = 0;
  const sourceBase = stripKnownExtension(sourceAbs);

  function containsExpectation(node: ts.Node): boolean {
    let found = false;
    const visit = (child: ts.Node): void => {
      if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && ['expect', 'assert'].includes(child.expression.text)) found = true;
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (spec.startsWith('.')) {
        const abs = path.resolve(path.dirname(testAbs), spec);
        if (stripKnownExtension(abs) === sourceBase) importsSource = true;
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        const full = callee.getText(ast);
        if (/^(test|it|describe)\.(only|skip)$/.test(full)) errors.push(`Forbidden focused/skipped block: ${full}`);
        if (/\.(toMatchSnapshot|toMatchInlineSnapshot)$/.test(full)) warnings.push('Snapshot assertion found; verify it is intentional.');
      }
      if (ts.isIdentifier(callee) && (callee.text === 'test' || callee.text === 'it')) {
        testCases++;
        const fn = node.arguments[1];
        if (!fn || !containsExpectation(fn)) testWithoutExpect++;
      }
      if (ts.isIdentifier(callee) && (callee.text === 'expect' || callee.text === 'assert')) assertions++;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!importsSource) errors.push('Test must directly import the target source file by a relative module path.');
  if (testCases === 0) errors.push('No supported test(...) or it(...) cases found (test.each not statically inspected).');
  if (testWithoutExpect > 0) errors.push(`${testWithoutExpect} test case(s) do not have an expect/assert call.`);
  if (assertions === 0) errors.push('No assertions found.');
  return {
    valid: errors.length === 0,
    testCases,
    assertions,
    errors,
    warnings,
    note: 'Static/syntax lint only: passing here is NOT proof of runtime correctness or meaningful assertions.',
  };
}

export async function validateTest(testFile: string, sourceFile: string): Promise<ValidationResult> {
  const root = await getProjectRoot();
  const test = await readProjectText(root, testFile, TEST_EXTS);
  const source = await readProjectText(root, sourceFile, SOURCE_EXTS);
  const checked = validateTestText(test.text, test.absolute, source.absolute);
  return { testFile: test.relative, sourceFile: source.relative, ...checked };
}
