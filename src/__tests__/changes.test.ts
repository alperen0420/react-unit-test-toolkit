import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getChangedComponents } from '../changes.js';

test('Git status distinguishes added components, edited hooks and affected importers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-changes-'));
  const prev = process.env.REACT_TEST_ALLOWED_ROOT;
  try {
    await mkdir(path.join(root, 'src'), { recursive: true });
    await writeFile(path.join(root, 'package.json'), '{}');
    await writeFile(path.join(root, 'src/useItems.ts'), 'export const useItems = () => 1;');
    await writeFile(path.join(root, 'src/List.tsx'), `import { useItems } from './useItems'; export const List = () => <span>{useItems()}</span>;`);
    for (const args of [['init','-b','main'], ['config','user.email','bot@example.invalid'], ['config','user.name','Demo'], ['add','.'], ['commit','-m','first']]) {
      execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    }
    await writeFile(path.join(root, 'src/useItems.ts'), 'export const useItems = () => 2;');
    await writeFile(path.join(root, 'src/NewCard.tsx'), 'export const NewCard = () => <section />;');
    process.env.REACT_TEST_ALLOWED_ROOT = root;
    const report = await getChangedComponents() as {
      selectedTargets: Array<{file:string;change:string}>;
      directlyAffectedTargets: string[];
    };
    assert.deepEqual(report.selectedTargets.map(x=>`${x.change}:${x.file}`), ['added:src/NewCard.tsx', 'modified:src/useItems.ts']);
    assert.ok(report.directlyAffectedTargets.includes('src/List.tsx'));
    await assert.rejects(getChangedComponents('--output=/tmp/hack'), /baseRef/);
  } finally {
    if (prev === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = prev;
    await rm(root, { recursive: true, force: true });
  }
});
