# Scenario quality reference

Read this only when planning or reviewing nontrivial component tests.

## Evidence-based scenario planning

For each observable behavior record:

| Field | Meaning |
| --- | --- |
| Scenario | Short, behavior-specific identifier |
| Trigger | User action, prop, provider state, or external response |
| Expected | UI state, callback, network boundary, or public result |
| Evidence | Relevant source branch, hook, service contract, or neighboring test |
| Priority | Risk or user impact, not an arbitrary test count |

Candidate dimensions: initial loading, successful submission, invalid input, server rejection, empty data, authenticated/unauthenticated state, disabled and read-only controls, duplicate submission, async transitions, cleanup, keyboard/focus interaction, and boundary input. **Only choose what the source actually implements.**

## Quick vs Detailed

**Quick:** Identify critical success/error paths, immediate guards, and key UI interactions first. Read direct imports and existing test conventions. Create the minimum meaningful tests for the highest risks and verify them.

**Detailed:** Expand into relevant dependency branches and consumer contracts, examine missing edges/branches, include negative and boundary behavior, evaluate the use of mocks, and run focused/related regressions when justified. Extra scenarios are justified by new behaviors, **not** by a target count.

## Strong tests

- Arrange with realistic data, act through accessible user interactions, assert a result the user or caller could observe.
- Prefer `getByRole` with accessible names and `findByRole`/`waitFor` for async UI; use `userEvent` under jsdom.
- Keep API/network mocking at external boundaries (MSW or project-standard mock helpers); don't mock the target implementation away.
- Cover distinct states without repeating the same assertion under different test names.
- For new/changed components, compare neighboring tests and run regressions for related consumers only when behavior could have changed.
- Existing Jest and Vitest are equally valid; follow project conventions and mock APIs (`jest.*` vs `vi.*`).

## Failure interpretation

- **Test code/setup error:** Invalid import, missing jsdom setup, wrong matcher, missing await, incorrect mock; repair and rerun.
- **Real behavior mismatch:** Keep the failing test and report possible implementation defect instead of changing expectations to make green.
- **Tool limitation:** A static validator's warning about alias/`require()` is not proof of failure. Prefer real test results plus source inspection.
- **Flaky behavior:** Prefer condition-based waiting rather than arbitrary delays; distinguish timing from actual result.

Reports must separate **scenarios proposed, scenarios implemented, tests executed, test counts passed/failed/skipped, coverage actually available, and unverified behavior**.
