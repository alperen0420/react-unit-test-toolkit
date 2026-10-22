import { test, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToggle } from './useToggle';

test('toggles from initial state to opposite state', () => {
  const { result } = renderHook(() => useToggle(true));
  expect(result.current.value).toBe(true);
  act(() => result.current.toggle());
  expect(result.current.value).toBe(false);
});
