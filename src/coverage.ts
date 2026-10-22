import path from 'node:path';
import { getProjectRoot, readProjectText, resolveProjectFile, MAX_REPORT_BYTES, SOURCE_EXTS } from './security.js';

type IstanbulFileCoverage = {
  path?: string;
  s?: Record<string, number>;
  f?: Record<string, number>;
  b?: Record<string, number[]>;
  statementMap?: Record<string, { start?: { line?: number } }>;
};

function ratio(covered: number, total: number) {
  return { covered, total, percent: total === 0 ? null : Math.round((covered / total) * 10000) / 100 };
}

export function summarizeIstanbul(file: IstanbulFileCoverage): object {
  const statements = Object.entries(file.s ?? {});
  const functions = Object.values(file.f ?? {});
  const branches = Object.values(file.b ?? {}).flat();
  const uncoveredLines = statements
    .filter(([, count]) => count === 0)
    .map(([id]) => file.statementMap?.[id]?.start?.line)
    .filter((num): num is number => typeof num === 'number');
  return {
    statements: ratio(statements.filter(([, count]) => count > 0).length, statements.length),
    functions: ratio(functions.filter(count => count > 0).length, functions.length),
    branches: ratio(branches.filter(count => count > 0).length, branches.length),
    uncoveredStatementLines: [...new Set(uncoveredLines)].sort((a, b) => a - b).slice(0, 100),
  };
}

export async function getTestCoverage(sourceFile: string): Promise<object> {
  const root = await getProjectRoot();
  const source = await resolveProjectFile(root, sourceFile, SOURCE_EXTS);
  let report;
  try {
    report = await readProjectText(root, 'coverage/coverage-final.json', ['.json'], MAX_REPORT_BYTES);
  } catch (err) {
    if (err instanceof Error && /ENOENT/.test(err.message)) {
      return {
        available: false,
        sourceFile: source.relative,
        message: 'No coverage/coverage-final.json file. Run the React project Vitest with --coverage and JSON reporter first.',
      };
    }
    throw err;
  }
  const json = JSON.parse(report.text) as Record<string, IstanbulFileCoverage>;
  const matched = Object.entries(json).find(([key, data]) => {
    const raw = data.path ?? key;
    const candidate = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(root, raw);
    return candidate === source.absolute;
  });
  if (!matched) {
    return { available: false, sourceFile: source.relative, message: 'Coverage report exists, but does not contain this source file.' };
  }
  return { available: true, sourceFile: source.relative, ...summarizeIstanbul(matched[1]) };
}
