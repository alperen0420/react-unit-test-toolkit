import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getProjectRoot } from './security.js';

export async function inspectProject(): Promise<object> {
  const root = await getProjectRoot();
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
    name?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const relevant = Object.fromEntries(
    Object.entries(deps).filter(([name]) => [
      'react', 'react-dom', 'vitest', 'jest', 'vite', 'jsdom', '@testing-library/react',
      '@testing-library/jest-dom', '@testing-library/user-event', 'msw', '@vitest/coverage-v8',
    ].includes(name)),
  );
  const names = await readdir(root);
  const configs = names.filter(name => /^(vite|vitest|jest|tsconfig)\b.*\.(ts|js|mjs|cjs|json)$/.test(name));
  const installed = await stat(path.join(root, 'node_modules', 'vitest', 'vitest.mjs')).then(s => s.isFile()).catch(() => false);
  return {
    root,
    name: pkg.name ?? '(unnamed)',
    relevantDependencies: relevant,
    testScripts: Object.fromEntries(Object.entries(pkg.scripts ?? {}).filter(([name]) => /^(test|coverage|typecheck)/.test(name))),
    configFiles: configs,
    vitestEntrypointFound: installed,
    note: 'Does not install dependencies or modify the project.',
  };
}
