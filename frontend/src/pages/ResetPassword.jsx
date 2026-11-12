import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api.js';
import { errMsg } from '../utils.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.password.length < 8) return setError('Use at least 8 characters.');
    if (pw.password !== pw.confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await api.post('/auth/reset', { token, password: pw.password });
      setDone(true);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Choose a new password</h1>
        {!token ? (
          <div className="banner banner-error">This link is missing its token. Request a new one from the <Link to="/forgot-password">forgot password</Link> page.</div>
        ) : done ? (
          <>
            <div className="banner banner-ok">Password changed.</div>
            <Link className="btn btn-primary btn-block" to="/login" style={{ textAlign: 'center', textDecoration: 'none' }}>Go to log in</Link>
          </>
        ) : (
          <>
            <label>New password
              <input type="password" autoComplete="new-password" value={pw.password} autoFocus
                     onChange={(e) => setPw({ ...pw, password: e.target.value })} />
            </label>
            <label>Confirm new password
              <input type="password" autoComplete="new-password" value={pw.confirm}
                     onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </label>
            {error && <div className="banner banner-error">{error}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </>
        )}
      </form>
    </div>
  );
}
