import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('does not submit empty fields', async () => {
  const submit = vi.fn(async () => {});
  render(<LoginForm submit={submit} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter email and password');
  expect(submit).not.toHaveBeenCalled();
});

test('calls submit with the entered data', async () => {
  const user = userEvent.setup();
  const submit = vi.fn(async () => {});
  render(<LoginForm submit={submit} />);
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'dev@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(submit).toHaveBeenCalledWith('dev@example.com', 'secret');
});

test('shows error when submit rejects', async () => {
  const user = userEvent.setup();
  const submit = vi.fn(async () => { throw new Error('offline'); });
  render(<LoginForm submit={submit} />);
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'dev@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in');
});
