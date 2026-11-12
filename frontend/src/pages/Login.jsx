import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../utils.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Log in to see where your money went this month.</p>
        <label>Email
          <input type="email" autoComplete="email" value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
        </label>
        <label>Password
          <input type="password" autoComplete="current-password" value={form.password}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <div className="forgot-row"><Link to="/forgot-password">Forgot password?</Link></div>
        {error && <div className="banner banner-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="auth-switch">New to Spend-Wise? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
