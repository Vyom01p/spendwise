import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { money, fmtDate, today, errMsg } from '../utils.js';

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10 < 4 ? n % 10 : 0]}`;

function RuleModal({ rule, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    category_id: rule ? String(rule.category_id) : '',
    amount: rule ? String(rule.amount) : '',
    description: rule?.description || '',
    day_of_month: rule ? String(rule.day_of_month) : String(new Date().getDate()),
    start_date: rule ? rule.start_date : today(),
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.category_id) e.category_id = 'Choose a category';
    if (!(Number(form.amount) > 0)) e.amount = 'Enter an amount greater than 0';
    const d = Number(form.day_of_month);
    if (!Number.isInteger(d) || d < 1 || d > 31) e.day_of_month = 'Day must be between 1 and 31';
    if (!form.start_date) e.start_date = 'Pick a start date';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const payload = {
      category_id: Number(form.category_id), amount: Number(form.amount), day_of_month: d,
      start_date: form.start_date, description: form.description.trim() || null, is_active: rule ? rule.is_active : true,
    };
    try {
      const res = rule ? await api.put(`/recurring/${rule.recurring_id}`, payload) : await api.post('/recurring', payload);
      onSaved(res.data);
    } catch (err) {
      setServerError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={rule ? 'Edit recurring expense' : 'New recurring expense'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label>What is it?
          <input value={form.description} onChange={set('description')} maxLength={255} placeholder="e.g. Rent, Netflix, Gym" autoFocus />
        </label>
        <label>Category
          <select value={form.category_id} onChange={set('category_id')} aria-invalid={!!errors.category_id}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
          {errors.category_id && <span className="field-error">{errors.category_id}</span>}
        </label>
        <div className="two-col">
          <label>Amount
            <input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={set('amount')} aria-invalid={!!errors.amount} />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </label>
          <label>Day of month
            <input type="number" min="1" max="31" value={form.day_of_month} onChange={set('day_of_month')} aria-invalid={!!errors.day_of_month} />
            {errors.day_of_month && <span className="field-error">{errors.day_of_month}</span>}
          </label>
        </div>
        <label>Starts on
          <input type="date" value={form.start_date} onChange={set('start_date')} aria-invalid={!!errors.start_date} />
          {errors.start_date && <span className="field-error">{errors.start_date}</span>}
        </label>
        <p className="muted small hint-line">Added automatically on that day every month. Day 31 becomes the last day of shorter months.</p>
        {serverError && <div className="banner banner-error">{serverError}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : rule ? 'Save changes' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Recurring() {
  const toast = useToast();
  const [rules, setRules] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api.get('/recurring'), api.get('/categories')]);
      setRules(r.data.rules); setCategories(c.data.categories); setError('');
    } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r) => {
    try {
      await api.put(`/recurring/${r.recurring_id}`, {
        category_id: r.category_id, amount: r.amount, description: r.description, day_of_month: r.day_of_month,
        start_date: r.start_date, is_active: !r.is_active,
      });
      toast(r.is_active ? 'Paused' : 'Resumed');
      load();
    } catch (e) { toast(errMsg(e), 'error'); }
  };
  const remove = async (r) => {
    if (!window.confirm('Delete this recurring expense? Expenses already added are kept.')) return;
    try { await api.delete(`/recurring/${r.recurring_id}`); toast('Recurring expense deleted'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  const monthlyTotal = (rules || []).filter((r) => r.is_active).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <header className="page-head">
        <div><h1>Recurring</h1><p className="muted">Rent, subscriptions, recharges. Added to your expenses automatically.</p></div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>New recurring expense</button>
      </header>
      {error && <div className="banner banner-error">{error}</div>}

      {!rules ? <section className="card"><Skeleton height={18} style={{ marginBottom: 14 }} /><Skeleton height={18} width="60%" /></section> :
        rules.length === 0 ? <section className="card"><p className="empty">Nothing recurring yet. Add your rent or a subscription and it will show up in your expenses every month on its own.</p></section> : (
          <>
            <section className="card stat-inline">
              <span className="label">Committed every month</span>
              <span className="big-sm num">{money(monthlyTotal)}</span>
            </section>
            <section className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Category</th><th>When</th><th>Next</th><th className="r">Amount</th><th className="r">Actions</th></tr></thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr key={r.recurring_id} className={r.is_active ? '' : 'row-paused'}>
                        <td><strong>{r.description || r.category_name}</strong>{!r.is_active && <span className="pill s-none tag">Paused</span>}</td>
                        <td>{r.category_name}</td>
                        <td>{ordinal(r.day_of_month)} of every month</td>
                        <td className="muted">{r.next_due ? fmtDate(r.next_due) : '—'}</td>
                        <td className="r num">{money(r.amount)}</td>
                        <td className="r actions">
                          <button className="link" onClick={() => toggle(r)}>{r.is_active ? 'Pause' : 'Resume'}</button>
                          <button className="link" onClick={() => setModal(r)}>Edit</button>
                          <button className="link danger" onClick={() => remove(r)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

      {modal && <RuleModal rule={modal === 'new' ? null : modal} categories={categories} onClose={() => setModal(null)}
        onSaved={(res) => {
          setModal(null);
          toast(res.added > 0 ? 'Saved. Today\'s expense was added to your list' : 'Recurring expense saved');
          load();
        }} />}
    </>
  );
}
