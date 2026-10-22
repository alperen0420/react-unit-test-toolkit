import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildDependencyIndex, getRelatedContext, getAffectedComponents } from '../relations.js';

const create = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mcp-relations-'));
  await mkdir(path.join(root, 'src/components'), { recursive: true });
  await mkdir(path.join(root, 'src/hooks'), { recursive: true });
  await mkdir(path.join(root, 'src/utils'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{}');
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] }, jsx: 'react-jsx', moduleResolution: 'bundler', module: 'ESNext' } }));
  await writeFile(path.join(root, 'src/utils/format.ts'), `export const format = (n: number) => n.toString();`);
  await writeFile(path.join(root, 'src/hooks/useCount.ts'), `import { format } from '@/utils/format'; export const useCount = () => format(1);`);
  await writeFile(path.join(root, 'src/components/Counter.tsx'), `import { useCount } from '../hooks/useCount'; export function Counter() { return <button>{useCount()}</button>; }`);
  await writeFile(path.join(root, 'src/components/Page.tsx'), `import { Counter } from './Counter'; export const Page = () => <main><Counter /></main>;`);
  await writeFile(path.join(root, 'src/components/Counter.test.tsx'), `import { Counter } from './Counter'; test('test', () => {});`);
  return root;
};

test('graph finds local relative imports and tsconfig path aliases, excludes tests and symlinks', async () => {
  const root = await create();
  const outside = path.join(os.tmpdir(), 'outside-test.tsx');
  await symlink(outside, path.join(root, 'src/components/Escape.tsx'));
  try {
    const index = await buildDependencyIndex(root);
    assert.deepEqual(index.files.get('src/components/Counter.tsx')?.imports, ['src/hooks/useCount.ts']);
    assert.deepEqual(index.files.get('src/hooks/useCount.ts')?.imports, ['src/utils/format.ts']);
    assert.deepEqual(index.importers.get('src/components/Counter.tsx'), ['src/components/Page.tsx']);
    assert.ok(!index.files.has('src/components/Counter.test.tsx'));
    assert.ok(!index.files.has('src/components/Escape.tsx'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('related context is bounded and reverse impact shows only affected component paths', async () => {
  const root = await create();
  const previous = process.env.REACT_TEST_ALLOWED_ROOT;
  process.env.REACT_TEST_ALLOWED_ROOT = root;
  try {
    const ctx = await getRelatedContext('src/components/Counter.tsx', 2) as {
      target: string; context: Array<{file: string; depth: number}>; directImporters: string[];
    };
    assert.deepEqual(ctx.context.map(x => x.file), ['src/components/Counter.tsx', 'src/hooks/useCount.ts', 'src/utils/format.ts']);
    assert.deepEqual(ctx.directImporters, ['src/components/Page.tsx']);
    const affected = await getAffectedComponents('src/utils/format.ts', 3) as {affected: Array<{file:string}>};
    assert.deepEqual(affected.affected.map(x => x.file), ['src/hooks/useCount.ts', 'src/components/Counter.tsx', 'src/components/Page.tsx']);
    await assert.rejects(getRelatedContext('../escape.tsx'), /traversal/);
  } finally {
    if (previous === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
});
