# React Unit Testing Skill

A **portable Agent Skill** for generating, reviewing, and running targeted React, JavaScript, and TypeScript unit tests. It selects a component or hook, considers the relevant dependency relationships, plans source-grounded test scenarios, and verifies them with the project's **existing Jest or Vitest setup**.

**Skill only — no MCP server, background service, separate AI model, or API key.** A compatible coding assistant writes the tests using its existing model and file tools. A bundled **optional local CLI** preserves deterministic analysis, Git-change discovery, validation, test execution, and coverage inspection.

> Scope: selected, new, and changed React components/hooks (and related JS/TS modules). This is **not** a one-click whole-repository test generator. The helper script is a local Node.js process and never uploads project code.

## Two flexible modes

| Mode | Goal | What the assistant does |
| --- | --- | --- |
| **Quick / Hızlı (default)** | Useful tests quickly | Focus on important behaviors and direct relationships; run only relevant tests |
| **Detailed / Detaylı** | Broad meaningful behavior coverage | Inspect necessary transitive relationships, error/edge/async states, coverage gaps, and related regressions when appropriate |

**No hard test-count, token, time, coverage, or iteration quotas.** Modes guide *priorities*, not numbers. A Detailed run on a trivial button can appropriately generate fewer tests than a Quick run on a complex form.

## Installation for Cline

Cline reads skills from `.cline/skills/` (workspace) or `~/.cline/skills/` (global). For ongoing use across multiple React projects, install globally. Other assistants supporting [Agent Skills](https://agentskills.io/specification) can use the same `SKILL.md`, references, and scripts.

```bash
# Clone this repository wherever you prefer.
git clone https://github.com/alperen0420/react-unit-test-toolkit.git

# Global Cline skill (Linux/macOS):
mkdir -p ~/.cline/skills
cp -R react-unit-test-toolkit/.cline/skills/react-unit-testing ~/.cline/skills/
```

The `SKILL.md` **works even without installing the optional CLI**: the assistant can inspect source and use Git/Jest/Vitest through its normal file/terminal tools.

To enable the deterministic helper commands (requires Node.js 22+):

```bash
npm install --prefix ~/.cline/skills/react-unit-testing/scripts --ignore-scripts
node ~/.cline/skills/react-unit-testing/scripts/cli.mjs --help
```

Alternatively copy the `react-unit-testing` skill directory into your React project's `.cline/skills/` and install its `scripts` dependencies there. Do **not** copy just `SKILL.md` if you want the bundled scripts and quality references. For Windows, use equivalent shell file-copy commands.

If upgrading from the old server-based version, **remove the former MCP entry from the coding assistant's MCP settings**. The skill does not use or need a server connection.

## Ask naturally

- “Write unit tests for `src/components/LoginForm.tsx`.” (Quick)
- “Create **detailed** unit tests for the new profile editor and its relevant dependencies.”
- “Make **quick** Jest tests for the changed component, without modifying production code.”
- “Review tests for `useSession` and run relevant regressions.”

You can also activate it via Cline's `/react-unit-testing` skill command where available.

## How it works

```text
User chooses target or Git identifies added/changed candidates
                          |
       Coding assistant reads source + related imports
                          |
      Quick or Detailed scenario planning (existing LLM)
                          |
      Coding assistant writes target test file(s) only
                          |
       Validate → run with existing Jest/Vitest
                          |
           Optional related tests and coverage
                          |
                Evidence-based report
```

The source project is **not migrated from Jest to Vitest**. Tests in CommonJS projects may use `require()`. The validator treats unverified aliased/indirect imports as warnings rather than repeatedly forcing test rewrites.

## Optional helper CLI: what was preserved

The Skill ships precompiled local helper modules under `.cline/skills/react-unit-testing/scripts/lib/` and needs only the installed `typescript` library. It is safe to install the skill directory independently of this Git repository.

| Capability | Local command |
| --- | --- |
| Inspect project/test runners | `inspect` |
| Analyze TS/TSX/JS/JSX AST | `analyze <file>` |
| Bounded dependency graph and callers | `relations <file> --depth 1|2` |
| New/changed components from Git | `changed [--base HEAD~1]` |
| Reverse import impact | `affected <file> --depth 1|2|3` |
| Heuristic static test validation | `validate <test-file> <source-file>` |
| Selected Jest/Vitest execution | `run <test-file> [--framework auto|jest|vitest]` |
| Related Jest/Vitest regressions | `related <source-file> [--framework auto|jest|vitest]` |
| Read existing Istanbul coverage | `coverage <source-file>` |

Examples (replace the skill path if installed per-project):

```bash
node ~/.cline/skills/react-unit-testing/scripts/cli.mjs --project "$PWD" inspect
node ~/.cline/skills/react-unit-testing/scripts/cli.mjs --project "$PWD" analyze src/components/LoginForm.tsx
node ~/.cline/skills/react-unit-testing/scripts/cli.mjs --project "$PWD" relations src/components/LoginForm.tsx --depth 2
node ~/.cline/skills/react-unit-testing/scripts/cli.mjs --project "$PWD" validate src/components/LoginForm.test.tsx src/components/LoginForm.tsx
node ~/.cline/skills/react-unit-testing/scripts/cli.mjs --project "$PWD" run src/components/LoginForm.test.tsx --framework auto
```

Use `node <skill-path>/scripts/cli.mjs --help` for all options. Commands print JSON, do not change source files, and restrict file reads to an approved project root. **`run` and `related` execute project test code**: approve them only for trusted projects or use isolation. Framework auto-detection asks for an explicit choice if both runners exist and the test syntax is ambiguous. Some monorepo/transform setups may need the project's native test scripts instead of the helper.

The dependency graph is static and bounded for safe output; it cannot infer every runtime relationship. The quick/detailed styles do not change any of the helper's safety bounds.

## Repository layout

```text
.cline/skills/react-unit-testing/
  SKILL.md                  # Required: workflow, automatic activation, two modes
  references/               # Quality guidance and CLI usage
  scripts/cli.mjs           # Optional local Node CLI
  scripts/lib/              # Compiled helpers, shipped with the skill
  scripts/package.json      # Local TypeScript parser dependency
src/                        # Maintainer TypeScript source + unit tests
scripts/package-skill.mjs    # Rebuild portable helper distribution
scripts/skill-smoke.mjs      # Validate bundled skill against demo
examples/demo-react/        # React + Vitest example
examples/demo-jest/         # Jest-only CommonJS example
.github/workflows/ci.yml     # Build, tests, demo + portable skill smoke
```

## For contributors

```bash
npm install
npm run typecheck
npm test
npm run bundle:skill
npm install --prefix .cline/skills/react-unit-testing/scripts --ignore-scripts
npm install --prefix examples/demo-react --legacy-peer-deps
npm run test:demo
npm run test --prefix examples/demo-jest
npm run test:skill
```

**Important:** When changing `src/`, run `npm run bundle:skill` and commit the resulting `scripts/lib/` files; these are the **portable skill runtime**, not temporary build outputs. See [CONTRIBUTING.md](CONTRIBUTING.md) for development rules and [SECURITY.md](SECURITY.md) for execution boundaries.

MIT licensed. The helper itself makes no telemetry, network requests, or external AI calls. Running a project's own tests can still execute arbitrary project code, including network operations. The host coding assistant and npm installer have their own settings/network behavior; review those separately.
