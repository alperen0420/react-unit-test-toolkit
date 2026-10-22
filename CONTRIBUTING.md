# Contributing

Requirements: Node.js 22+ and npm. Install dependencies in the repository root and the example project, then run:

```bash
npm install
npm install --prefix examples/demo-react
npm run typecheck
npm test
npm run test:demo
npm run test:mcp
```

Keep MCP tools scoped to `REACT_TEST_ALLOWED_ROOT`, read-only where possible, and return structured results. Include regression tests for file-path validation, malformed inputs, and test-runner failures. The toolkit provides deterministic MCP tools; LLM inference belongs to the host coding assistant.
