#!/usr/bin/env node
/** Deterministic, local helper for the portable React unit testing Skill. No MCP or LLM runtime. */
import path from 'node:path';
import { inspectProject } from './project.js';
import { analyzeReactFile } from './analyzer.js';
import { getRelatedContext, getAffectedComponents } from './relations.js';
import { getChangedComponents } from './changes.js';
import { validateTest } from './validator.js';
import { runUnitTest, runRelatedTests, type TestFramework } from './runner.js';
import { getTestCoverage } from './coverage.js';

const HELP = `React Unit Testing Skill - local helper (no MCP server, no model API)

Usage:
  node scripts/cli.mjs --project /absolute/path/to/react-project <command> [arguments] [options]

Commands:
  inspect                             Detect project Jest/Vitest configuration
  analyze <source>                   AST summary of one source file
  relations <source> [--depth 1|2]   Bounded local import context and direct importers
  changed [--base HEAD~1]            New/changed component and hook candidates
  affected <source> [--depth 1|2|3]  Reverse import dependents
  validate <test-file> <source>      Static test syntax/assertion hints
  run <test-file> [--framework auto|jest|vitest]  Run selected test only
  related <source> [--framework auto|jest|vitest] Run related tests only
  coverage <source>                  Read existing Istanbul coverage report

The helper never writes test or production files. "run" and "related" execute project code.
Use a trusted project and ask for approval before running tests.
`;

const allowedCommands = new Set(['inspect','analyze','relations','changed','affected','validate','run','related','coverage']);

function parseArgs(argv: string[]) {
  const opts = new Map<string, string>();
  const positional: string[] = [];
  const accepted = new Set(['--project','--depth','--base','--framework','--timeout-ms']);
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item.startsWith('--')) {
      if (!accepted.has(item)) throw new Error(`Unknown option: ${item}`);
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${item}`);
      opts.set(item, argv[++i]);
    } else positional.push(item);
  }
  return { positional, opts };
}

function numeric(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Expected integer from ${min} to ${max}, got ${value}`);
  return n;
}

function framework(value: string | undefined): TestFramework {
  if (!value || value === 'auto' || value === 'jest' || value === 'vitest') return (value ?? 'auto') as TestFramework;
  throw new Error('framework must be auto, jest or vitest');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  const { positional, opts } = parseArgs(argv);
  const command = positional.shift();
  if (!command || !allowedCommands.has(command)) throw new Error(`Invalid command.\n${HELP}`);
  const project = opts.get('--project');
  if (!project) throw new Error('Specify --project /absolute/path/to/trusted/react-project');
  process.env.REACT_TEST_ALLOWED_ROOT = path.resolve(project);
  const needed: Record<string, number> = { inspect:0, analyze:1, relations:1, changed:0, affected:1, validate:2, run:1, related:1, coverage:1 };
  if (positional.length !== needed[command]) throw new Error(`Expected ${needed[command]} file argument(s) for ${command}.\n${HELP}`);
  const [file, source] = positional;
  const depth = numeric(opts.get('--depth'), command === 'affected' ? 2 : 2, 1, command === 'affected' ? 3 : 2);
  const timeout = numeric(opts.get('--timeout-ms'), 60_000, 5_000, 120_000);
  const runner = framework(opts.get('--framework'));
  let result: object;
  switch (command) {
    case 'inspect': result = await inspectProject(); break;
    case 'analyze': result = await analyzeReactFile(file); break;
    case 'relations': result = await getRelatedContext(file, depth); break;
    case 'changed': result = await getChangedComponents(opts.get('--base') ?? 'HEAD'); break;
    case 'affected': result = await getAffectedComponents(file, depth); break;
    case 'validate': result = await validateTest(file, source); break;
    case 'run': result = await runUnitTest(file, timeout, runner); break;
    case 'related': result = await runRelatedTests(file, timeout, runner); break;
    case 'coverage': result = await getTestCoverage(file); break;
    default: throw new Error(`Unsupported command: ${command}`);
  }
  console.log(JSON.stringify({ ok: true, command, result }, null, 2));
  if (['run','related'].includes(command) && 'status' in result && result.status !== 'passed') process.exitCode = 1;
  if (command === 'validate' && 'valid' in result && result.valid === false) process.exitCode = 1;
}

main().catch(err => {
  console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exitCode = 2;
});
