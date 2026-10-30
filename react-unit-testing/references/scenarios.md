# Evidence-based React test scenario design

Read when planning meaningful cases, especially with hooks, services, forms, permissions, async behavior or multiple execution branches. The objective is **high-value behavior coverage**, not maximum assertion count.

## Scenario selection protocol

For each candidate behavior, answer:
1. **Evidence:** What code branch, prop contract, hook/service behavior, or existing documented requirement supports it?
2. **Trigger:** What user action, input, state, resolved/rejected operation, or dependency output reaches it?
3. **Observable outcome:** What should a user, consumer, or boundary collaborator actually observe?
4. **Test boundary:** Which external dependency can be controlled without mocking the behavior under test?
5. **Value:** What regression would this test catch that the others would not?

Drop cases with no identifiable behavior, no meaningful assertion, or a duplicated observation. When the source is insufficient to predict the correct output, inspect the relevant dependency or flag the uncertainty; **do not invent expected results**.

The scenario plan can be brief and internal during Quick; in Detailed it may be a compact table. Do not require the user to approve every scenario unless their workflow requests review.

## Quick / Hızlı

Select the smallest **useful** group of cases that exercises the principal behavior and the most consequential supported failure or boundary. Prioritize business-critical logic, permissions/security, data loss, bad states, and risky asynchronous operations. Do not restrict Quick to a fixed number of cases or to render-only checks.

Avoid broad refactors, optional coverage generation and full-suite testing by default. Stop when the most important behavior is verified and the report clearly describes remaining gaps.

## Detailed / Detaylı

Explore additional **distinct, evidenced** paths where valuable:
- successful, empty and invalid input; boundary values;
- loading, retry, error, fallback and cleanup;
- disabled/read-only, authorization and session behavior;
- repeated submissions, stale state, cancellation and race conditions;
- conditional UI and keyboard/accessibility interactions;
- provider/hook/service integration boundaries;
- regression impact on consumers if props or contracts change.

These are **possibilities, not a checklist to blindly apply**. A component without a network call should not acquire an imaginary server-error test. Do not add tests simply because a category appears here.

## Patterns that create meaningful tests

**React Testing Library:** Prefer accessible `getByRole`, `findByRole` and `queryByRole` queries; use realistic `userEvent` interactions for simulated DOM tests. Await asynchronous updates and interactions; avoid arbitrary sleeps and private-state assertions.

**Hooks:** Test through a consumer or the project's established hook utilities. Verify observed state transitions, cleanup and error behavior, not private implementation details.

**Networking:** Use existing MSW handlers or compatible module mocks at the external boundary. Distinguish an API failure from a component failure. Do not mock the component or its core logic away.

**Forms:** Verify visible validation, input correction, submission payload/contract and disabled/loading behavior only where implementation supports them.

**Existing tests:** Reuse render helpers, factories, service mocks and accessibility conventions; extend rather than overwrite. Never add duplicated assertions that just restate the same signal.

**Framework fidelity:** Match Jest (`jest.fn`, CommonJS where appropriate) or Vitest (`vi.fn`) as installed. Follow the project's test environment and naming conventions.

## Example: profile editor (illustrative, not mandatory)

Suppose real source code shows a profile hook, immutable organization fields and a save service:
- Loading: incoming profile values become visible.
- Read-only: organization fields cannot be edited.
- Validation: empty names prevent the save request.
- Save success: edited permitted fields reach the service and the UI reflects success.
- Save error: service rejection produces the implemented error response.
- Saving: repeated submit is prevented **if this is actually implemented**.

Do not automatically produce all six. They exist only as examples of extracting behavior **from the given code**.

## Anti-patterns

- “Renders without crashing” as the only test.
- `expect(true).toBe(true)` or unrelated assertions.
- Over-mocking the module or hook being tested.
- Test names that promise an outcome the assertions do not verify.
- Altering user-facing code or weakening expectations just to make the suite green.
- Calling coverage “complete” because all generated tests passed.

## Completion standard

The test set is sufficient when the intended component's most important supported behavior is verified, remaining material gaps are explained, and further cases would mostly duplicate existing signal. Detailed mode should scrutinize this decision more thoroughly, but **neither mode has a numeric stopping rule**.
