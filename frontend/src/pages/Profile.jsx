import { useRef, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import { errMsg } from '../utils.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
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

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets you pick the same file again later
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast('Choose a JPG, PNG or WebP image', 'error');
    if (file.size > 2 * 1024 * 1024) return toast('Image must be 2 MB or smaller', 'error');
    const fd = new FormData();
    fd.append('avatar', file);
    setBusy(true);
    try {
      const res = await api.post('/auth/avatar', fd);
      setUser((u) => ({ ...u, ...res.data.user }));
      toast('Profile photo updated');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    setBusy(true);
    try {
      const res = await api.delete('/auth/avatar');
      setUser((u) => ({ ...u, ...res.data.user }));
      toast('Profile photo removed');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="page-head"><div><h1>Profile</h1><p className="muted">{user.email}</p></div></header>

      <section className="card narrow">
        <h2>Profile photo</h2>
        <div className="avatar-row">
          <Avatar key={user.avatar_url || 'none'} user={user} size={88} />
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickPhoto} />
            <div className="head-actions">
              <button className="btn btn-primary btn-sm" onClick={() => fileRef.current.click()} disabled={busy}>
                {user.avatar_url ? 'Change photo' : 'Upload photo'}
              </button>
              {user.avatar_url && <button className="btn btn-ghost btn-sm" onClick={removePhoto} disabled={busy}>Remove</button>}
            </div>
            <p className="muted small">JPG, PNG or WebP, up to 2 MB.</p>
          </div>
        </div>
      </section>

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
