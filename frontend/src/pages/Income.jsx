import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { money, fmtDate, today, errMsg } from '../utils.js';

const SOURCES = ['Allowance', 'Salary', 'Scholarship', 'Freelance', 'Gift', 'Refund', 'Other'];

function IncomeModal({ entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: entry ? String(entry.amount) : '',
    income_date: entry ? entry.income_date : today(),
    source: entry ? entry.source : 'Allowance',
    notes: entry?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    const n = Number(form.amount);
    if (!form.amount || !(n > 0)) e.amount = 'Enter an amount greater than 0';
    if (!form.income_date) e.income_date = 'Pick a date';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const payload = { amount: n, income_date: form.income_date, source: form.source.trim() || 'Other', notes: form.notes.trim() || null };
    try {
      const res = entry ? await api.put(`/income/${entry.income_id}`, payload) : await api.post('/income', payload);
      onSaved(res.data);
    } catch (err) {
      setServerError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={entry ? 'Edit income' : 'Add income'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label>Amount
          <input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={set('amount')} autoFocus placeholder="0.00" aria-invalid={!!errors.amount} />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </label>
        <label>Source
          <input list="income-sources" value={form.source} onChange={set('source')} maxLength={100} />
          <datalist id="income-sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <label>Date
          <input type="date" value={form.income_date} onChange={set('income_date')} aria-invalid={!!errors.income_date} />
          {errors.income_date && <span className="field-error">{errors.income_date}</span>}
        </label>
        <label>Notes <span className="muted">(optional)</span>
          <textarea rows="2" maxLength="1000" value={form.notes} onChange={set('notes')} />
        </label>
        {serverError && <div className="banner banner-error">{serverError}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : entry ? 'Save changes' : 'Add income'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Income() {
  const toast = useToast();
  const [filters, setFilters] = useState({ from: '', to: '', search: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 15 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      setData((await api.get('/income', { params })).data);
      setError('');
    } catch (e) { setError(errMsg(e)); }
  }, [filters, page]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const set = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };
  const remove = async (x) => {
    if (!window.confirm(`Delete this ${money(x.amount)} income entry?`)) return;
    try { await api.delete(`/income/${x.income_id}`); toast('Income deleted'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <header className="page-head">
        <div><h1>Income</h1><p className="muted">Allowance, salary, scholarships. Anything coming in.</p></div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>Add income</button>
      </header>

      <section className="card filters filters-3">
        <label>Search<input type="search" placeholder="Source or notes" value={filters.search} onChange={set('search')} /></label>
        <label>From<input type="date" value={filters.from} onChange={set('from')} /></label>
        <label>To<input type="date" value={filters.to} onChange={set('to')} /></label>
      </section>

      {error && <div className="banner banner-error">{error}</div>}
      <section className="card">
        {!data ? <><Skeleton height={18} style={{ marginBottom: 14 }} /><Skeleton height={18} style={{ marginBottom: 14 }} /><Skeleton height={18} width="70%" /></> :
          data.income.length === 0 ? <p className="empty">No income recorded yet. Add your allowance or salary to see your savings on the dashboard.</p> : (
            <>
              <div className="table-summary muted">{data.pagination.total} entr{data.pagination.total === 1 ? 'y' : 'ies'} totalling <strong className="num pos">{money(data.total_amount)}</strong></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Source</th><th>Notes</th><th className="r">Amount</th><th className="r">Actions</th></tr></thead>
                  <tbody>
                    {data.income.map((x) => (
                      <tr key={x.income_id}>
                        <td>{fmtDate(x.income_date)}</td><td>{x.source}</td><td className="muted">{x.notes || '—'}</td>
                        <td className="r num pos">{money(x.amount)}</td>
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

      {modal && <IncomeModal entry={modal === 'new' ? null : modal} onClose={() => setModal(null)}
        onSaved={() => { toast(modal === 'new' ? 'Income added' : 'Income updated'); setModal(null); load(); }} />}
    </>
  );
}
