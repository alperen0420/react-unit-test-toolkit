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
  assert.equal(valid.testCases, 1);
  assert.equal(valid.assertions, 1);
});

test('rejects tests that do not import component or assert', () => {
  const invalid = validateTestText(`test('fake', () => { let result = true; });`, testFile, target);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some(e => e.includes('directly import')));
  assert.ok(invalid.errors.some(e => e.includes('expect/assert')));
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
