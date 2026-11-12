const pool = require('../config/db');
const { currentMonth, monthRange, getBudgetStatus } = require('../services/budgetService');

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/analytics/summary?month=YYYY-MM  -> everything the dashboard needs in one call
exports.summary = async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const { start, end } = monthRange(month);
    const userId = req.user.id;

    const [byCategory] = await pool.query(
      `SELECT c.category_id, c.category_name, SUM(e.amount) AS total, COUNT(*) AS count
       FROM expenses e JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date < ?
       GROUP BY c.category_id, c.category_name ORDER BY total DESC`,
      [userId, start, end]);

    const [recent] = await pool.query(
      `SELECT e.expense_id, c.category_name, e.amount, e.expense_date, e.description
       FROM expenses e JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date < ?
       ORDER BY e.expense_date DESC, e.expense_id DESC LIMIT 5`,
      [userId, start, end]);

    const [[{ income_total }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS income_total FROM income
       WHERE user_id = ? AND income_date >= ? AND income_date < ?`, [userId, start, end]);

    // Last 6 months: spent and income
    const firstMonth = shiftMonth(month, -5);
    const [spentRows] = await pool.query(
      `SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month, SUM(amount) AS total FROM expenses
       WHERE user_id = ? AND expense_date >= ? AND expense_date < ? GROUP BY month`,
      [userId, `${firstMonth}-01`, end]);
    const [incomeRows] = await pool.query(
      `SELECT DATE_FORMAT(income_date, '%Y-%m') AS month, SUM(amount) AS total FROM income
       WHERE user_id = ? AND income_date >= ? AND income_date < ? GROUP BY month`,
      [userId, `${firstMonth}-01`, end]);
    const trend = [];
    for (let i = -5; i <= 0; i++) {
      const mo = shiftMonth(month, i);
      const s = spentRows.find((r) => r.month === mo);
      const inc = incomeRows.find((r) => r.month === mo);
      trend.push({ month: mo, total: s ? Number(s.total) : 0, income: inc ? Number(inc.total) : 0 });
    }

    const budget = await getBudgetStatus(userId, month);
    const income = Number(income_total);

    res.json({
      month,
      total_spent: budget.total_spent,
      income_total: income,
      net_savings: Math.round((income - budget.total_spent) * 100) / 100,
      monthly_cap: budget.overall.budget_cap,
      remaining: budget.overall.remaining,
      usage_percent: budget.overall.usage_percent,
      status: budget.overall.status,
      category_budgets: budget.categories,
      by_category: byCategory.map((r) => ({
        category_id: r.category_id, category_name: r.category_name, total: Number(r.total), count: r.count,
      })),
      recent,
      trend,
    });
  } catch (err) {
    next(err);
  }
};
