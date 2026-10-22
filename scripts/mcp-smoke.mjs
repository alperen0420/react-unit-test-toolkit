import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(repo, 'examples', 'demo-react');
const client = new Client({ name: 'react-test-mcp-smoke', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(repo, 'dist', 'server.js')],
  env: { ...process.env, REACT_TEST_ALLOWED_ROOT: demo },
});

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert.notEqual(result.isError, true, `${name} returned ${JSON.stringify(result.content)}`);
  const content = result.content.find(c => c.type === 'text')?.text;
  assert.ok(content, `No text returned from ${name}`);
  return JSON.parse(content);
}

try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools;
  const names = tools.map(x => x.name);
  assert.deepEqual(names.sort(), [
    'inspect_project', 'analyze_react_file', 'validate_test', 'run_unit_test', 'get_test_coverage'
  ].sort());
  const project = await call('inspect_project', {});
  assert.equal(project.vitestEntrypointFound, true);
  const analyzed = await call('analyze_react_file', { file: 'src/components/Counter.tsx' });
  assert.ok(analyzed.jsxEventHandlers.includes('onClick'));
  const validated = await call('validate_test', {
    testFile: 'src/components/Counter.test.tsx', sourceFile: 'src/components/Counter.tsx',
  });
  assert.equal(validated.valid, true, JSON.stringify(validated));
  const tested = await call('run_unit_test', { testFile: 'src/components/Counter.test.tsx' });
  assert.equal(tested.status, 'passed', JSON.stringify(tested));
  console.log('MCP handshake, 5 tools, AST analysis, validation and real Vitest execution: OK');
} finally {
  await client.close();
}
