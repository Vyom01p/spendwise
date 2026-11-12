import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/expenses', label: 'Expenses', icon: 'expenses' },
  { to: '/income', label: 'Income', icon: 'income' },
  { to: '/budgets', label: 'Budgets', icon: 'budgets' },
  { to: '/recurring', label: 'Recurring', icon: 'recurring' },
  { to: '/goals', label: 'Goals', icon: 'goals' },
  { to: '/categories', label: 'Categories', icon: 'categories' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
];

const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(() => (isDesktop() ? localStorage.getItem('sw_sidebar') !== 'closed' : false));
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  const toggleSidebar = () => {
    const next = !open;
    setOpen(next);
    if (isDesktop()) localStorage.setItem('sw_sidebar', next ? 'open' : 'closed');
  };

  // Colours fade between light and dark instead of snapping.
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-anim');
    root.dataset.theme = next;
    setTheme(next);
    localStorage.setItem('sw_theme', next);
    setTimeout(() => root.classList.remove('theme-anim'), 400);
  };

  useEffect(() => { if (!isDesktop()) setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !isDesktop() && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allLinks = user?.role === 'admin' ? [...links, { to: '/admin', label: 'Admin', icon: 'admin' }] : links;

  return (
    <div className={`shell ${open ? 'is-open' : 'is-closed'}`}>
      <aside id="sidebar" className="sidebar">
        <div className="sidebar-top">
          <div className="brand"><span className="brand-mark" aria-hidden="true" />Spend-Wise</div>
          <button className="icon-btn icon-btn-side" onClick={toggleSidebar} aria-label="Hide sidebar" title="Hide sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </div>
        <nav aria-label="Main">
          {allLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={l.icon} /><span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link to="/profile" className="side-user">
            <Avatar user={user} size={38} />
            <span className="who">{user?.full_name}</span>
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </div>
      </aside>

      <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={toggleSidebar} aria-expanded={open} aria-controls="sidebar"
                  aria-label={open ? 'Hide sidebar' : 'Show sidebar'} title={open ? 'Hide sidebar' : 'Show sidebar'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="topbar-brand">Spend-Wise</span>
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'}
                    aria-label="Dark mode" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <span className="theme-icon theme-sun"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg></span>
              <span className="theme-icon theme-moon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></span>
              <span className="theme-knob" />
            </button>
            <Link to="/profile" className="topbar-user" title="Your profile"><Avatar user={user} size={34} /></Link>
          </div>
        </header>
        <main className="content">
          {/* key = route, so every page fades/slides in when you navigate */}
          <div key={location.pathname} className="page"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
