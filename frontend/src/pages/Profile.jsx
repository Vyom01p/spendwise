import { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { errMsg } from '../utils.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.full_name);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [busy, setBusy] = useState(false);

  const save = async (body, done) => {
    setBusy(true);
    try {
      const res = await api.put('/auth/me', body);
      setUser((u) => ({ ...u, ...res.data.user }));
      toast(done);
      return true;
    } catch (e) {
      toast(errMsg(e), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveName = (e) => { e.preventDefault(); if (name.trim()) save({ full_name: name.trim() }, 'Name updated'); };
  const savePw = async (e) => {
    e.preventDefault();
    if (pw.new_password.length < 8) return toast('New password must be at least 8 characters', 'error');
    if (await save(pw, 'Password changed')) setPw({ current_password: '', new_password: '' });
  };

  return (
    <>
      <header className="page-head"><div><h1>Profile</h1><p className="muted">{user.email}</p></div></header>
      <section className="card narrow">
        <h2>Your name</h2>
        <form onSubmit={saveName}>
          <label>Full name<input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></label>
          <button className="btn btn-primary" disabled={busy}>Save name</button>
        </form>
      </section>
      <section className="card narrow">
        <h2>Change password</h2>
        <form onSubmit={savePw}>
          <label>Current password<input type="password" autoComplete="current-password" value={pw.current_password}
                 onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></label>
          <label>New password<input type="password" autoComplete="new-password" value={pw.new_password}
                 onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></label>
          <button className="btn btn-primary" disabled={busy}>Change password</button>
        </form>
      </section>
    </>
  );
}
