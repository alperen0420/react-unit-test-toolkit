import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

test('increments the visible count when clicked', async () => {
  const user = userEvent.setup();
  render(<Counter initialValue={1} />);
  await user.click(screen.getByRole('button', { name: 'Increase' }));
  expect(screen.getByRole('status')).toHaveTextContent('2');
});

test('disables the button at the limit and shows a message', () => {
  render(<Counter initialValue={2} max={2} />);
  expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
  expect(screen.getByText('Maximum reached')).toBeInTheDocument();
});
