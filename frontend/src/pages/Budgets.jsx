import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';
import BudgetMeter from '../components/BudgetMeter.jsx';
import { thisMonth, monthLabel, prevMonth, errMsg } from '../utils.js';

// One editable row: label + cap input + save/remove + live usage meter.
function BudgetRow({ label, budget, onSave, onRemove, strong }) {
  const [value, setValue] = useState(budget?.budget_cap ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    const n = Number(value);
    if (!(n > 0)) return setErr('Enter an amount greater than 0');
    setErr('');
    setBusy(true);
    await onSave(n);
    setBusy(false);
  };

  return (
    <div className={`budget-row ${strong ? 'budget-row-main' : ''}`}>
      <div className="budget-row-top">
        <strong>{label}</strong>
        <div className="budget-input">
          <input type="number" min="0" step="100" inputMode="decimal" placeholder="No limit (skipped)" value={value}
                 onChange={(e) => setValue(e.target.value)} aria-label={`${label} budget`} />
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>Save</button>
          {budget?.budget_id && (
            <button className="btn btn-ghost btn-sm" onClick={() => onRemove(budget.budget_id)} title="Remove this limit">Skip</button>
          )}
        </div>
      </div>
      {err && <span className="field-error">{err}</span>}
      {budget?.budget_cap && <BudgetMeter spent={budget.spent} cap={budget.budget_cap} usage={budget.usage_percent} status={budget.status} compact />}
    </div>
  );
}

export default function Budgets() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([api.get('/budgets', { params: { month } }), api.get('/categories')]);
      setData(b.data);
      setCategories(c.data.categories);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const save = (category_id) => async (budget_cap) => {
    try {
      await api.put('/budgets', { month_year: month, category_id, budget_cap });
      toast('Budget saved');
      await load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const copyLast = async () => {
    try {
      const res = await api.post('/budgets/copy', { from_month: prevMonth(month), to_month: month });
      toast(res.data.copied > 0
        ? `Copied ${res.data.copied} budget${res.data.copied === 1 ? '' : 's'} from ${monthLabel(prevMonth(month))}`
        : `Nothing to copy: ${monthLabel(prevMonth(month))} has no budgets, or they're already set here`, res.data.copied > 0 ? 'success' : 'warning');
      await load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const remove = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      toast('Budget removed');
      await load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <>
      <header className="page-head">
        <div><h1>Budgets</h1><p className="muted">Set a monthly cap, then optional limits per category. You'll be warned at 80%.</p></div>
        <div className="head-actions">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <button className="btn btn-ghost" onClick={copyLast}>Copy from {monthLabel(prevMonth(month))}</button>
        </div>
      </header>
      {error && <div className="banner banner-error">{error}</div>}
      {!data ? <p className="muted">Loading…</p> : (
        <>
          <section className="card">
            <h2>Overall budget for {monthLabel(month)}</h2>
            <BudgetRow key={`o-${month}-${data.overall.budget_cap}`} label="Monthly cap" strong
                       budget={data.overall.budget_id ? data.overall : null}
                       onSave={save(null)} onRemove={remove} />
          </section>
          <section className="card">
            <h2>By category</h2>
            <p className="muted">Give any category its own spending limit for this month. Leave it empty (or press Skip) if you don't want one.</p>
            {categories.map((c) => {
              const b = data.categories.find((x) => x.category_id === c.category_id);
              return (
                <BudgetRow key={`${c.category_id}-${month}-${b?.budget_cap ?? 'none'}`} label={c.category_name}
                           budget={b || null} onSave={save(c.category_id)} onRemove={remove} />
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
