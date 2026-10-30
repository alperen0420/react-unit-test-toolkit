# Test execution, repair, regression, and reporting

Read when selecting a test command, interpreting failures, handling CommonJS/aliases or deciding whether to run related regressions. **Use the host agent's existing tools**; this Skill ships no CLI, runner, npm modules, or executable.

## Detect the test framework before running

Inspect the relevant `package.json`, package-manager lockfile, Jest/Vitest config, setup files, and nearby tests:
- Jest-only → **Jest**. Vitest-only → **Vitest**.
- Both present → prefer the target's existing test conventions/config; ask only if genuinely ambiguous.
- No configured runner → do not silently install or migrate; explain what's needed and request approval.
- Respect existing CommonJS `require()`, ESM imports, path aliases, transforms, DOM environment and provider setup.

Do not assume a test framework from the Skill name, directory layout or generic examples. Do not rewrite `jest.mock` into `vi.mock` unless the user specifically requests a migration.

## Run only relevant tests first

Prefer the project's established scripts, package manager, and workspace context. Where equivalent local binaries exist, typical **illustrative** commands are:

```bash
# Jest: targeted test file
npx --no-install jest --runInBand --runTestsByPath src/components/Profile.test.tsx

# Vitest: targeted test file
npx --no-install vitest run src/components/Profile.test.tsx
```

These commands are **examples**, not guaranteed to work in every repo. Do not run the wrong script or install packages implicitly. For npm/pnpm/yarn workspaces, invoke the intended package's test script or runner in that workspace. Request execution approval according to the agent's configured security policy.

After targeted tests:
- **Quick:** normally report the focused result and meaningful gaps.
- **Detailed:** run existing tests for genuinely affected consumers/hooks or relevant module(s) when useful. Run full regression suite only if explicitly requested or justified by cross-cutting risk and permitted.
- Include the exact runner used; do not call Jest results “Vitest results”.

## Interpret failures accurately

1. **Syntax/import/module resolution:** test source path, `require()`, extension, alias, package config, JSX/TS transform, ESM/CJS boundary.
2. **Environment/setup:** `jsdom`, `jest-dom`, providers, test setup, missing dependencies, network fixtures and timers.
3. **Expectation mismatch:** determine whether the test expected an unsupported feature or found a real application regression.
4. **Flakiness:** await interactions, wait for observables and isolate shared state; do not add arbitrary delays.

Fix **test-owned** mistakes based on concrete failure output, rerun the failing test, and stop when subsequent retries repeat the same evidence without progress. Never silently change production code, ignore a failing assertion, or claim the application is broken based solely on a failed generated test.

## Static validation is advisory

A syntactically valid test is not necessarily a useful test. A basic import checker might fail to recognize:
- `require('../web/profile.js')` or destructured CommonJS;
- aliases such as `@/components/Profile`;
- re-exports, barrel imports, dynamic imports or indirect hook usage.

Use actual module resolution and executed tests as stronger evidence. Do not keep rewriting an otherwise valid test just to silence an unverified heuristic warning.

## Coverage and regressions

Only cite coverage values from a real report. Different projects store coverage differently; do not assume `coverage/coverage-final.json` exists. Distinguish line, statement, function and branch coverage. High coverage is not a correctness guarantee.

For affected consumers, use import relationships and changed public contracts to select regressions. Do not run an entire repository suite merely because a component imports a shared helper. A shared contract change may justify broader checks; state the rationale.

## Final response template

Keep results concise and evidence-backed:

```text
Mode: Quick | Detailed
Target: <source file>
Runner: Jest | Vitest (actual command if helpful)
Context: <relevant hooks/components/services used>
Tests: <passed> passed, <failed> failed, <skipped> skipped; <not run if applicable>
Scenarios: <key behaviors covered>; <important gaps, if any>
Changes: <test files created/edited>
Regressions: <related tests run, or not run + reason>
Notes: <actual defects, setup problems, or unresolved uncertainty>
```

Never convert “not run” into “passed”, invent coverage, claim all dependencies were inspected, or confuse a generated test's success with a proof that the application is defect-free.
