import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTestText } from '../validator.js';

const target = '/repo/src/Button.tsx';
const testFile = '/repo/src/Button.test.tsx';

test('accepts a normal React Testing Library assertion', () => {
  const valid = validateTestText(`
    import { Button } from './Button';
    import { test, expect } from 'vitest';
    test('renders', () => { expect(Button).toBeDefined(); });
  `, testFile, target);
  assert.equal(valid.valid, true);
  assert.equal(valid.targetImportVerified, true);
  assert.equal(valid.testCases, 1);
  assert.equal(valid.assertions, 1);
});

test('supports CommonJS require with extension from sibling tests directory', () => {
  const valid = validateTestText(`
    const { Profil } = require('../web/profil.js');
    test('profile', () => { expect(Profil).toBeDefined(); });
  `, '/repo/tests/profil.test.js', '/repo/web/profil.js');
  assert.equal(valid.valid, true, JSON.stringify(valid));
  assert.equal(valid.targetImportVerified, true);
  assert.deepEqual(valid.errors, []);
});

test('does not mistake alias imports for syntax errors', () => {
  const valid = validateTestText(`
    import { Button } from '@/components/Button';
    test('renders', () => { expect(Button).toBeDefined(); });
  `, testFile, target);
  assert.equal(valid.valid, true);
  assert.equal(valid.targetImportVerified, false);
  assert.ok(valid.warnings.some(s => s.includes('Could not statically verify')));
});

test('rejects no-assertion tests while warning about unrecognized import', () => {
  const invalid = validateTestText(`test('fake', () => { let result = true; });`, testFile, target);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.warnings.some(e => e.includes('Could not statically verify')));
  assert.ok(invalid.errors.some(e => e.includes('No expect/assert')));
});

test('recognizes test.each and assert.strictEqual', () => {
  const valid = validateTestText(`
    const Button = require('./Button');
    const assert = require('node:assert/strict');
    test.each([1,2])('case %s', (input) => { assert.strictEqual(input > 0, true); });
  `, '/repo/src/Button.test.tsx', target);
  assert.equal(valid.valid, true, JSON.stringify(valid));
  assert.equal(valid.testCases, 1);
});

test('rejects .only and .skip', () => {
  const invalid = validateTestText(`import './Button'; test.only('focused', () => { expect(true).toBe(true); });`, testFile, target);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some(e => e.includes('focused')));
});

test('detects malformed TSX syntax', () => {
  const invalid = validateTestText(`import { Button } from './Button'; test('bad', () => { expect(<Button>).toBeDefined() });`, testFile, target);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length > 0);
});
