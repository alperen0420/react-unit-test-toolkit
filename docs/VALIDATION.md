# Validation status for v0.2.0

## Verified locally

- TypeScript type check of all non-MCP core modules using TypeScript 5.x (the MCP SDK dependency was not installed in the isolated authoring environment).
- 12 Node test cases passing, including dependency graph resolution, tsconfig paths aliases, Git working-tree changes, path confinement, test runner report handling, coverage and validator checks.
- `src/server.ts` passed a TypeScript syntax transpilation check.
- Repository text scan found no company- or deployment-specific language.

## Requires GitHub Actions or an environment with npm access

- Full typecheck with `@modelcontextprotocol/server`, Zod, and the installed npm type definitions.
- Full example React/Vitest run and coverage generation.
- Real MCP `stdio` handshake and both selected and related Vitest tool execution.

The prior CI build failed during demo `npm install` with npm Arborist's `edgesOut` error. Version 0.2 adds a `--legacy-peer-deps` workaround for the demo dependency installation. CI must be rerun after publication; this is a mitigation and should not be claimed as proven until the workflow passes.
