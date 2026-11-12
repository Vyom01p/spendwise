import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { errMsg } from '../utils.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      await api.post('/auth/forgot', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Forgot your password?</h1>
        {sent ? (
          <>
            <div className="banner banner-ok">If that email is registered, a reset link is on its way. It works for 30 minutes.</div>
            <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
          </>
        ) : (
          <>
            <p className="muted">Enter your email and we'll send you a link to choose a new one.</p>
            <label>Email
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </label>
            {error && <div className="banner banner-error">{error}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
          </>
        )}
      </form>
    </div>
  );
}
