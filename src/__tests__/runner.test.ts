import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectFramework, runUnitTest, runRelatedTests } from '../runner.js';

test('runner invokes only the project-local Vitest entry and reads structured results', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-vitest-runner-'));
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
    assert.equal(await detectFramework(root), 'vitest');
    const res = await runUnitTest('src/Button.test.tsx') as {
      framework: string; status:string; totals: {failed:number}; failures:Array<{name:string}>;
    };
    assert.equal(res.framework, 'vitest');
    assert.equal(res.status, 'failed');
    assert.equal(res.totals.failed, 1);
    assert.equal(res.failures[0]?.name, 'broken');
    await assert.rejects(runUnitTest('../outside.test.tsx'), /traversal/);
    await writeFile(path.join(root, 'src', 'Button.tsx'), 'export const Button = () => null');
    const related = await runRelatedTests('src/Button.tsx') as { mode: string; sourceFile: string; status: string };
    assert.equal(related.mode, 'related');
    assert.equal(related.sourceFile, 'src/Button.tsx');
    assert.equal(related.status, 'failed');
    await assert.rejects(runRelatedTests('../outside.tsx'), /traversal/);
  } finally {
    if (previous === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test('Jest-only project runs selected tests and related regressions without migrating', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-jest-runner-'));
  await mkdir(path.join(root, 'tests'), { recursive: true });
  await mkdir(path.join(root, 'web'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', 'jest', 'bin'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{"name":"jest-only"}');
  await writeFile(path.join(root, 'web', 'profil.js'), 'exports.Profil = () => null');
  await writeFile(path.join(root, 'tests', 'profil.test.js'), `const { Profil } = require('../web/profil.js'); test('profile', () => expect(Profil).toBeDefined());`);
  await writeFile(path.join(root, 'node_modules', 'jest', 'bin', 'jest.js'), `
    const fs = require('node:fs');
    const output = process.argv.find(arg => arg.startsWith('--outputFile='));
    if (!output || !process.argv.includes('--runInBand') || !process.argv.includes('--json')) process.exit(9);
    const selected = process.argv.includes('--runTestsByPath') || process.argv.includes('--findRelatedTests');
    if (!selected) process.exit(8);
    fs.writeFileSync(output.slice('--outputFile='.length), JSON.stringify({
      numTotalTests: 1, numPassedTests: 1, numFailedTests: 0,
      testResults: [{assertionResults:[{status:'passed',fullName:'profile'}]}]
    }));
  `);
  const previous = process.env.REACT_TEST_ALLOWED_ROOT;
  process.env.REACT_TEST_ALLOWED_ROOT = root;
  try {
    assert.equal(await detectFramework(root), 'jest');
    const result = await runUnitTest('tests/profil.test.js') as {framework:string; status:string; totals:{passed:number}};
    assert.equal(result.framework, 'jest');
    assert.equal(result.status, 'passed');
    assert.equal(result.totals.passed, 1);
    const related = await runRelatedTests('web/profil.js') as {framework:string; status:string;mode:string};
    assert.equal(related.framework, 'jest');
    assert.equal(related.mode, 'related');
    assert.equal(related.status, 'passed');
  } finally {
    if (previous === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test('ambiguous project with both runners requires explicit choice', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-mixed-runner-'));
  await mkdir(path.join(root, 'node_modules', 'vitest'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', 'jest', 'bin'), { recursive: true });
  await writeFile(path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), '');
  await writeFile(path.join(root, 'node_modules', 'jest', 'bin', 'jest.js'), '');
  await writeFile(path.join(root, 'Button.test.js'), 'test("unmarked", ()=>{})');
  try {
    await assert.rejects(detectFramework(root, 'Button.test.js'), /Both Jest and Vitest/);
    assert.equal(await detectFramework(root, undefined, 'jest'), 'jest');
  } finally { await rm(root, { recursive: true, force: true }); }
});
