const pool = require('../config/db');
const { currentMonth, monthRange, getBudgetStatus } = require('../services/budgetService');

// Month string n months before `month` ('2026-11', 5 -> '2026-06')
function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/analytics/summary?month=YYYY-MM
// One call powers the whole dashboard.
exports.summary = async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const { start, end } = monthRange(month);
    const userId = req.user.id;

    // Spending per category (pie / donut chart)
    const [byCategory] = await pool.query(
      `SELECT c.category_id, c.category_name, SUM(e.amount) AS total, COUNT(*) AS count
       FROM expenses e JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date < ?
       GROUP BY c.category_id, c.category_name
       ORDER BY total DESC`,
      [userId, start, end]
    );

    // Recent transactions in this month
    const [recent] = await pool.query(
      `SELECT e.expense_id, c.category_name, e.amount, e.expense_date, e.description
       FROM expenses e JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date < ?
       ORDER BY e.expense_date DESC, e.expense_id DESC LIMIT 5`,
      [userId, start, end]
    );

    // Last 6 months trend (bar chart)
    const firstMonth = shiftMonth(month, -5);
    const [trendRows] = await pool.query(
      `SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month, SUM(amount) AS total
       FROM expenses
       WHERE user_id = ? AND expense_date >= ? AND expense_date < ?
       GROUP BY month`,
      [userId, `${firstMonth}-01`, end]
    );
    const trend = [];
    for (let i = -5; i <= 0; i++) {
      const mo = shiftMonth(month, i);
      const row = trendRows.find((r) => r.month === mo);
      trend.push({ month: mo, total: row ? Number(row.total) : 0 });
    }

    const budget = await getBudgetStatus(userId, month);

    res.json({
      month,
      total_spent: budget.total_spent,
      monthly_cap: budget.overall.budget_cap,
      remaining: budget.overall.remaining,
      usage_percent: budget.overall.usage_percent,
      status: budget.overall.status,
      category_budgets: budget.categories,
      by_category: byCategory.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        total: Number(r.total),
        count: r.count,
      })),
      recent,
      trend,
    });
  } catch (err) {
    next(err);
  }
};
