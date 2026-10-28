import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { cp, mkdtemp, mkdir, readFile, rm, symlink } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceSkill = path.join(root, '.cline/skills/react-unit-testing');
const demo = path.join(root, 'examples/demo-react');
const jestDemo = path.join(root, 'examples/demo-jest');
const tmp = await mkdtemp(path.join(os.tmpdir(), 'portable-react-skill-'));
const portable = path.join(tmp, 'react-unit-testing');

function invoke(cli, project, args, shouldPass = true) {
  const p = spawnSync(process.execPath, [cli, '--project', project, ...args], { encoding: 'utf8' });
  if (shouldPass) assert.equal(p.status, 0, `${args[0]}: ${p.stderr}\n${p.stdout}`);
  assert.ok(p.stdout.trim().startsWith('{'), `Expected JSON from ${args[0]}: ${p.stdout}`);
  const obj = JSON.parse(p.stdout);
  if (shouldPass) assert.equal(obj.ok, true, JSON.stringify(obj));
  return obj;
}

try {
  // Copy only the distributable Skill. This verifies that it does not read helpers from the Git checkout.
  await cp(sourceSkill, portable, { recursive: true, filter: filename => !filename.split(path.sep).includes('node_modules') });
  const nodeModules = path.join(portable, 'scripts', 'node_modules');
  await mkdir(nodeModules, { recursive: true });
  await symlink(path.join(sourceSkill, 'scripts', 'node_modules', 'typescript'), path.join(nodeModules, 'typescript'), 'dir');
  const cli = path.join(portable, 'scripts/cli.mjs');
  const skill = await readFile(path.join(portable, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: react-unit-testing\ndescription: /);
  assert.match(skill, /Quick/);
  assert.match(skill, /Detailed/);
  assert.doesNotMatch(skill, /MCP server|MCP tools/i);

  const inspected = invoke(cli, demo, ['inspect']);
  assert.equal(inspected.result.detectedFramework, 'vitest');
  const analyzed = invoke(cli, demo, ['analyze', 'src/components/Counter.tsx']);
  assert.ok(analyzed.result.jsxEventHandlers.includes('onClick'));
  const graph = invoke(cli, demo, ['relations', 'src/components/Counter.tsx', '--depth', '1']);
  assert.equal(graph.result.target, 'src/components/Counter.tsx');
  const denied = invoke(cli, demo, ['analyze', '../outside.tsx'], false);
  assert.equal(denied.ok, false);
  assert.match(denied.error, /traversal/);
  const checked = invoke(cli, demo, ['validate', 'src/components/Counter.test.tsx', 'src/components/Counter.tsx']);
  assert.equal(checked.result.valid, true);
  const tested = invoke(cli, demo, ['run', 'src/components/Counter.test.tsx']);
  assert.equal(tested.result.status, 'passed');
  const related = invoke(cli, demo, ['related', 'src/components/Counter.tsx']);
  assert.equal(related.result.status, 'passed');
  const jestProject = invoke(cli, jestDemo, ['inspect']);
  assert.equal(jestProject.result.detectedFramework, 'jest');
  const jestValidation = invoke(cli, jestDemo, ['validate', 'tests/profile.test.js', 'web/profile.js']);
  assert.equal(jestValidation.result.valid, true);
  assert.equal(jestValidation.result.targetImportVerified, true);
  const jestRun = invoke(cli, jestDemo, ['run', 'tests/profile.test.js']);
  assert.equal(jestRun.result.framework, 'jest');
  assert.equal(jestRun.result.status, 'passed');
  console.log('Portable copied Skill, AST, imports, validation, selected/related Vitest, Jest CommonJS smoke: OK');
} finally {
  await rm(tmp, { recursive: true, force: true });
}
