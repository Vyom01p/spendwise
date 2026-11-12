import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { errMsg } from '../utils.js';

export default function Categories() {
  const toast = useToast();
  const [cats, setCats] = useState(null);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(() => {
    api.get('/categories').then((r) => setCats(r.data.categories)).catch((e) => toast(errMsg(e), 'error'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/categories', { category_name: name.trim() });
      setName('');
      toast('Category added');
      load();
    } catch (err) { toast(errMsg(err), 'error'); }
  };

  const rename = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/categories/${id}`, { category_name: editName.trim() });
      setEditId(null);
      toast('Category renamed');
      load();
    } catch (err) { toast(errMsg(err), 'error'); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete the "${c.category_name}" category?`)) return;
    try {
      await api.delete(`/categories/${c.category_id}`);
      toast('Category deleted');
      load();
    } catch (err) { toast(errMsg(err), 'error'); }
  };

  const defaults = (cats || []).filter((c) => c.is_default);
  const custom = (cats || []).filter((c) => !c.is_default);

  return (
    <>
      <header className="page-head"><div><h1>Categories</h1><p className="muted">Use the built-in ones or add your own.</p></div></header>

      <section className="card">
        <h2>Add a category</h2>
        <form className="inline-form" onSubmit={add}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="e.g. Gym, Subscriptions" aria-label="New category name" />
          <button className="btn btn-primary">Add category</button>
        </form>
      </section>

      <section className="card">
        <h2>Your categories</h2>
        {cats && custom.length === 0 && <p className="empty">You haven't added any yet.</p>}
        <ul className="plain-list">
          {custom.map((c) => (
            <li key={c.category_id}>
              {editId === c.category_id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} autoFocus aria-label="Category name" />
                  <span className="actions">
                    <button className="link" onClick={() => rename(c.category_id)}>Save</button>
                    <button className="link" onClick={() => setEditId(null)}>Cancel</button>
                  </span>
                </>
              ) : (
                <>
                  <span>{c.category_name}</span>
                  <span className="actions">
                    <button className="link" onClick={() => { setEditId(c.category_id); setEditName(c.category_name); }}>Rename</button>
                    <button className="link danger" onClick={() => remove(c)}>Delete</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Built-in categories</h2>
        <ul className="plain-list">{defaults.map((c) => <li key={c.category_id}><span>{c.category_name}</span></li>)}</ul>
      </section>
    </>
  );
}
