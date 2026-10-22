import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getProjectRoot, resolveProjectFile, TEST_EXTS, SOURCE_EXTS } from './security.js';

type VitestJson = {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  testResults?: Array<{
    name?: string;
    status?: string;
    assertionResults?: Array<{ fullName?: string; status?: string; failureMessages?: string[] }>;
  }>;
};

const MAX_OUTPUT = 12_000;
const MAX_TIMEOUT_MS = 120_000;

function appendCapped(oldText: string, chunk: string): string {
  return (oldText + chunk).slice(-MAX_OUTPUT);
}

export async function runUnitTest(testFile: string, timeoutMs = 60_000): Promise<object> {
  return executeVitest(testFile, 'run', timeoutMs);
}

export async function runRelatedTests(sourceFile: string, timeoutMs = 60_000): Promise<object> {
  return executeVitest(sourceFile, 'related', timeoutMs);
}

async function executeVitest(filePath: string, mode: 'run' | 'related', timeoutMs: number): Promise<object> {
  const root = await getProjectRoot();
  const test = await resolveProjectFile(root, filePath, mode === 'run' ? TEST_EXTS : SOURCE_EXTS);
  const entry = await resolveProjectFile(root, 'node_modules/vitest/vitest.mjs', ['.mjs']).catch(() => {
    throw new Error('Project-local Vitest not found. Install the React project dependencies first.');
  });
  const limit = Math.max(5_000, Math.min(MAX_TIMEOUT_MS, Math.round(timeoutMs)));
  const workdir = await mkdtemp(path.join(os.tmpdir(), 'react-test-mcp-'));
  const outputFile = path.join(workdir, 'vitest-report.json');
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, [
        entry.absolute,
        mode, test.relative,
        ...(mode === 'related' ? ['--run'] : []),
        '--reporter=json',
        `--outputFile=${outputFile}`,
      ], {
        cwd: root,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, limit);
      child.stdout.on('data', chunk => { stdout = appendCapped(stdout, String(chunk)); });
      child.stderr.on('data', chunk => { stderr = appendCapped(stderr, String(chunk)); });
      child.on('error', err => { clearTimeout(timeout); reject(err); });
      child.on('close', code => { clearTimeout(timeout); resolve(code ?? -1); });
    });
    let report: VitestJson | undefined;
    try { report = JSON.parse(await readFile(outputFile, 'utf8')) as VitestJson; } catch { /* Vitest might exit before writing JSON. */ }
    const failures = report?.testResults?.flatMap(item => item.assertionResults ?? [])
      .filter(item => item.status === 'failed')
      .map(item => ({ name: item.fullName ?? '(unnamed)', messages: (item.failureMessages ?? []).map(s => s.slice(0, 1600)).slice(0, 3) }))
      .slice(0, 20) ?? [];
    return {
      [mode === 'related' ? 'sourceFile' : 'testFile']: test.relative,
      mode,
      status: timedOut ? 'timeout' : exitCode === 0 ? 'passed' : 'failed',
      exitCode,
      timedOut,
      totals: report ? {
        tests: report.numTotalTests ?? null,
        passed: report.numPassedTests ?? null,
        failed: report.numFailedTests ?? null,
        pending: report.numPendingTests ?? null,
      } : null,
      failures,
      stdout: stdout.slice(-6000),
      stderr: stderr.slice(-6000),
      note: 'This executes project test code. Use a trusted repository and isolated process/container for untrusted projects.',
    };
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
