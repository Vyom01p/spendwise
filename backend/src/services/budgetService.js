const pool = require('../config/db');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// '2026-11' -> { start: '2026-11-01', end: '2026-12-01' }  (end is exclusive)
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return {
    start: `${month}-01`,
    end: `${ny}-${String(nm).padStart(2, '0')}-01`,
  };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// SRS 3.1.3: Normal < 80%, Warning 80-<100%, Exceeded >= 100%
function statusFor(usage) {
  if (usage === null) return 'none';
  if (usage >= 100) return 'exceeded';
  if (usage >= 80) return 'warning';
  return 'normal';
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Budget health for one user and month: overall cap + every per-category cap,
 * each with spent, usage percentage and status.
 */
async function getBudgetStatus(userId, month) {
  const { start, end } = monthRange(month);

  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
     WHERE user_id = ? AND expense_date >= ? AND expense_date < ?`,
    [userId, start, end]
  );

  const [rows] = await pool.query(
    `SELECT b.budget_id, b.category_id, b.budget_cap, c.category_name,
            COALESCE((SELECT SUM(e.amount) FROM expenses e
                      WHERE e.user_id = b.user_id AND e.category_id = b.category_id
                        AND e.expense_date >= ? AND e.expense_date < ?), 0) AS cat_spent
     FROM budgets b
     LEFT JOIN categories c ON c.category_id = b.category_id
     WHERE b.user_id = ? AND b.month_year = ?`,
    [start, end, userId, month]
  );

  const build = (row, spent) => {
    const cap = row ? Number(row.budget_cap) : null;
    const usage = cap ? round2((spent / cap) * 100) : null;
    return {
      budget_id: row ? row.budget_id : null,
      category_id: row ? row.category_id : null,
      category_name: row && row.category_name ? row.category_name : 'Overall',
      budget_cap: cap,
      spent: round2(spent),
      remaining: cap !== null ? round2(cap - spent) : null,
      usage_percent: usage,
      status: statusFor(usage),
    };
  };

  const overallRow = rows.find((r) => r.category_id === null);
  const overall = build(overallRow, Number(total));
  const categories = rows
    .filter((r) => r.category_id !== null)
    .map((r) => build(r, Number(r.cat_spent)));

  return { month, total_spent: round2(Number(total)), overall, categories };
}

// Alerts shown right after an expense is saved (warning / exceeded only).
async function getAlerts(userId, month) {
  const s = await getBudgetStatus(userId, month);
  return [s.overall, ...s.categories]
    .filter((b) => b.status === 'warning' || b.status === 'exceeded')
    .map((b) => ({
      scope: b.category_name,
      status: b.status,
      usage_percent: b.usage_percent,
      message:
        b.status === 'exceeded'
          ? `${b.category_name} budget exceeded (${b.usage_percent}% used)`
          : `${b.category_name} budget is at ${b.usage_percent}%`,
    }));
}

module.exports = { MONTH_RE, monthRange, currentMonth, statusFor, getBudgetStatus, getAlerts };
