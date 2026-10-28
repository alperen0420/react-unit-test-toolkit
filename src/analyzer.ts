import { readdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { getProjectRoot, readProjectText, SOURCE_EXTS } from './security.js';

export async function analyzeReactFile(filePath: string): Promise<object> {
  const root = await getProjectRoot();
  const source = await readProjectText(root, filePath, SOURCE_EXTS);
  const kind = source.absolute.endsWith('.tsx') ? ts.ScriptKind.TSX : source.absolute.endsWith('.jsx') ? ts.ScriptKind.JSX : source.absolute.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(source.absolute, source.text, ts.ScriptTarget.Latest, true, kind);
  const imports: Array<{ from: string; symbols: string[] }> = [];
  const exportedFunctions: Array<{ name: string; propsOrParameters: string[]; type?: string }> = [];
  const jsxTags = new Set<string>();
  const hooks = new Set<string>();
  const eventHandlers = new Set<string>();
  let branchCount = 0;
  let jsxPresent = false;
  const isExported = (node: ts.Node) => ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

  function scan(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const symbols: string[] = [];
      if (clause?.name) symbols.push(clause.name.text);
      const named = clause?.namedBindings;
      if (named && ts.isNamedImports(named)) symbols.push(...named.elements.map(e => e.name.text));
      if (named && ts.isNamespaceImport(named)) symbols.push('* as ' + named.name.text);
      imports.push({ from: node.moduleSpecifier.text, symbols });
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      imports.push({ from: node.arguments[0].text, symbols: ['require'] });
    }
    if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
      exportedFunctions.push({
        name: node.name.text,
        propsOrParameters: node.parameters.map(p => p.name.getText(ast)),
        type: node.parameters[0]?.type?.getText(ast),
      });
    }
    if (ts.isVariableStatement(node) && isExported(node)) {
      for (const d of node.declarationList.declarations) {
        const initializer = d.initializer;
        if (ts.isIdentifier(d.name) && initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
          exportedFunctions.push({
            name: d.name.text,
            propsOrParameters: initializer.parameters.map(p => p.name.getText(ast)),
            type: initializer.parameters[0]?.type?.getText(ast),
          });
        }
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      jsxPresent = true;
      jsxTags.add(node.tagName.getText(ast));
      for (const a of node.attributes.properties) {
        if (ts.isJsxAttribute(a)) {
          const name = a.name.getText(ast);
          if (/^on[A-Z]/.test(name)) eventHandlers.add(name);
        }
      }
    }
    if (ts.isJsxFragment(node)) jsxPresent = true;
    if (ts.isCallExpression(node)) {
      const e = node.expression;
      const callee = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : '';
      if (/^use[A-Z]/.test(callee)) hooks.add(callee);
    }
    if (ts.isIfStatement(node) || ts.isSwitchStatement(node) || ts.isConditionalExpression(node) || (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind))) branchCount += 1;
    ts.forEachChild(node, scan);
  }
  scan(ast);
  const siblings = await readdir(path.dirname(source.absolute));
  const nearbyTests = siblings.filter(x => /\.(test|spec)\.[jt]sx?$/.test(x)).slice(0, 12);
  return {
    file: source.relative,
    imports,
    exportedFunctions,
    jsxPresent,
    jsxTags: [...jsxTags].slice(0, 40),
    hookCalls: [...hooks].slice(0, 30),
    jsxEventHandlers: [...eventHandlers].slice(0, 30),
    conditionalNodes: branchCount,
    nearbyTests,
    sourceCode: source.text.slice(0, 18_000),
    sourceTruncated: source.text.length > 18_000,
    note: 'Structural hints, not a scenario list. Plan observable test scenarios based only on actual code and nearby conventions.',
  };
}
