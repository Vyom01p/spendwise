const pool = require('../config/db');

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function nextMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${pad(mo + 1)}`;
}
// Day 31 in a 30-day month becomes the last day of that month.
function dueDate(month, day) {
  const [y, mo] = month.split('-').map(Number);
  const last = new Date(y, mo, 0).getDate();
  return `${month}-${pad(Math.min(day, last))}`;
}

function nextDue(rule, todayStr = fmt(new Date())) {
  let m = todayStr.slice(0, 7);
  for (let i = 0; i < 3; i++) {
    const due = dueDate(m, rule.day_of_month);
    const generated = rule.last_generated_month && rule.last_generated_month >= m;
    if (due >= todayStr && due >= rule.start_date && !generated) return due;
    m = nextMonth(m);
  }
  return null;
}

const lastRun = new Map(); // userId -> timestamp, so busy pages don't re-check every request

/**
 * Creates the expenses for every recurring rule that is due (today or earlier) and
 * hasn't been created yet. Safe to call repeatedly: each month is "claimed" with an
 * atomic UPDATE, so the same month can never be added twice.
 */
async function runRecurring(userId, { force = false } = {}) {
  if (!force && Date.now() - (lastRun.get(userId) || 0) < 15000) return 0;
  lastRun.set(userId, Date.now());

  const [rules] = await pool.query(
    'SELECT * FROM recurring_expenses WHERE user_id = ? AND is_active = TRUE', [userId]
  );
  const todayStr = fmt(new Date());
  const thisMonth = todayStr.slice(0, 7);
  let created = 0;

  for (const r of rules) {
    const startMonth = r.start_date.slice(0, 7);
    let m = r.last_generated_month ? nextMonth(r.last_generated_month) : startMonth;
    if (m < startMonth) m = startMonth;
    for (let guard = 0; m <= thisMonth && guard < 60; guard++, m = nextMonth(m)) {
      const due = dueDate(m, r.day_of_month);
      if (due > todayStr) break;       // not due yet
      if (due < r.start_date) continue; // rule started after this month's due day
      const [claim] = await pool.query(
        `UPDATE recurring_expenses SET last_generated_month = ?
         WHERE recurring_id = ? AND (last_generated_month IS NULL OR last_generated_month < ?)`,
        [m, r.recurring_id, m]
      );
      if (claim.affectedRows === 1) {
        await pool.query(
          'INSERT INTO expenses (user_id, category_id, amount, expense_date, description) VALUES (?, ?, ?, ?, ?)',
          [userId, r.category_id, r.amount, due, r.description || 'Recurring expense']
        );
        created++;
      }
    }
  }
  return created;
}

module.exports = { runRecurring, nextDue, fmt };
