# Target selection, Git changes, and dependency context

Read this reference when the user asks to test a **new/changed** component without naming its file, or when a component's relationships matter. Use the coding agent's built-in file, search, Git, and terminal tools. These are **examples of existing Git commands**, not a custom executable and not mandatory for agents with an equivalent Git tool.

## Choose the target, not the entire repo

Priority order:
1. Explicit user-selected file/component/hook.
2. File the agent just created or changed during the current task.
3. Changed React candidates from Git working tree.
4. A relevant commit or branch diff, when that is what the user refers to.

If several unrelated candidates remain, clarify which target is intended rather than creating tests for all of them. Do not change unrelated production files.

## Git observations

Use whichever of these is appropriate to the request:

```bash
git status --short
git diff --name-status --diff-filter=ACMR
git diff --cached --name-status --diff-filter=ACMR
git ls-files --others --exclude-standard
git diff --name-status HEAD~1 HEAD -- src/
```

- Unstaged, staged and **untracked** files are distinct. A plain `git diff` does not show untracked files; a clean working tree does **not** mean the last commit had no changes.
- Use `git diff <base>...HEAD -- <path>` to examine branch changes when a meaningful base branch exists. Verify the base before using it; do not assume `origin/main` exists.
- Rename records may identify old and new paths. Read the **current** file.
- Exclude deleted files, test fixtures, build output and generated files unless the user explicitly requests them.
- Component candidates are often `.tsx` / `.jsx` exports that render JSX; hooks often follow `useX` patterns. `.ts` / `.js` files can also contain logic worth testing. File names alone are not decisive.
- Do not automatically test all changed files. Surface a concise shortlist and select based on the user's requested change.

## Follow relationships according to behavior

Read the target's direct imports first. Continue only when a dependency changes the scenario or expected output:

- **Downstream:** child components, hooks, state selectors, context/providers, validation helpers, service and API adapters.
- **Upstream:** components that consume the target; useful when its props, emitted events, contracts, or exports changed.
- **Indirect:** follow a second or later import only if it materially explains a visible state, side effect, error, or test setup.

Use project-aware search (symbol references, import search, editor navigation, TypeScript language service) where available. Inspect `tsconfig.json`/`jsconfig.json` aliases, barrel exports (`index.ts`), re-exports and relative paths. A textual search hit is a **candidate relationship**, not proof the dependency is exercised.

Check `import`, `export ... from`, `require()`, dynamic `import()`, and dependency injection where present. Static imports cannot always reveal runtime behavior. Never present an incomplete dependency graph as exhaustive.

## Keep context selective

- Start with source excerpts for the **selected target** and only the dependencies needed for tests.
- Prefer the implementation of a hook/service called by the target over unrelated neighboring files.
- A provider wrapper or shared test helper might be more useful than an entire upstream tree.
- When a contract is unclear, read the narrow interface or relevant function body; avoid reading every file “just in case”.
- Quick: normally target plus essential direct context. Detailed: include relevant transitive paths and consumers as needed. These are **guidelines, not hard depth or file-count caps**.

## What to tell the user

State which file was selected and why (explicit request, recent edit, untracked file, staged change, commit diff). Mention only the dependency relationships that genuinely influenced generated scenarios. If the Git comparison was unavailable, state how the target was selected instead of claiming Git analysis succeeded.
