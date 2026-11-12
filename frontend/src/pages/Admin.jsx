import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { fmtDate, errMsg } from '../utils.js';

const day = (dt) => (dt ? fmtDate(dt.slice(0, 10)) : 'Never');

export default function Admin() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [edit, setEdit] = useState(null);
  const [days, setDays] = useState('365');

  const loadUsers = useCallback(async () => {
    try { setUsers((await api.get('/admin/users', { params: { search, page } })).data); } catch (e) { toast(errMsg(e), 'error'); }
  }, [search, page, toast]);
  const loadStats = useCallback(() => api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {}), []);
  const loadCats = useCallback(() => api.get('/admin/categories').then((r) => setCats(r.data.categories)).catch(() => {}), []);

  useEffect(() => { loadStats(); loadCats(); }, [loadStats, loadCats]);
  useEffect(() => { const t = setTimeout(loadUsers, 250); return () => clearTimeout(t); }, [loadUsers]);

  const act = async (fn, okMsg) => {
    try { await fn(); toast(okMsg); loadUsers(); loadStats(); loadCats(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <header className="page-head"><div><h1>Admin</h1><p className="muted">Manage students and the default categories.</p></div></header>

      <div className="stats">
        {['users', 'active_users', 'expenses', 'dormant_users'].map((k, i) => (
          <div key={k} className="card stat">
            <div className="label">{['Students', 'Active accounts', 'Expenses logged', 'Inactive 90+ days'][i]}</div>
            <div className="big-sm num">{stats ? stats[k] : <Skeleton height={26} width={50} />}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-head"><h2>Users</h2>
          <input className="search-sm" type="search" placeholder="Search name or email" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>
        {!users ? <Skeleton height={18} /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Last login</th><th className="r">Expenses</th><th>Status</th><th className="r">Actions</th></tr></thead>
                <tbody>
                  {users.users.map((u) => (
                    <tr key={u.user_id}>
                      <td><strong>{u.full_name}</strong>{u.role === 'admin' && <span className="pill s-normal tag">Admin</span>}</td>
                      <td className="muted">{u.email}</td><td>{day(u.created_at)}</td><td>{day(u.last_login)}</td>
                      <td className="r num">{u.expense_count}</td>
                      <td><span className={`pill ${u.status === 'Active' ? 's-normal' : 's-none'}`}>{u.status}</span></td>
                      <td className="r actions">
                        {u.role !== 'admin' && (
                          <>
                            <button className="link" onClick={() => act(() => api.patch(`/admin/users/${u.user_id}`, { status: u.status === 'Active' ? 'Inactive' : 'Active' }), u.status === 'Active' ? 'Account deactivated' : 'Account activated')}>
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="link danger" onClick={() => window.confirm(`Delete ${u.full_name} and ALL their data? This cannot be undone.`) && act(() => api.delete(`/admin/users/${u.user_id}`), 'User deleted')}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.pagination.pages > 1 && (
              <div className="pager">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span className="muted">Page {users.pagination.page} of {users.pagination.pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= users.pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Default categories</h2>
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (newCat.trim()) act(async () => { await api.post('/admin/categories', { category_name: newCat.trim() }); setNewCat(''); }, 'Category added'); }}>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={50} placeholder="New default category" aria-label="New default category" />
            <button className="btn btn-primary">Add</button>
          </form>
          <ul className="plain-list">
            {cats.map((c) => (
              <li key={c.category_id}>
                {edit?.id === c.category_id ? (
                  <>
                    <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={50} autoFocus aria-label="Category name" />
                    <span className="actions">
                      <button className="link" onClick={() => act(async () => { await api.put(`/admin/categories/${c.category_id}`, { category_name: edit.name.trim() }); setEdit(null); }, 'Category renamed')}>Save</button>
                      <button className="link" onClick={() => setEdit(null)}>Cancel</button>
                    </span>
                  </>
                ) : (
                  <>
                    <span>{c.category_name}</span>
                    <span className="actions">
                      <button className="link" onClick={() => setEdit({ id: c.category_id, name: c.category_name })}>Rename</button>
                      <button className="link danger" onClick={() => window.confirm(`Delete "${c.category_name}"?`) && act(() => api.delete(`/admin/categories/${c.category_id}`), 'Category deleted')}>Delete</button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Clean up inactive accounts</h2>
          <p className="muted">Permanently deletes student accounts (and all their data) that haven't logged in for the number of days below. Admins are never deleted.</p>
          <div className="inline-form" style={{ marginTop: 14 }}>
            <input type="number" min="30" max="3650" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Days inactive" style={{ maxWidth: 120 }} />
            <span className="muted" style={{ alignSelf: 'center' }}>days</span>
            <button className="btn btn-ghost" onClick={async () => {
              if (!window.confirm(`Delete every student account inactive for ${days}+ days? This cannot be undone.`)) return;
              try { const r = await api.post('/admin/cleanup', { days: Number(days) }); toast(`${r.data.deleted} account${r.data.deleted === 1 ? '' : 's'} deleted`); loadUsers(); loadStats(); } catch (e) { toast(errMsg(e), 'error'); }
            }}>Delete inactive</button>
          </div>
        </section>
      </div>
    </>
  );
}
