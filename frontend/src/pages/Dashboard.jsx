import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import BudgetMeter from '../components/BudgetMeter.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { useCountUp } from '../hooks.js';
import ExpenseModal from '../components/ExpenseModal.jsx';
import { money, thisMonth, monthLabel, shortMonth, fmtDate, errMsg, CHART_COLORS } from '../utils.js';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.get('/analytics/summary', { params: { month } }),
        api.get('/categories'),
      ]);
      setData(s.data);
      setCategories(c.data.categories);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  const spentShown = useCountUp(data ? data.total_spent : 0);

  const onSaved = (res) => {
    setModal(false);
    toast('Expense added');
    (res.alerts || []).forEach((a) => toast(a.message, a.status === 'exceeded' ? 'error' : 'warning'));
    load();
  };

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) {
    return (
      <>
        <Skeleton height={34} width={220} style={{ marginBottom: 22 }} />
        <section className="card"><Skeleton height={44} width={260} style={{ marginBottom: 20 }} /><Skeleton height={18} /></section>
        <div className="grid-2"><section className="card"><Skeleton height={200} /></section><section className="card"><Skeleton height={200} /></section></div>
      </>
    );
  }

  const totalByCat = data.by_category.reduce((s, c) => s + c.total, 0);
  const critical = [{ n: 'Overall', s: data.status, u: data.usage_percent }, ...data.category_budgets.map((b) => ({ n: b.category_name, s: b.status, u: b.usage_percent }))]
    .filter((b) => b.s === 'warning' || b.s === 'exceeded');

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Hi, {user.full_name.split(' ')[0]}</h1>
          <p className="muted">{monthLabel(month)}</p>
        </div>
        <div className="head-actions">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <button className="btn btn-primary" onClick={() => setModal(true)}>Add expense</button>
        </div>
      </header>

      {critical.map((b) => (
        <div key={b.n} className={`banner ${b.s === 'exceeded' ? 'banner-error' : 'banner-warn'}`}>
          {b.n} budget {b.s === 'exceeded' ? 'exceeded' : 'is nearing its limit'} ({b.u}% used).
        </div>
      ))}

      <section className="card hero">
        <div className="hero-top">
          <div>
            <div className="label">Spent this month</div>
            <div className="big num">{money(spentShown)}</div>
          </div>
          <div className="hero-side">
            <div><span className="label">Monthly cap</span><div className="num strong">{data.monthly_cap !== null ? money(data.monthly_cap) : '—'}</div></div>
            <div><span className="label">Remaining</span>
              <div className={`num strong ${data.remaining !== null && data.remaining < 0 ? 'neg' : ''}`}>
                {data.remaining !== null ? money(data.remaining) : '—'}
              </div></div>
          </div>
        </div>
        <BudgetMeter spent={data.total_spent} cap={data.monthly_cap} usage={data.usage_percent} status={data.status} />
      </section>

      <div className="stats">
        <div className="card stat">
          <div className="label">Income this month</div>
          <div className="big-sm num pos">{money(data.income_total)}</div>
          <Link to="/income" className="stat-link">View income</Link>
        </div>
        <div className="card stat">
          <div className="label">Net savings</div>
          <div className={`big-sm num ${data.net_savings < 0 ? 'neg' : 'pos'}`}>{data.income_total === 0 && data.total_spent === 0 ? money(0) : money(data.net_savings)}</div>
          <span className="muted small">{data.income_total === 0 ? 'Add income to see this' : data.net_savings >= 0 ? 'Income minus spending' : 'Spending is above income'}</span>
        </div>
        <div className="card stat">
          <div className="label">Transactions</div>
          <div className="big-sm num">{data.by_category.reduce((s, c) => s + c.count, 0)}</div>
          <Link to="/expenses" className="stat-link">View expenses</Link>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Where it went</h2>
          {data.by_category.length === 0 ? (
            <p className="empty">No expenses in {monthLabel(month)} yet. <button className="link" onClick={() => setModal(true)}>Add your first expense</button></p>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.by_category} dataKey="total" nameKey="category_name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                      {data.by_category.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend">
                {data.by_category.map((c, i) => (
                  <li key={c.category_id}>
                    <span className="swatch" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="legend-name">{c.category_name}</span>
                    <span className="num">{money(c.total)}</span>
                    <span className="num muted legend-pct">{Math.round((c.total / totalByCat) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Last 6 months: spent vs income</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.trend.map((t) => ({ ...t, label: shortMonth(t.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(v) => money(v)} cursor={{ fillOpacity: 0.15 }} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="total" name="Spent" fill="#4A69F0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="income" name="Income" fill="#34B07C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {data.category_budgets.length > 0 && (
        <section className="card">
          <h2>Category budgets</h2>
          <div className="cat-budgets">
            {data.category_budgets.map((b) => (
              <div key={b.budget_id} className="cat-budget">
                <div className="cat-budget-head"><strong>{b.category_name}</strong><span className="num muted">{money(b.spent)} of {money(b.budget_cap)}</span></div>
                <BudgetMeter spent={b.spent} cap={b.budget_cap} usage={b.usage_percent} status={b.status} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head"><h2>Recent expenses</h2><Link to="/expenses">View all</Link></div>
        {data.recent.length === 0 ? <p className="empty">Nothing logged for this month.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.expense_id}>
                    <td>{fmtDate(r.expense_date)}</td><td>{r.category_name}</td>
                    <td className="muted">{r.description || '—'}</td><td className="r num">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && <ExpenseModal categories={categories} onClose={() => setModal(false)} onSaved={onSaved} />}
    </>
  );
}
