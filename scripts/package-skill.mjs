import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, '.cline', 'skills', 'react-unit-testing');
const dest = path.join(skill, 'scripts', 'lib');
const names = ['cli','analyzer','changes','coverage','project','relations','runner','security','validator'];
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
for (const name of names) {
  await copyFile(path.join(root, 'dist', `${name}.js`), path.join(dest, `${name}.js`));
}
const skillSource = await readFile(path.join(skill, 'SKILL.md'), 'utf8');
if (!/^---\nname: react-unit-testing\ndescription: /m.test(skillSource)) throw new Error('SKILL.md metadata malformed or missing.');
await copyFile(path.join(root, 'LICENSE'), path.join(skill, 'LICENSE'));
await writeFile(path.join(dest, 'BUILD_INFO.txt'), `Generated from root TypeScript sources. Rebuild with npm run bundle:skill.\n`);
console.log(`Bundled ${names.length} helper modules into .cline/skills/react-unit-testing/scripts/lib`);
