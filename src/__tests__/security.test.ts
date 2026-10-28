import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getProjectRoot, isInside, readProjectText } from '../security.js';

test('path confinement rejects traversal, absolute paths, symlink escape', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'skill-security-'));
  const root = path.join(tmp, 'repo');
  const outside = path.join(tmp, 'outside.tsx');
  await mkdir(root);
  await writeFile(path.join(root, 'package.json'), '{}');
  await writeFile(path.join(root, 'Counter.tsx'), 'export const Counter = () => null');
  await writeFile(outside, 'do not read me');
  await symlink(outside, path.join(root, 'escape.tsx'));
  const prev = process.env.REACT_TEST_ALLOWED_ROOT;
  process.env.REACT_TEST_ALLOWED_ROOT = root;
  try {
    const canonical = await getProjectRoot();
    assert.equal((await readProjectText(canonical, 'Counter.tsx', ['.tsx'])).text.includes('Counter'), true);
    await assert.rejects(readProjectText(canonical, '../outside.tsx', ['.tsx']), /traversal/);
    await assert.rejects(readProjectText(canonical, outside, ['.tsx']), /Absolute/);
    await assert.rejects(readProjectText(canonical, 'escape.tsx', ['.tsx']), /Symlink/);
    await assert.rejects(readProjectText(canonical, 'package.json', ['.tsx']), /Unsupported/);
    assert.equal(isInside(root, root), true);
    assert.equal(isInside(root, outside), false);
  } finally {
    if (prev === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = prev;
    await rm(tmp, { recursive: true, force: true });
  }
});
