import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
export const MAX_SOURCE_BYTES = 120_000;
export const MAX_REPORT_BYTES = 12_000_000;
export function isInside(root, candidate) {
    const rel = path.relative(root, candidate);
    return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}
export async function getProjectRoot() {
    const raw = process.env.REACT_TEST_ALLOWED_ROOT;
    if (!raw || !path.isAbsolute(raw)) {
        throw new Error('Set REACT_TEST_ALLOWED_ROOT to an absolute path of one trusted React project.');
    }
    const root = await realpath(raw);
    const info = await stat(root);
    if (!info.isDirectory())
        throw new Error('Configured project root is not a directory.');
    await stat(path.join(root, 'package.json'));
    return root;
}
export async function resolveProjectFile(root, relativeFile, extensions, maxBytes = MAX_SOURCE_BYTES) {
    if (typeof relativeFile !== 'string' || !relativeFile.trim() || relativeFile.includes('\0')) {
        throw new Error('A non-empty project-relative file path is required.');
    }
    if (path.isAbsolute(relativeFile) || /^[a-zA-Z]:[\\/]/.test(relativeFile)) {
        throw new Error('Absolute file paths are forbidden. Use a path relative to REACT_TEST_ALLOWED_ROOT.');
    }
    if (relativeFile.split(/[\\/]/).includes('..'))
        throw new Error('Parent-directory traversal is forbidden.');
    const candidate = path.resolve(root, relativeFile);
    if (!isInside(root, candidate))
        throw new Error('File path is outside the configured root.');
    const absolute = await realpath(candidate); // Resolves symlinks; missing files are not accepted.
    if (!isInside(root, absolute))
        throw new Error('Symlink resolves outside the configured root.');
    if (!extensions.some(ext => absolute.endsWith(ext))) {
        throw new Error(`Unsupported file extension (expected: ${extensions.join(', ')}).`);
    }
    const info = await stat(absolute);
    if (!info.isFile())
        throw new Error('The path is not a regular file.');
    if (info.size > maxBytes)
        throw new Error(`File exceeds ${maxBytes} bytes limit.`);
    return { absolute, relative: path.relative(root, absolute).split(path.sep).join('/') };
}
export async function readProjectText(root, relativeFile, extensions, maxBytes = MAX_SOURCE_BYTES) {
    const file = await resolveProjectFile(root, relativeFile, extensions, maxBytes);
    const text = await readFile(file.absolute, 'utf8');
    return { ...file, text };
}
export const SOURCE_EXTS = ['.tsx', '.ts', '.jsx', '.js'];
export const TEST_EXTS = ['.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts', '.test.jsx', '.spec.jsx', '.test.js', '.spec.js'];
