# React Unit Test Toolkit

A Markdown skill for coding assistants that write, review, and run focused tests for React components, hooks, and JavaScript or TypeScript utilities. It uses the target project's existing Jest or Vitest setup.

## Get started

1. Copy the [`react-unit-testing/`](react-unit-testing/) directory into a skill location your coding assistant supports. Keep `SKILL.md` and `references/` together. You can also point your assistant directly to [`SKILL.md`](react-unit-testing/SKILL.md).
2. Open your React project in the assistant and name the component, hook, or file you want to test. You can also ask it to identify a target from the current Git changes.
3. Choose **Quick / Hızlı** for the highest-risk behavior or **Detailed / Detaylı** for broader coverage of meaningful branches and related regressions. Quick is the default.

The target package must already have a working local Jest or Vitest runner and any setup the tests need, such as a DOM environment or render helpers. If an essential prerequisite is missing, the skill reports what's missing before creating tests. The skill itself is entirely Markdown and uses your assistant's existing file, Git, and terminal tools.

## Example prompts

| Use case | Prompt |
| --- | --- |
| Quick | “Use the React Unit Testing skill to test the most important behavior in `src/components/ProfileForm.tsx`. Run the focused tests.” |
| Detailed | “Test `src/hooks/useSaveProfile.ts` in detailed mode. Cover the success, loading, and error paths supported by the code and run any relevant regression tests.” |
| Changed component | “Use the current Git diff to identify the React component I changed. Add focused regression tests for the behavior that changed.” |

## What the skill does

The assistant follows the target's relevant props, hooks, providers, and service boundaries to decide which observable behaviors to test. It follows the project's test conventions, edits only the selected test files, and runs those tests with the verified local runner. The report names the runner, gives the observed result, and calls out meaningful gaps. Application code, dependencies, and configuration stay outside the test workflow.

## Skill files

- [`SKILL.md`](react-unit-testing/SKILL.md) defines the workflow and testing scope.
- [Execution](react-unit-testing/references/execution.md) covers prerequisites, targeted commands, and failure reporting.
- [Scenarios](react-unit-testing/references/scenarios.md) covers deriving test cases from observable behavior.
- [Targeting](react-unit-testing/references/targeting.md) covers Git-based target selection and relevant dependencies.
