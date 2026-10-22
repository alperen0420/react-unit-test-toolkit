import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { analyzeReactFile } from './analyzer.js';
import { inspectProject } from './project.js';
import { validateTest } from './validator.js';
import { runUnitTest } from './runner.js';
import { getTestCoverage } from './coverage.js';
import { getRelatedContext, getAffectedComponents } from './relations.js';
import { getChangedComponents } from './changes.js';
import { runRelatedTests } from './runner.js';

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
  const server = new McpServer({ name: 'react-unit-test-toolkit', version: '0.2.0' });

  server.registerTool('inspect_project', {
    description: 'Read the configured React project package scripts, test dependencies and config files (read-only).',
    inputSchema: z.object({}),
  }, async () => safeCall(() => inspectProject()));

  server.registerTool('analyze_react_file', {
    description: 'Analyze one project-relative TSX/TS/JSX/JS file with the TypeScript AST; return imports, components, JSX events, hook calls and source excerpt for dynamic scenario planning.',
    inputSchema: z.object({ file: z.string().min(1).max(500) }),
  }, async ({ file }: { file: string }) => safeCall(() => analyzeReactFile(file)));

  server.registerTool('get_related_context', {
    description: 'Analyze a selected source and bounded direct/transitive project-local dependencies (max 2 hops) with limited excerpts; report direct importers as filenames only.',
    inputSchema: z.object({ file: z.string().min(1).max(500), depth: z.number().int().min(1).max(2).optional() }),
  }, async ({ file, depth }: { file: string; depth?: number }) => safeCall(() => getRelatedContext(file, depth)));

  server.registerTool('get_changed_components', {
    description: 'Find new or modified React component and hook candidates using local Git status/diff. Default base HEAD; HEAD~1 can include last committed changes.',
    inputSchema: z.object({ baseRef: z.string().max(48).optional() }),
  }, async ({ baseRef }: { baseRef?: string }) => safeCall(() => getChangedComponents(baseRef)));

  server.registerTool('get_affected_components', {
    description: 'Return static reverse import dependency candidates affected by a selected local source module, without creating or running tests.',
    inputSchema: z.object({ file: z.string().min(1).max(500), depth: z.number().int().min(1).max(3).optional() }),
  }, async ({ file, depth }: { file: string; depth?: number }) => safeCall(() => getAffectedComponents(file, depth)));

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

  server.registerTool('run_related_tests', {
    description: 'Run only Vitest tests statically related to ONE selected source file, with a hard timeout and structured result. Requires explicit approval and trusted code.',
    inputSchema: z.object({ sourceFile: z.string().min(1).max(500), timeoutMs: z.number().int().min(5_000).max(120_000).optional() }),
  }, async ({ sourceFile, timeoutMs }: { sourceFile: string; timeoutMs?: number }) => safeCall(() => runRelatedTests(sourceFile, timeoutMs)));

  server.registerTool('get_test_coverage', {
    description: 'Read project coverage/coverage-final.json for a source file and show uncovered lines/statement/function/branch percentages. Does not execute tests.',
    inputSchema: z.object({ sourceFile: z.string().min(1).max(500) }),
  }, async ({ sourceFile }: { sourceFile: string }) => safeCall(() => getTestCoverage(sourceFile)));

  return server;
});
