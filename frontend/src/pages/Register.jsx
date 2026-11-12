import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Real-time validation (SRS 3.1.1)
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'Enter your full name';
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters';

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const blur = (k) => () => setTouched({ ...touched, [k]: true });

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ full_name: true, email: true, password: true });
    setError('');
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await register(form.full_name.trim(), form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const field = (k, label, props) => (
    <label>{label}
      <input value={form[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={!!(touched[k] && errors[k])} {...props} />
      {touched[k] && errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Set a monthly budget and log expenses in seconds.</p>
        {field('full_name', 'Full name', { autoComplete: 'name', autoFocus: true })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {error && <div className="banner banner-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
