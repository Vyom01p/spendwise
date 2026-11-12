import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { useGrow } from '../hooks.js';
import { money, fmtDate, errMsg } from '../utils.js';

function GoalModal({ goal, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: goal?.name || '', target_amount: goal ? String(goal.target_amount) : '',
    saved_amount: '', target_date: goal?.target_date || '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.name.trim()) e.name = 'Give your goal a name';
    if (!(Number(form.target_amount) > 0)) e.target_amount = 'Enter a target greater than 0';
    if (!goal && form.saved_amount && Number(form.saved_amount) < 0) e.saved_amount = 'Cannot be negative';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const payload = { name: form.name.trim(), target_amount: Number(form.target_amount), target_date: form.target_date || null };
    if (!goal && form.saved_amount) payload.saved_amount = Number(form.saved_amount);
    try {
      const res = goal ? await api.put(`/goals/${goal.goal_id}`, payload) : await api.post('/goals', payload);
      onSaved(res.data);
    } catch (err) { setServerError(errMsg(err)); setSaving(false); }
  };

  return (
    <Modal title={goal ? 'Edit goal' : 'New savings goal'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label>Goal name
          <input value={form.name} onChange={set('name')} maxLength={100} placeholder="e.g. New laptop" autoFocus aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label>Target amount
          <input type="number" min="0" step="0.01" inputMode="decimal" value={form.target_amount} onChange={set('target_amount')} aria-invalid={!!errors.target_amount} />
          {errors.target_amount && <span className="field-error">{errors.target_amount}</span>}
        </label>
        {!goal && (
          <label>Already saved <span className="muted">(optional)</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={form.saved_amount} onChange={set('saved_amount')} aria-invalid={!!errors.saved_amount} />
            {errors.saved_amount && <span className="field-error">{errors.saved_amount}</span>}
          </label>
        )}
        <label>Target date <span className="muted">(optional)</span>
          <input type="date" value={form.target_date} onChange={set('target_date')} />
        </label>
        {serverError && <div className="banner banner-error">{serverError}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MoneyModal({ goal, onClose, onSaved }) {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setError('Enter an amount greater than 0');
    setSaving(true);
    try {
      const res = await api.post(`/goals/${goal.goal_id}/contribute`, { amount: mode === 'add' ? n : -n });
      onSaved(res.data.goal);
    } catch (err) { setError(errMsg(err)); setSaving(false); }
  };

  return (
    <Modal title={`${goal.name}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="segmented" role="group" aria-label="Add or take out money">
          <button type="button" className={mode === 'add' ? 'on' : ''} onClick={() => setMode('add')}>Add money</button>
          <button type="button" className={mode === 'take' ? 'on' : ''} onClick={() => setMode('take')}>Take out</button>
        </div>
        <label>Amount
          <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="0.00" />
        </label>
        <p className="muted small hint-line">Saved so far: {money(goal.saved_amount)} of {money(goal.target_amount)}</p>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : mode === 'add' ? 'Add to goal' : 'Take out'}</button>
        </div>
      </form>
    </Modal>
  );
}

function GoalCard({ goal, onMoney, onEdit, onDelete }) {
  const width = useGrow(goal.percent);
  return (
    <article className={`card goal ${goal.completed ? 'goal-done' : ''}`}>
      <div className="goal-head">
        <h2>{goal.name}</h2>
        {goal.completed ? <span className="pill s-normal">Goal reached</span> : goal.overdue ? <span className="pill s-exceeded">Past target date</span> : null}
      </div>
      <div className="goal-amounts"><span className="big-sm num">{money(goal.saved_amount)}</span><span className="muted num"> of {money(goal.target_amount)}</span></div>
      <div className="meter-track goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goal.percent)} aria-label={`${goal.name} progress`}>
        <div className={`meter-fill ${goal.completed ? 's-normal' : 's-primary'}`} style={{ width: `${width}%` }} />
      </div>
      <div className="goal-meta">
        <span className="num">{Math.round(goal.percent)}%</span>
        {goal.target_date && <span className="muted">by {fmtDate(goal.target_date)}</span>}
      </div>
      {goal.monthly_needed !== null && !goal.completed && (
        <p className="goal-hint">Save about <strong className="num">{money(goal.monthly_needed)}</strong> a month to get there.</p>
      )}
      <div className="goal-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onMoney(goal)}>Add / take out</button>
        <button className="link" onClick={() => onEdit(goal)}>Edit</button>
        <button className="link danger" onClick={() => onDelete(goal)}>Delete</button>
      </div>
    </article>
  );
}

export default function Goals() {
  const toast = useToast();
  const [goals, setGoals] = useState(null);
  const [modal, setModal] = useState(null); // {type:'goal'|'money', goal?}
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setGoals((await api.get('/goals')).data.goals); setError(''); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (g) => {
    if (!window.confirm(`Delete the goal "${g.name}"?`)) return;
    try { await api.delete(`/goals/${g.goal_id}`); toast('Goal deleted'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <header className="page-head">
        <div><h1>Savings goals</h1><p className="muted">Pick something to save for and watch it fill up.</p></div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'goal' })}>New goal</button>
      </header>
      {error && <div className="banner banner-error">{error}</div>}
      {!goals ? <section className="card"><Skeleton height={18} style={{ marginBottom: 14 }} /><Skeleton height={14} width="50%" /></section> :
        goals.length === 0 ? <section className="card"><p className="empty">No goals yet. Saving for a laptop, a trip or an emergency fund? Create your first goal.</p></section> : (
          <div className="goal-grid">
            {goals.map((g) => (
              <GoalCard key={g.goal_id} goal={g} onMoney={(goal) => setModal({ type: 'money', goal })}
                        onEdit={(goal) => setModal({ type: 'goal', goal })} onDelete={remove} />
            ))}
          </div>
        )}
      {modal?.type === 'goal' && <GoalModal goal={modal.goal} onClose={() => setModal(null)}
        onSaved={() => { toast(modal.goal ? 'Goal updated' : 'Goal created'); setModal(null); load(); }} />}
      {modal?.type === 'money' && <MoneyModal goal={modal.goal} onClose={() => setModal(null)}
        onSaved={(g) => { toast(g.completed ? 'Goal reached. Well done!' : 'Goal updated'); setModal(null); load(); }} />}
    </>
  );
}
