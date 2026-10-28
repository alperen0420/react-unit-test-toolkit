import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getProjectRoot } from './security.js';
export async function inspectProject() {
    const root = await getProjectRoot();
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const relevant = Object.fromEntries(Object.entries(deps).filter(([name]) => [
        'react', 'react-dom', 'vitest', 'jest', 'vite', 'jsdom', 'jest-environment-jsdom',
        'babel-jest', 'ts-jest', '@testing-library/react', '@testing-library/dom',
        '@testing-library/jest-dom', '@testing-library/user-event', 'msw', '@vitest/coverage-v8',
    ].includes(name)));
    const names = await readdir(root);
    const configs = names.filter(name => /^(vite|vitest|jest|tsconfig)\b.*\.(ts|js|mjs|cjs|json)$/.test(name));
    const installed = {
        jest: await stat(path.join(root, 'node_modules/jest/bin/jest.js')).then(s => s.isFile()).catch(() => false),
        vitest: await stat(path.join(root, 'node_modules/vitest/vitest.mjs')).then(s => s.isFile()).catch(() => false),
    };
    return {
        root, name: pkg.name ?? '(unnamed)', relevantDependencies: relevant,
        testScripts: Object.fromEntries(Object.entries(pkg.scripts ?? {}).filter(([name]) => /^(test|coverage|typecheck)/.test(name))),
        configFiles: configs, installedRunners: installed,
        detectedFramework: installed.vitest && !installed.jest ? 'vitest' : installed.jest && !installed.vitest ? 'jest' : installed.jest && installed.vitest ? 'both' : 'none',
        note: 'Read-only inspection. Follow the existing framework; do not silently migrate tests.',
    };
}
