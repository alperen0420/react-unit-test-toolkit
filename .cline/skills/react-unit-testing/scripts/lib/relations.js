import { readdir, readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { getProjectRoot, isInside, resolveProjectFile, SOURCE_EXTS, MAX_SOURCE_BYTES } from './security.js';
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.next', '.nuxt', '.output', '.turbo', 'coverage', 'dist', 'build', 'out', 'public', '.cache', '.storybook', 'storybook-static']);
const MAX_INDEX_FILES = 800;
const MAX_INDEX_ENTRIES = 6000;
const MAX_CONTEXT_FILES = 12;
const MAX_SNIPPET_CHARS = 3500;
const toPosix = (p) => p.split(path.sep).join('/');
const isSourceFile = (p) => /\.[jt]sx?$/.test(p) && !/(?:\.(?:test|spec)\.[jt]sx?|\.d\.ts)$/.test(p);
function sourceKind(filename) {
    return filename.endsWith('.tsx') ? ts.ScriptKind.TSX : filename.endsWith('.jsx') ? ts.ScriptKind.JSX : filename.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}
function getImports(ast) {
    const imports = new Set();
    function walk(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.add(node.moduleSpecifier.text);
        }
        if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
            if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
                imports.add(node.arguments[0].text);
            }
        }
        ts.forEachChild(node, walk);
    }
    walk(ast);
    return [...imports];
}
export function classifySource(filename, text) {
    const ast = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, sourceKind(filename));
    let jsx = false;
    let hook = false;
    function walk(node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))
            jsx = true;
        if (ts.isFunctionDeclaration(node) && node.name && /^use[A-Z]/.test(node.name.text))
            hook = true;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^use[A-Z]/.test(node.name.text))
            hook = true;
        ts.forEachChild(node, walk);
    }
    walk(ast);
    if (jsx)
        return 'component';
    if (hook || /(?:^|\/)use[A-Z][\w]*\.[jt]sx?$/.test(toPosix(filename)))
        return 'hook';
    return 'module';
}
async function getCompilerOptions(root) {
    const config = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
    if (!config)
        return { allowJs: true, moduleResolution: ts.ModuleResolutionKind.Bundler };
    const data = ts.readConfigFile(config, ts.sys.readFile);
    if (data.error)
        return { allowJs: true, moduleResolution: ts.ModuleResolutionKind.Bundler };
    const parsed = ts.parseJsonConfigFileContent(data.config, ts.sys, path.dirname(config));
    return { ...parsed.options, allowJs: true };
}
/** Bounded, read-only graph of project-local static module dependencies. */
export async function buildDependencyIndex(root) {
    const files = new Map();
    const warnings = [];
    const candidates = [];
    let visited = 0;
    async function walk(dir) {
        if (candidates.length >= MAX_INDEX_FILES || visited >= MAX_INDEX_ENTRIES)
            return;
        let entries = await readdir(dir, { withFileTypes: true });
        entries = entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            if (++visited > MAX_INDEX_ENTRIES || candidates.length >= MAX_INDEX_FILES)
                return;
            // Never follow symlinks while indexing, even when they point inside the project.
            if (entry.isSymbolicLink())
                continue;
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.'))
                await walk(abs);
            else if (entry.isFile() && isSourceFile(entry.name)) {
                const size = await stat(abs);
                if (size.size <= MAX_SOURCE_BYTES)
                    candidates.push(abs);
            }
        }
    }
    await walk(root);
    if (candidates.length === MAX_INDEX_FILES || visited >= MAX_INDEX_ENTRIES)
        warnings.push('Index limit reached; dependency and reverse-dependency results may be incomplete.');
    const opts = await getCompilerOptions(root);
    const importSpecs = new Map();
    for (const abs of candidates) {
        const relative = toPosix(path.relative(root, abs));
        const code = await readFile(abs, 'utf8');
        const ast = ts.createSourceFile(abs, code, ts.ScriptTarget.Latest, true, sourceKind(abs));
        importSpecs.set(relative, getImports(ast));
        files.set(relative, { file: relative, kind: classifySource(abs, code), imports: [], rawImports: getImports(ast) });
    }
    // Resolve aliases through tsconfig paths as well as ordinary relative imports.
    for (const [relative, specs] of importSpecs) {
        const abs = path.join(root, relative);
        const outgoing = new Set();
        for (const spec of specs) {
            if (!spec.startsWith('.') && !opts.paths && !opts.baseUrl)
                continue;
            const resolved = ts.resolveModuleName(spec, abs, opts, ts.sys).resolvedModule?.resolvedFileName;
            if (!resolved)
                continue;
            let canonical;
            try {
                canonical = await realpath(resolved);
            }
            catch {
                continue;
            }
            if (!isInside(root, canonical))
                continue;
            const dep = toPosix(path.relative(root, canonical));
            if (files.has(dep))
                outgoing.add(dep);
        }
        files.get(relative).imports = [...outgoing].sort();
    }
    const importers = new Map();
    for (const node of files.values()) {
        for (const dep of node.imports)
            importers.set(dep, [...(importers.get(dep) ?? []), node.file]);
    }
    for (const parents of importers.values())
        parents.sort();
    return { root, files, importers, warnings };
}
async function indexedTarget(index, file) {
    const checked = await resolveProjectFile(index.root, file, SOURCE_EXTS);
    if (!index.files.has(checked.relative))
        throw new Error('Source is not in the bounded project index; check exclusions or index limits.');
    return checked.relative;
}
/** Return only a small, evidence-bearing context neighborhood for the selected target. */
export async function getRelatedContext(file, depth = 2) {
    const root = await getProjectRoot();
    const index = await buildDependencyIndex(root);
    const target = await indexedTarget(index, file);
    const maxDepth = Math.max(1, Math.min(2, depth));
    const queued = [{ file: target, depth: 0 }];
    const seen = new Set();
    const context = [];
    while (queued.length && context.length < MAX_CONTEXT_FILES) {
        const next = queued.shift();
        if (seen.has(next.file))
            continue;
        seen.add(next.file);
        const node = index.files.get(next.file);
        const source = await readFile(path.join(root, next.file), 'utf8');
        context.push({ file: next.file, depth: next.depth, kind: node.kind, imports: node.imports, sourceExcerpt: source.slice(0, MAX_SNIPPET_CHARS), truncated: source.length > MAX_SNIPPET_CHARS });
        if (next.depth < maxDepth)
            for (const dep of node.imports)
                if (!seen.has(dep))
                    queued.push({ file: dep, depth: next.depth + 1 });
    }
    const directImporters = (index.importers.get(target) ?? []).slice(0, 30);
    return {
        target, targetKind: index.files.get(target).kind,
        context, directImporters, depth: maxDepth,
        omittedContextCount: queued.length,
        warnings: index.warnings,
        note: 'Only selected source and bounded local dependencies are excerpted. Importers are paths only; do not generate tests for them automatically.',
    };
}
/** Reverse local imports for impact analysis, without generating unrelated tests. */
export async function getAffectedComponents(file, depth = 2) {
    const index = await buildDependencyIndex(await getProjectRoot());
    const target = await indexedTarget(index, file);
    const queue = [{ file: target, depth: 0 }];
    const seen = new Set([target]);
    const affected = [];
    const maxDepth = Math.max(1, Math.min(3, depth));
    while (queue.length && seen.size <= 150) {
        const item = queue.shift();
        if (item.depth >= maxDepth)
            continue;
        for (const parent of index.importers.get(item.file) ?? []) {
            if (seen.has(parent))
                continue;
            seen.add(parent);
            const node = index.files.get(parent);
            if (node.kind !== 'module')
                affected.push({ file: parent, depth: item.depth + 1, kind: node.kind });
            queue.push({ file: parent, depth: item.depth + 1 });
        }
    }
    return {
        sourceFile: target, affected: affected.slice(0, 40),
        truncated: affected.length > 40 || queue.length > 0,
        warnings: index.warnings,
        note: 'Static import-based impact candidates, not confirmed regression defects. Dynamic imports and runtime dependency injection may be missed.',
    };
}
