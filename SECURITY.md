# Security

The MCP server runs as a local `stdio` process with access to one configured project directory.

- Set `REACT_TEST_ALLOWED_ROOT` to the absolute path of a trusted React project.
- Path handling rejects absolute input paths, parent traversal, and symlinks that escape the configured root. File-size limits apply.
- MCP tools read files and report results; they do not modify application or test source files. The coding assistant remains responsible for proposing and reviewing file edits.
- `run_unit_test` executes code from the target project. It invokes the project-local Vitest entrypoint without a shell and imposes a timeout, **but it is not a sandbox**. Project scripts and spawned child processes may have additional side effects. Use a container or other isolation for untrusted projects.
- Require human approval before running generated tests. Do not auto-approve `run_unit_test` in an MCP client.
- Review the coding assistant's model endpoint and data-sharing settings independently. The MCP server does not invoke an LLM or send source code to a model provider itself; its subprocesses and package installers may have their own network behavior.
- Never commit credentials, sensitive project code, `node_modules`, or generated coverage artifacts to this repository.

To report a potential vulnerability, contact the repository maintainer privately. Avoid posting exploit details in a public issue before a fix is available.
