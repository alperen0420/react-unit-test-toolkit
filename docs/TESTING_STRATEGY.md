# Test quality strategy

**Goal:** validate meaningful, user-observable React behavior instead of optimizing only for passing tests or line coverage.

## Agent workflow

1. Read the target component, relevant dependencies, and nearby tests.
2. Plan scenarios that have evidence in the implementation; do not invent requirements.
3. Write Vitest and React Testing Library tests for observable behavior.
4. Run static validation and the relevant test file; classify failures before modifying tests.
5. Fix incorrect test implementations, but do not weaken expectations to hide application defects.
6. Report coverage only when a real coverage report exists for the target file.

## Quality indicators

- Observable behavior coverage: which source-supported scenarios are tested.
- Execution outcome: passed, failed, and skipped tests from actual Vitest runs.
- Correct imports: the test imports the intended implementation.
- Mutation sensitivity (optional): would changing a key condition make a relevant test fail?
- Fragility: dependence on internal state, CSS selectors, timing, or large snapshots.
- Repair efficiency: iterations required to deliver valid tests.

## Limitations

- `validate_test` is a heuristic syntax and structure check, not a full type checker or test review.
- High coverage does not prove test quality.
- Some projects need additional environment setup (routing providers, MSW, custom transforms, or workspace configuration).
- The MCP server provides deterministic tools. Scenario planning and test generation are carried out by the host coding assistant.
