# Optional helper CLI

Run `node <skill-dir>/scripts/cli.mjs --help` to see the installed command list. This is a short-lived **local CLI**, not a background service. Its stdout contains JSON; failed test runs return nonzero status while still printing structured results.

Requirements: Node.js 22+, Git for change detection, and `typescript` installed locally under `<skill-dir>/scripts/node_modules`. Install once with:

```bash
npm install --prefix "<skill-dir>/scripts" --ignore-scripts
```

Commands accept `--project` pointing to an approved React/JS/TS repository. Most file arguments are **project-relative**. Example:

```bash
node "<skill-dir>/scripts/cli.mjs" --project "$PWD" relations src/components/Profile.tsx --depth 2
```

| Command | Purpose | Important limitation |
| --- | --- | --- |
| `inspect` | Read scripts, dependencies and test configs | Does not install anything |
| `analyze` | AST exports/imports, hooks, JSX events, branches | Structural hints, not generated scenarios |
| `relations` | Local imports plus direct importers | Static graph, bounded excerpts, dynamic deps can be missed |
| `changed` | Git new/modified/renamed candidates | Default compares to `HEAD`; use `--base HEAD~1` for committed changes |
| `affected` | Reverse-import candidates | Impact is inferred, not a proven regression |
| `validate` | Static syntax/structure and source import checks | Aliases/indirection may produce warnings; test quality unproven |
| `run` | Run a selected Jest or Vitest test | Executes project code; approval required |
| `related` | Run related Jest or Vitest tests | Executes project code; not the whole suite |
| `coverage` | Read `coverage/coverage-final.json` | Only reports existing Istanbul coverage |

`--framework auto` chooses the only installed runner, otherwise looks for framework-specific syntax. When both are installed and ambiguous, supply `--framework jest` or `--framework vitest`. It never changes dependencies or migrates tests. The helper is intentionally bounded for security and output size; these technical safeguards are **not** test-budget limits.

When no helper is available, use file search, Git, Jest/Vitest CLI and existing project tooling directly. The Skill's decision process still applies.
