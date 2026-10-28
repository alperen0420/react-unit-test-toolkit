# Validation and compatibility

This repository provides a self-contained Cline-compatible `SKILL.md` with optional short-lived local Node helper commands. It does not require a model API key or a long-running service.

The GitHub Actions workflow validates:
- TypeScript type checking and deterministic helper unit tests.
- Portable Skill packaging and invocation from its own `scripts` folder.
- React demo tests and Istanbul coverage generation.
- Test execution using the project's existing local Vitest runner.

Jest support is covered by an isolated fake Jest binary test for invocation and result parsing; real-world Jest project configuration (transformers, monorepos, environment setup) varies and should be smoke-tested in the target project. The validator includes CommonJS `require()` support, but static validation cannot prove runtime correctness.

Do not claim a new release's CI has passed until GitHub Actions reports success for the new commit.
