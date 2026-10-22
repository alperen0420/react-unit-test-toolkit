import { useState, type FormEvent } from 'react';

type Props = {
  submit: (email: string, password: string) => Promise<void>;
};

export function LoginForm({ submit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) { setError('Enter email and password'); return; }
    setError('');
    setBusy(true);
    try { await submit(email, password); }
    catch { setError('Unable to sign in'); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Email <input value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password <input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
