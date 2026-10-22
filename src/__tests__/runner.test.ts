import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runUnitTest } from '../runner.js';

test('runner invokes only the project-local Vitest entry and reads structured results', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mcp-runner-'));
  await mkdir(path.join(root, 'src'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', 'vitest'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{}');
  await writeFile(path.join(root, 'src', 'Button.test.tsx'), `test('hello', () => {})`);
  await writeFile(path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), `
    import { writeFileSync } from 'node:fs';
    const output = process.argv.find(arg => arg.startsWith('--outputFile='));
    if (!output) process.exit(9);
    writeFileSync(output.slice('--outputFile='.length), JSON.stringify({
      numTotalTests: 2, numPassedTests: 1, numFailedTests: 1,
      testResults: [{assertionResults:[{status:'failed',fullName:'broken',failureMessages:['AssertionError']}]}]
    }));
    process.exit(1);
  `);
  const previous = process.env.REACT_TEST_ALLOWED_ROOT;
  process.env.REACT_TEST_ALLOWED_ROOT = root;
  try {
    const res = await runUnitTest('src/Button.test.tsx') as {
      status:string; totals: {failed:number}; failures:Array<{name:string}>;
    };
    assert.equal(res.status, 'failed');
    assert.equal(res.totals.failed, 1);
    assert.equal(res.failures[0]?.name, 'broken');
    await assert.rejects(runUnitTest('../outside.test.tsx'), /traversal/);
  } finally {
    if (previous === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
});
