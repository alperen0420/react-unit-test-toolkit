# Security

The Skill is instruction text plus optional local helper scripts. No MCP server, HTTP listener, external model endpoint, telemetry, upload tool, or GitHub write command is shipped.

**Important:** Jest/Vitest commands execute the target project's JavaScript and may run arbitrary code or lifecycle hooks. Only run tests in trusted repos or in isolation, with the coding assistant's required approval. The helper uses `spawn` with `shell: false` and project-local runners, but this is **not** a sandbox.

The CLI requires an explicit `--project` root, rejects parent traversal and symlink escapes when reading individual files, restricts supported file extensions, and applies source/report read limits. Dependency scans skip symlinks and known build/vendor folders. These checks reduce accidental access outside the project; do not treat them as comprehensive process isolation.

The helper does not write to application source. Its `run` and `related` commands write temporary JSON reports outside the project; the target test process itself may have side effects. Generated tests are written by the host coding assistant with its own permissions and approvals.

Install dependencies from an approved package registry. Review package updates, project scripts, your coding assistant's model-provider configuration, and whether installed packages or other extensions allow network access. The Skill does not itself send code to a network service, but it cannot restrict how the host assistant handles project context.

To report a vulnerability, use private disclosure channels rather than posting a working exploit or private code in a public issue.
