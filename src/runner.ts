import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getProjectRoot, resolveProjectFile, TEST_EXTS, SOURCE_EXTS } from './security.js';

export type TestFramework = 'auto' | 'jest' | 'vitest';

type TestReport = {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  testResults?: Array<{
    assertionResults?: Array<{ fullName?: string; status?: string; failureMessages?: string[] }>;
  }>;
};

const MAX_OUTPUT = 12_000;
const MAX_TIMEOUT_MS = 120_000; // safety timeout, not a scenario/time budget

const appendCapped = (oldText: string, chunk: string) => (oldText + chunk).slice(-MAX_OUTPUT);

async function exists(file: string): Promise<boolean> {
  return stat(file).then(info => info.isFile()).catch(() => false);
}

export async function detectFramework(root: string, testFile?: string, preferred: TestFramework = 'auto'): Promise<'jest' | 'vitest'> {
  const installed = {
    jest: await exists(path.join(root, 'node_modules/jest/bin/jest.js')),
    vitest: await exists(path.join(root, 'node_modules/vitest/vitest.mjs')),
  };
  if (preferred !== 'auto') {
    if (!installed[preferred]) throw new Error(`Project-local ${preferred} not found; install the project's dependencies first.`);
    return preferred;
  }
  if (installed.vitest && !installed.jest) return 'vitest';
  if (installed.jest && !installed.vitest) return 'jest';
  if (!installed.jest && !installed.vitest) throw new Error('Neither project-local Jest nor Vitest was found. Install the project dependencies first.');
  if (testFile) {
    const body = await readFile(path.join(root, testFile), 'utf8');
    const jestHint = /\bjest\.(?:fn|mock|spyOn|useFakeTimers)\b|["']@jest\/globals["']/.test(body);
    const vitestHint = /\bvi\.(?:fn|mock|spyOn|useFakeTimers)\b|["']vitest["']/.test(body);
    if (vitestHint && !jestHint) return 'vitest';
    if (jestHint && !vitestHint) return 'jest';
  }
  throw new Error('Both Jest and Vitest are installed; specify --framework jest or --framework vitest. Do not migrate the project automatically.');
}

export async function runUnitTest(testFile: string, timeoutMs = 60_000, framework: TestFramework = 'auto'): Promise<object> {
  return executeTest(testFile, 'run', timeoutMs, framework);
}

export async function runRelatedTests(sourceFile: string, timeoutMs = 60_000, framework: TestFramework = 'auto'): Promise<object> {
  return executeTest(sourceFile, 'related', timeoutMs, framework);
}

async function executeTest(filePath: string, mode: 'run' | 'related', timeoutMs: number, requested: TestFramework): Promise<object> {
  const root = await getProjectRoot();
  const file = await resolveProjectFile(root, filePath, mode === 'run' ? TEST_EXTS : SOURCE_EXTS);
  const framework = await detectFramework(root, mode === 'run' ? file.relative : undefined, requested);
  const entry = await resolveProjectFile(root,
    framework === 'vitest' ? 'node_modules/vitest/vitest.mjs' : 'node_modules/jest/bin/jest.js', ['.js', '.mjs']);
  const limit = Math.max(5_000, Math.min(MAX_TIMEOUT_MS, Math.round(timeoutMs)));
  const workdir = await mkdtemp(path.join(os.tmpdir(), 'react-test-skill-'));
  const outputFile = path.join(workdir, 'test-report.json');
  const argv = framework === 'vitest'
    ? [entry.absolute, mode, file.relative, ...(mode === 'related' ? ['--run'] : []), '--reporter=json', `--outputFile=${outputFile}`]
    : [entry.absolute, mode === 'related' ? '--findRelatedTests' : '--runTestsByPath', file.relative,
      '--runInBand', '--watch=false', '--json', `--outputFile=${outputFile}`];
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, argv, {
        cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' },
      });
      const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, limit);
      child.stdout.on('data', chunk => { stdout = appendCapped(stdout, String(chunk)); });
      child.stderr.on('data', chunk => { stderr = appendCapped(stderr, String(chunk)); });
      child.on('error', err => { clearTimeout(timeout); reject(err); });
      child.on('close', code => { clearTimeout(timeout); resolve(code ?? -1); });
    });
    let report: TestReport | undefined;
    try { report = JSON.parse(await readFile(outputFile, 'utf8')) as TestReport; } catch { /* Runner may exit without a report. */ }
    const failures = report?.testResults?.flatMap(item => item.assertionResults ?? [])
      .filter(item => item.status === 'failed')
      .map(item => ({ name: item.fullName ?? '(unnamed)', messages: (item.failureMessages ?? []).map(s => s.slice(0, 1600)).slice(0, 3) }))
      .slice(0, 20) ?? [];
    return {
      [mode === 'related' ? 'sourceFile' : 'testFile']: file.relative,
      framework, mode,
      status: timedOut ? 'timeout' : exitCode === 0 ? 'passed' : 'failed',
      exitCode, timedOut,
      totals: report ? {
        tests: report.numTotalTests ?? null, passed: report.numPassedTests ?? null,
        failed: report.numFailedTests ?? null, pending: report.numPendingTests ?? null,
      } : null,
      failures, stdout: stdout.slice(-6000), stderr: stderr.slice(-6000),
      note: 'Executes actual project test code; run only in a trusted or isolated environment after approval.',
    };
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
