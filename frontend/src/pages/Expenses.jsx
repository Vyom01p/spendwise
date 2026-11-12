import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ExpenseModal from '../components/ExpenseModal.jsx';
import { money, fmtDate, errMsg } from '../utils.js';

const EMPTY = { from: '', to: '', category_id: '', search: '' };

export default function Expenses() {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY);
  const [debounced, setDebounced] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | expense object
  const [error, setError] = useState('');

  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data.categories)).catch(() => {}); }, []);

  // Wait 300ms after typing before querying
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(filters); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 15 };
      Object.entries(debounced).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/expenses', { params });
      setData(res.data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [debounced, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const onSaved = (res) => {
    const wasEdit = modal && modal !== 'new';
    setModal(null);
    toast(wasEdit ? 'Expense updated' : 'Expense added');
    (res.alerts || []).forEach((a) => toast(a.message, a.status === 'exceeded' ? 'error' : 'warning'));
    load();
  };

  const remove = async (exp) => {
    if (!window.confirm(`Delete this ${money(exp.amount)} expense? This cannot be undone.`)) return;
    try {
      await api.delete(`/expenses/${exp.expense_id}`);
      toast('Expense deleted');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const exportCsv = async () => {
    try {
      const params = {};
      Object.entries(debounced).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/expenses/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spendwise-expenses.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast('Could not export your expenses. Try again.', 'error');
    }
  };

  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <header className="page-head">
        <div><h1>Expenses</h1><p className="muted">Search, filter and edit everything you've logged.</p></div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setModal('new')}>Add expense</button>
        </div>
      </header>

      <section className="card filters">
        <label>Search<input type="search" placeholder="Description or category" value={filters.search} onChange={set('search')} /></label>
        <label>Category
          <select value={filters.category_id} onChange={set('category_id')}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
        </label>
        <label>From<input type="date" value={filters.from} onChange={set('from')} /></label>
        <label>To<input type="date" value={filters.to} onChange={set('to')} /></label>
        {filtered && <button className="btn btn-ghost btn-sm" onClick={() => setFilters(EMPTY)}>Clear filters</button>}
      </section>

      {error && <div className="banner banner-error">{error}</div>}

      <section className="card">
        {!data ? <p className="muted">Loading…</p> : data.expenses.length === 0 ? (
          <p className="empty">{filtered ? 'No expenses match these filters.' : 'No expenses yet. Add your first one.'}</p>
        ) : (
          <>
            <div className="table-summary muted">
              {data.pagination.total} expense{data.pagination.total === 1 ? '' : 's'} totalling <strong className="num">{money(data.total_amount)}</strong>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="r">Amount</th><th className="r">Actions</th></tr></thead>
                <tbody>
                  {data.expenses.map((x) => (
                    <tr key={x.expense_id}>
                      <td>{fmtDate(x.expense_date)}</td>
                      <td>{x.category_name}</td>
                      <td className="muted">{x.description || '—'}</td>
                      <td className="r num">{money(x.amount)}</td>
                      <td className="r actions">
                        <button className="link" onClick={() => setModal(x)}>Edit</button>
                        <button className="link danger" onClick={() => remove(x)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pagination.pages > 1 && (
              <div className="pager">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span className="muted">Page {data.pagination.page} of {data.pagination.pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>

      {modal && (
        <ExpenseModal expense={modal === 'new' ? null : modal} categories={categories}
                      onClose={() => setModal(null)} onSaved={onSaved} />
      )}
    </>
  );
}
