import { spawn } from 'node:child_process';
import { getProjectRoot } from './security.js';
import { buildDependencyIndex } from './relations.js';
function git(root, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('git', args, { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
        const stdout = [];
        let stderr = '';
        let length = 0;
        const timer = setTimeout(() => proc.kill('SIGKILL'), 10_000);
        proc.stdout.on('data', (chunk) => {
            length += chunk.length;
            if (length < 1024 * 1024)
                stdout.push(chunk);
            else
                proc.kill('SIGKILL');
        });
        proc.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-1000); });
        proc.on('error', err => { clearTimeout(timer); reject(err); });
        proc.on('close', code => {
            clearTimeout(timer);
            if (code === 0 && length < 1024 * 1024)
                resolve(Buffer.concat(stdout).toString('utf8'));
            else
                reject(new Error('git command failed or exceeded limits: ' + stderr));
        });
    });
}
function mapStatus(code) {
    return code.includes('R') ? 'renamed' : code.includes('A') || code.includes('?') ? 'added' : 'modified';
}
function parsePorcelain(output) {
    const tokens = output.split('\0');
    const result = new Map();
    for (let i = 0; i < tokens.length; i++) {
        const line = tokens[i];
        if (!line || line.length < 4)
            continue;
        const code = line.slice(0, 2);
        const file = line.slice(3);
        if (code.includes('D'))
            continue;
        result.set(file, mapStatus(code));
        if (code.includes('R') || code.includes('C'))
            i++; // NUL-delimited original name follows.
    }
    return result;
}
function parseNameStatus(output) {
    const tokens = output.split('\0').filter(Boolean);
    const results = new Map();
    for (let i = 0; i < tokens.length;) {
        const status = tokens[i++];
        const oldName = tokens[i++];
        if (!oldName)
            break;
        if (status.startsWith('R') || status.startsWith('C')) {
            const name = tokens[i++];
            if (name)
                results.set(name, 'renamed');
        }
        else if (status !== 'D')
            results.set(oldName, mapStatus(status));
    }
    return results;
}
/** Git changes relative to HEAD by default; can compare with a safe explicit base ref. */
export async function getChangedComponents(baseRef = 'HEAD') {
    if (!/^(?:HEAD(?:~\d{1,3}|\^\d{1,2})?|[0-9a-fA-F]{7,40})$/.test(baseRef)) {
        throw new Error('baseRef must be HEAD, HEAD~N, HEAD^N or a commit SHA.');
    }
    const root = await getProjectRoot();
    const index = await buildDependencyIndex(root);
    // -- terminates options; no shell interpolation. Include untracked files separately.
    const againstBase = parseNameStatus(await git(root, ['diff', '--name-status', '-z', '--diff-filter=ACMR', baseRef, '--']));
    const workingTree = parsePorcelain(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
    const combined = new Map([...againstBase, ...workingTree]);
    const changed = [];
    for (const [file, change] of combined) {
        const node = index.files.get(file.replaceAll('\\', '/'));
        if (!node)
            continue;
        changed.push({ file: node.file, change, kind: node.kind });
    }
    changed.sort((a, b) => a.file.localeCompare(b.file));
    const selected = changed.filter(i => i.kind !== 'module').slice(0, 50);
    const changedModules = changed.filter(i => i.kind === 'module').slice(0, 50);
    const affected = new Set();
    for (const item of changed) {
        for (const parent of index.importers.get(item.file) ?? []) {
            if (index.files.get(parent)?.kind !== 'module')
                affected.add(parent);
        }
    }
    return {
        baseRef, selectedTargets: selected,
        otherChangedModules: changedModules,
        directlyAffectedTargets: [...affected].sort().slice(0, 50),
        truncated: changed.length > 100 || affected.size > 50,
        warnings: index.warnings,
        note: 'No entire-repo test generation. Select targets explicitly; dependency changes only suggest impacted candidates. With default HEAD, committed changes are not listed.',
    };
}
