import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { summarizeIstanbul, getTestCoverage } from '../coverage.js';

test('Istanbul coverage summarizes branches and uncovered lines', () => {
  const summary = summarizeIstanbul({
    s: { '0': 1, '1': 0 }, f: { '0': 1, '1': 0 }, b: { '0': [1, 0] },
    statementMap: { '0': { start: { line: 1 } }, '1': { start: { line: 5 } } },
  }) as { statements: { percent:number }; branches: { percent:number }; uncoveredStatementLines:number[] };
  assert.equal(summary.statements.percent, 50);
  assert.equal(summary.branches.percent, 50);
  assert.deepEqual(summary.uncoveredStatementLines, [5]);
});

test('coverage handles missing report without claiming 0% coverage', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-coverage-'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'package.json'), '{}');
  await writeFile(path.join(root, 'src', 'Button.tsx'), 'export const Button = () => null');
  const old = process.env.REACT_TEST_ALLOWED_ROOT;
  process.env.REACT_TEST_ALLOWED_ROOT = root;
  try {
    const result = await getTestCoverage('src/Button.tsx') as { available: boolean; message: string };
    assert.equal(result.available, false);
    assert.match(result.message, /No coverage/);
  } finally {
    if (old === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = old;
    await rm(root, { recursive: true, force: true });
  }
});
