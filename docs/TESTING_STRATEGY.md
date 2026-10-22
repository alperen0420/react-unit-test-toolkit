# Focused test generation strategy

## Target selection

Choose a single source explicitly, or call `get_changed_components` to discover new/changed React components and hooks. The changed-file list is not permission to generate tests for the entire repository. Changed utilities can suggest affected component candidates via reverse imports.

## Context and impact

- Call `analyze_react_file` for structural hints.
- Use `get_related_context` to inspect only the selected source and its relevant local import graph (one or two hops).
- Use `get_affected_components` for reverse-import impact suggestions when a shared module changes.
- Imported dependencies explain observable behavior; they do not automatically become separate test targets.
- Module imports are a static approximation. Providers, runtime dependency injection, dynamic imports and framework conventions may need review.

## Scenario planning

For the approved target, write evidence-based scenarios with stable IDs. Each scenario should include a user action or input, the observable result, and a source location or behavior confirming the scenario is supported. Consider success, error, empty, disabled, boundary, loading and async behavior **only when the source supports them**.

## Validation

1. Follow existing project conventions and use Vitest/React Testing Library for component behavior.
2. Check import structure and syntax with `validate_test`.
3. After explicit approval, execute the selected test using `run_unit_test`.
4. Diagnose failure first: test implementation problem, project configuration problem or potential application defect. Repair test-code mistakes at most twice, and never weaken assertions to hide genuine defects.
5. Where meaningful, and with approval, run statically related regression tests using `run_related_tests`.
6. Include real coverage measurements only when `coverage/coverage-final.json` is available. Report limitations and untested scenarios.

## Quality indicators

- Evidence-backed test scenarios and observable assertions.
- Successful verified runtime execution and test pass/fail/skipped counts.
- Sensitivity to meaningful regressions, with optional mutation testing.
- Limited reliance on implementation details, snapshots and arbitrary timers.
- Small context footprint relative to the selected component and its dependencies.

Passing test counts and line coverage alone are not measures of test quality. The MCP server returns deterministic observations; the coding assistant is responsible for interpreting them.
