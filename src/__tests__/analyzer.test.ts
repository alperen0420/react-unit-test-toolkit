import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeReactFile } from '../analyzer.js';

test('AST analyzer finds props, hooks, events and conditionals', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mcp-analyze-'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'package.json'), '{}');
  await writeFile(path.join(root, 'src', 'Button.tsx'), `
    import { useState } from 'react';
    type Props = { disabled?: boolean };
    export function Button({ disabled }: Props) {
      const [n, setN] = useState(0);
      if (disabled) return null;
      return <button onClick={() => setN(n + 1)}>{n}</button>;
    }
  `);
  const previous = process.env.REACT_TEST_ALLOWED_ROOT;
  process.env.REACT_TEST_ALLOWED_ROOT = root;
  try {
    const res = await analyzeReactFile('src/Button.tsx') as {
      exportedFunctions: Array<{name:string}>; hookCalls:string[]; jsxEventHandlers:string[]; conditionalNodes:number;
    };
    assert.ok(res.exportedFunctions.some(f => f.name === 'Button'));
    assert.ok(res.hookCalls.includes('useState'));
    assert.ok(res.jsxEventHandlers.includes('onClick'));
    assert.ok(res.conditionalNodes > 0);
  } finally {
    if (previous === undefined) delete process.env.REACT_TEST_ALLOWED_ROOT;
    else process.env.REACT_TEST_ALLOWED_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
});
