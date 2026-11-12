import { useState } from 'react';
import { API_BASE } from '../api.js';

// Shows the profile picture, or the user's initials if there is none.
export default function Avatar({ user, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const src = user?.avatar_url && !broken ? `${API_BASE}${user.avatar_url}` : null;
  const initials = (user?.full_name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return src ? (
    <img className="avatar" src={src} width={size} height={size} alt="" onError={() => setBroken(true)} />
  ) : (
    <span className="avatar avatar-initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">{initials}</span>
  );
}
