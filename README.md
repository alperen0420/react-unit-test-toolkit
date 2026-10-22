# React Unit Test Toolkit

An MCP server and coding-agent skill for React and TypeScript unit testing. Analyze source files, plan **code-specific test scenarios**, validate generated tests, run Vitest, and inspect coverage reports.

The MCP server provides tools; it **does not generate test code or call an LLM**. A compatible coding assistant uses the skill to plan scenarios and write tests with its configured model. No separate model API key is needed by this toolkit.

## Features

- Inspect project test configuration and dependencies.
- Analyze `.tsx`, `.ts`, `.jsx`, and `.js` using the TypeScript compiler AST.
- Validate test syntax, imports, test cases, and basic assertions.
- Run a selected test file with the project's installed Vitest.
- Read per-file coverage from an existing Istanbul JSON report.
- Follow a repeatable workflow for scenario planning, test generation, validation, execution, and review.

**Supported setup:** Vite + React + TypeScript + Vitest. Other setups may require additional configuration; Jest-only projects, Next.js Server Components, and complex monorepos are not covered by the example integration.

## How it works

```text
Coding assistant + configured model
            |
      Testing skill
            |
   MCP tools (stdio, Node.js)
       /          \
  Source AST    Vitest / coverage
       \          /
      React project
```

The assistant writes the test file using its normal file-editing capabilities. MCP tools inspect and verify; they do not modify project files.

## MCP tools

| Tool | Purpose |
| --- | --- |
| `inspect_project` | Read package scripts, test dependencies, and configuration. |
| `analyze_react_file` | Extract source structure, imports, exported declarations, hooks, and JSX events. |
| `validate_test` | Check an existing test file for syntax and basic structure. |
| `run_unit_test` | Run one existing Vitest test file and return structured results. |
| `get_test_coverage` | Summarize a matching file in `coverage/coverage-final.json`. |

## Requirements

- Node.js **22+** and npm.
- A React project configured with **Vitest** (and React Testing Library for component tests).
- A compatible MCP client or coding assistant; Cline setup is shown below.

## Install

```bash
npm install
npm run build

# Optional: install and test the example React project
npm install --prefix examples/demo-react
npm run test:demo
npm run test:mcp
```

The example uses the TypeScript Compiler API directly; no separate `ts-morph` dependency is required. The MCP server uses a local `stdio` process, so no hosting service or domain is required.

## Configure an MCP client

Copy the entries from [`templates/cline-mcp-settings.json`](templates/cline-mcp-settings.json) into the client's MCP configuration and replace both example paths with absolute paths:

```json
{
  "mcpServers": {
    "react-unit-testing": {
      "command": "node",
      "args": ["/absolute/path/react-unit-test-toolkit/dist/server.js"],
      "env": {
        "REACT_TEST_ALLOWED_ROOT": "/absolute/path/to/react-project"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

The `disabled` and `autoApprove` settings are Cline-specific; other MCP clients may use different configuration formats. `REACT_TEST_ALLOWED_ROOT` must be the absolute path to one trusted project. All tool file paths are relative to this directory. Change the variable and restart the server to work on a different project.

## Install the skill (Cline)

Copy [`.cline/skills/react-unit-testing/SKILL.md`](.cline/skills/react-unit-testing/SKILL.md) to the project where you want to generate tests:

```text
my-react-project/
└── .cline/
    └── skills/
        └── react-unit-testing/
            └── SKILL.md
```

The skill tells the assistant to inspect the implementation, draft scenarios supported by the code, create Vitest/React Testing Library tests, validate and run them, and report the results. Other assistants can adapt the same skill text to their supported instruction format.

**Example request:**

> Analyze `src/components/LoginForm.tsx`. Propose tests for its observable behavior, create `LoginForm.test.tsx` using Vitest and React Testing Library, validate it, and request approval before running it. Fix test-code mistakes at most twice and report any suspected application defects separately.

## Development and verification

```bash
npm run typecheck      # TypeScript type check
npm test               # MCP core unit tests
npm run test:demo      # React component and hook tests
npm run coverage:demo  # Generate demo coverage JSON
npm run test:mcp       # MCP stdio handshake and Vitest smoke test
```

The repository includes a [GitHub Actions workflow](.github/workflows/ci.yml) for these checks. See [TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) for test-quality guidance and [SCENARIO_PLAN.example.json](docs/SCENARIO_PLAN.example.json) for an illustrative plan. Scenarios are **not** fixed templates; they should be derived from each target implementation.

## Safety and limits

- The MCP server does not write source or test files, and it does not expose a general-purpose command executor.
- `run_unit_test` **executes project code**. It uses a bounded timeout and a project-local Vitest entrypoint, but it is not an operating-system sandbox. Only run trusted code or use an isolated environment.
- Keep test execution behind an explicit approval step in the coding assistant.
- Static validation and passing tests do **not** guarantee meaningful assertions or complete coverage.
- The MCP tools contain no direct model API integration. A coding assistant's model and network behavior depend on its own configuration. Package installation and executed tests may also access the network.

See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
