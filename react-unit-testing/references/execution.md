# Test execution, repair, regression, and reporting

Read when selecting a test command, interpreting failures, handling CommonJS/aliases or deciding whether to run related regressions. **Use the host agent's existing tools**; this Skill ships no CLI, runner, npm modules, or executable.

## Mandatory preflight — no setup work, ever

Perform this check **before generating, modifying, or running test files**. A test framework is a prerequisite, not a dependency this skill may install.

1. Find the **correct package/workspace** for the selected component (monorepos can contain multiple setups). Inspect the existing `package.json`, package manager lockfile, test scripts, Jest/Vitest config, test setup, and neighboring tests.
2. Determine whether the relevant runner is **already installed and usable**, not merely listed as a dependency. Confirm using a non-mutating local package-resolution check, a local binary, an existing workspace runner, or the agent's standard environment inspection. Hoisting and Yarn Plug'n'Play mean `node_modules` alone is not a reliable indicator. Do not launch a package download as a detection method.
3. Check **only the testing modules actually needed for this target**: for React DOM behavior, an available render/testing library and DOM test environment; when applicable, the project's existing user-event utilities, DOM matchers, transforms, aliases, providers, setup files and mock facilities. Utilities or non-React modules may require only Jest/Vitest and the existing transform setup.
4. Choose the installed convention: Jest-only → Jest; Vitest-only → Vitest; both → follow the target's neighboring tests/configuration. If the runner is ambiguous or cannot be confirmed, **do not guess, migrate, or install**.
5. **If anything essential is missing or broken, STOP.** Do not create a test file, install, alter dependencies, repair setup, or fabricate a passing result. Explain the verified findings and missing prerequisites so the project owner can resolve them separately.

**Forbidden throughout the skill:** running `npm install`, `npm ci`, `npm add`, `yarn install`, `yarn add`, `pnpm install`, `pnpm add`, `bun install`, `bun add`, `pnpm dlx`, `bunx`, download-capable `npx`, scaffolding generators, or installer/bootstrap scripts. Do not change `package.json`, lockfiles, Jest/Vitest/Vite config, `tsconfig`, setup files, test scripts, or production source. If the user asks for environment setup, note that it is outside this test-only skill's scope.

Respect CommonJS `require()`, ESM imports, aliases and transforms already established by the project.

### Blocked-environment response

Report succinctly and stop:

```text
Status: Blocked — prerequisites missing; no tests created or run
Target: <file or component>
Existing framework: <Jest | Vitest | unknown>
Verified: <what is installed and available>
Missing / unusable: <exact module, runner, or setup and evidence>
Next action: Project owner must provision/repair the existing test setup outside this skill
Changes made: None
```

Never claim the test ran if the environment was not executable.

## Run only relevant tests first

After preflight passes, prefer the project's **already configured, non-installing** test scripts, locally available binaries, and workspace context. Check scripts for install/bootstrap hooks before running. Where equivalent local binaries exist, typical **illustrative** commands are:

```bash
# Jest: targeted test file
npx --no-install jest --runInBand --runTestsByPath src/components/Profile.test.tsx

# Vitest: targeted test file
npx --no-install vitest run src/components/Profile.test.tsx
```

These commands are **examples**, not guaranteed to work in every repo. `npx --no-install` is used only when its package already resolves locally; never omit `--no-install` or accept a download prompt. If the project has a safe preconfigured script or Plug'n'Play runner, use that instead. Inspect script hooks first: if a script installs/bootstraps dependencies, **do not run it**. Never attempt installation to make an unavailable runner work. Request execution approval according to the agent's configured security policy.

After targeted tests:
- **Quick:** normally report the focused result and meaningful gaps.
- **Detailed:** run existing tests for genuinely affected consumers/hooks or relevant module(s) when useful. Run full regression suite only if explicitly requested or justified by cross-cutting risk and permitted.
- Include the exact runner used; do not call Jest results “Vitest results”.

## Interpret failures accurately

1. **Syntax/import/module resolution:** test source path, `require()`, extension, alias, package config, JSX/TS transform, ESM/CJS boundary.
2. **Environment/setup:** `jsdom`, `jest-environment-jsdom`, `jest-dom`, providers, transforms, test setup, missing dependencies, network fixtures and timers. Report missing prerequisites; never install or edit setup/config to repair them.
3. **Expectation mismatch:** determine whether the test expected an unsupported feature or found a real application regression.
4. **Flakiness:** await interactions, wait for observables and isolate shared state; do not add arbitrary delays.

Fix **test-file-only** mistakes based on concrete failure output, rerun with the existing local runner, and stop when subsequent retries repeat the same evidence without progress. If a failure exposes missing test tooling or configuration, stop and report the blocker; do not bootstrap, install or edit the test environment. Never change production code, ignore a failing assertion, or claim the application is broken based solely on a failed generated test.

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
Changes: <test files created/edited; never dependencies, configuration, or production code>
Regressions: <related tests run, or not run + reason>
Notes: <actual defects, setup problems, or unresolved uncertainty>
```

Never convert “not run” into “passed”, invent coverage, claim all dependencies were inspected, or confuse a generated test's success with a proof that the application is defect-free.
