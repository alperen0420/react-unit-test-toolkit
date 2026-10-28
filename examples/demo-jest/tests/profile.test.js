const { displayName } = require('../web/profile.js');

test('formats a complete name', () => {
  expect(displayName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
});

test('requires a last name', () => {
  expect(() => displayName({ firstName: 'Ada', lastName: ' ' })).toThrow('required');
});
