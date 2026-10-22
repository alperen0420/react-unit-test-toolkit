import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { analyzeReactFile } from './analyzer.js';
import { inspectProject } from './project.js';
import { validateTest } from './validator.js';
import { runUnitTest } from './runner.js';
import { getTestCoverage } from './coverage.js';

const textResult = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
async function safeCall(fn: () => Promise<unknown>) {
  try { return textResult(await fn()); }
  catch (err) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
      isError: true,
    };
  }
}

serveStdio(() => {
  const server = new McpServer({ name: 'react-unit-test-toolkit', version: '0.1.0' });

  server.registerTool('inspect_project', {
    description: 'Read the configured React project package scripts, test dependencies and config files (read-only).',
    inputSchema: z.object({}),
  }, async () => safeCall(() => inspectProject()));

  server.registerTool('analyze_react_file', {
    description: 'Analyze one project-relative TSX/TS/JSX/JS file with the TypeScript AST; return imports, components, JSX events, hook calls and source excerpt for dynamic scenario planning.',
    inputSchema: z.object({ file: z.string().min(1).max(500) }),
  }, async ({ file }: { file: string }) => safeCall(() => analyzeReactFile(file)));

  server.registerTool('validate_test', {
    description: 'Statically validate an existing generated test file against its source: syntax, direct import, test cases and assertions; not a proof of test quality.',
    inputSchema: z.object({
      testFile: z.string().min(1).max(500),
      sourceFile: z.string().min(1).max(500),
    }),
  }, async ({ testFile, sourceFile }: { testFile: string; sourceFile: string }) => safeCall(() => validateTest(testFile, sourceFile)));

  server.registerTool('run_unit_test', {
    description: 'Execute ONE existing project-local Vitest test file with a hard timeout. Requires a trusted project. Never auto-approve in Cline.',
    inputSchema: z.object({
      testFile: z.string().min(1).max(500),
      timeoutMs: z.number().int().min(5_000).max(120_000).optional(),
    }),
  }, async ({ testFile, timeoutMs }: { testFile: string; timeoutMs?: number }) => safeCall(() => runUnitTest(testFile, timeoutMs)));

  server.registerTool('get_test_coverage', {
    description: 'Read project coverage/coverage-final.json for a source file and show uncovered lines/statement/function/branch percentages. Does not execute tests.',
    inputSchema: z.object({ sourceFile: z.string().min(1).max(500) }),
  }, async ({ sourceFile }: { sourceFile: string }) => safeCall(() => getTestCoverage(sourceFile)));

  return server;
});
