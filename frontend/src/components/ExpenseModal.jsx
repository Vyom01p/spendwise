import { useEffect, useState } from 'react';
import api from '../api.js';
import { today, errMsg } from '../utils.js';

// Add or edit an expense (SRS 3.3.1 "Expense Entry Modal").
export default function ExpenseModal({ expense, categories, onClose, onSaved }) {
  const editing = !!expense;
  const [form, setForm] = useState({
    amount: expense ? String(expense.amount) : '',
    category_id: expense ? String(expense.category_id) : '',
    expense_date: expense ? expense.expense_date : today(),
    description: expense?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    const amt = Number(form.amount);
    if (!form.amount || !(amt > 0)) e.amount = 'Enter an amount greater than 0';
    else if (amt > 99999999.99) e.amount = 'Amount is too large';
    if (!form.category_id) e.category_id = 'Choose a category';
    if (!form.expense_date) e.expense_date = 'Pick a date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    const payload = {
      amount: Number(form.amount),
      category_id: Number(form.category_id),
      expense_date: form.expense_date,
      description: form.description.trim() || null,
    };
    try {
      const res = editing
        ? await api.put(`/expenses/${expense.expense_id}`, payload)
        : await api.post('/expenses', payload);
      onSaved(res.data);
    } catch (err) {
      setServerError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-labelledby="exp-title">
        <h2 id="exp-title">{editing ? 'Edit expense' : 'Add expense'}</h2>

        <label>Amount
          <input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount}
                 onChange={set('amount')} autoFocus placeholder="0.00" aria-invalid={!!errors.amount} />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </label>

        <label>Category
          <select value={form.category_id} onChange={set('category_id')} aria-invalid={!!errors.category_id}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
          {errors.category_id && <span className="field-error">{errors.category_id}</span>}
        </label>

        <label>Date
          <input type="date" value={form.expense_date} onChange={set('expense_date')} aria-invalid={!!errors.expense_date} />
          {errors.expense_date && <span className="field-error">{errors.expense_date}</span>}
        </label>

        <label>Description <span className="muted">(optional)</span>
          <textarea rows="2" maxLength="1000" value={form.description} onChange={set('description')}
                    placeholder="e.g. Lunch with friends" />
        </label>

        {serverError && <div className="banner banner-error">{serverError}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
