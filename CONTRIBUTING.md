# Contributing

This repository distributes a **portable Agent Skill**, not a background service.

- Edit instructions in `.cline/skills/react-unit-testing/SKILL.md` and focused reference files.
- Edit deterministic helper implementation in `src/`. Do **not** edit generated `scripts/lib/*.js` manually.
- Run `npm run bundle:skill` after source changes and commit compiled portable helper files.
- Verify `npm run typecheck`, `npm test`, the demo Vitest tests, and `npm run test:skill` before proposing changes.
- Keep Quick and Detailed as flexible prioritization modes, not fixed scenario/test/time quotas.
- Do not add external LLM calls, telemetry, unattended code uploads, or automatic production-file rewrites.
- Preserve Jest-only and CommonJS compatibility. Treat static validator warnings as hints.
- Keep changes to existing test suites opt-in and bounded to a selected component or relevant dependencies.

## Dependency installation

The root package is for maintainers. The copied Skill contains its own `scripts/package.json` so it can run independently from the checkout after `npm install --prefix <skill-dir>/scripts --ignore-scripts`.

## Testing

```bash
npm install
npm run typecheck
npm test
npm run bundle:skill
npm install --prefix .cline/skills/react-unit-testing/scripts --ignore-scripts
npm install --prefix examples/demo-react --legacy-peer-deps
npm run test:demo
npm install --prefix examples/demo-jest
npm run test --prefix examples/demo-jest
npm run test:skill
```
