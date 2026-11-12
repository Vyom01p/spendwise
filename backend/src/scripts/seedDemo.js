// Optional: creates a demo account with sample budgets and expenses.
// Login afterwards with  demo@spendwise.com / demo12345   (student)
//                        admin@spendwise.com / admin12345 (admin)
// For local development only. Never run this on a real deployment.
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { currentMonth } = require('../services/budgetService');

const pad = (n) => String(n).padStart(2, '0');
const ym = (offset) => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

(async () => {
  try {
    const email = 'demo@spendwise.com';
    await pool.query('DELETE FROM users WHERE email = ?', [email]); // cascades to all demo data
    const hash = await bcrypt.hash('demo12345', 10);
    const [u] = await pool.query('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)', ['Demo Student', email, hash]);
    const uid = u.insertId;

    const [cats] = await pool.query('SELECT category_id, category_name FROM categories WHERE user_id IS NULL');
    const id = (name) => cats.find((c) => c.category_name === name).category_id;

    const sample = [
      ['Food & Dining', [120, 85, 240, 60, 310, 95, 150]],
      ['Transport', [40, 25, 60, 30]],
      ['Books & Supplies', [450, 220]],
      ['Rent & Utilities', [3500]],
      ['Entertainment', [199, 350, 120]],
      ['Miscellaneous', [80, 150]],
    ];
    const notes = ['Mess bill', 'Canteen', 'Auto fare', 'Notebook', 'Movie night', 'Groceries', 'Recharge'];
    let n = 0;
    for (const offset of [-2, -1, 0]) {
      const scale = offset === 0 ? 1 : 0.8 + Math.random() * 0.4;
      for (const [cat, amounts] of sample) {
        for (const amt of amounts) {
          const day = pad(1 + ((n * 3) % (offset === 0 ? Math.min(new Date().getDate(), 28) : 27)));
          await pool.query(
            'INSERT INTO expenses (user_id, category_id, amount, expense_date, description) VALUES (?, ?, ?, ?, ?)',
            [uid, id(cat), Math.round(amt * scale), `${ym(offset)}-${day}`, notes[n % notes.length]]
          );
          n++;
        }
      }
    }
    const month = currentMonth();
    await pool.query('INSERT INTO budgets (user_id, category_id, month_year, budget_cap) VALUES (?, NULL, ?, 6500)', [uid, month]);
    await pool.query('INSERT INTO budgets (user_id, category_id, month_year, budget_cap) VALUES (?, ?, ?, 1200)', [uid, id('Food & Dining'), month]);
    await pool.query('INSERT INTO budgets (user_id, category_id, month_year, budget_cap) VALUES (?, ?, ?, 600)', [uid, id('Entertainment'), month]);
    // Income for the last 3 months
    for (const offset of [-2, -1, 0]) {
      await pool.query('INSERT INTO income (user_id, amount, income_date, source, notes) VALUES (?, 6000, ?, ?, ?)', [uid, `${ym(offset)}-02`, 'Allowance', 'Monthly allowance']);
      if (offset !== -1) await pool.query('INSERT INTO income (user_id, amount, income_date, source) VALUES (?, 1500, ?, ?)', [uid, `${ym(offset)}-15`, 'Freelance']);
    }
    // Savings goals
    const nextYear = `${new Date().getFullYear() + 1}-03-31`;
    await pool.query('INSERT INTO goals (user_id, name, target_amount, saved_amount, target_date) VALUES (?, ?, ?, ?, ?)', [uid, 'New laptop', 45000, 12500, nextYear]);
    await pool.query('INSERT INTO goals (user_id, name, target_amount, saved_amount) VALUES (?, ?, ?, ?)', [uid, 'Emergency fund', 10000, 10000]);
    // A recurring subscription (starts this month; added automatically once its day arrives)
    await pool.query(
      'INSERT INTO recurring_expenses (user_id, category_id, amount, description, day_of_month, start_date) VALUES (?, ?, 199, ?, 5, ?)',
      [uid, id('Entertainment'), 'Streaming subscription', `${ym(0)}-01`]);

    // Admin account
    await pool.query('DELETE FROM users WHERE email = ?', ['admin@spendwise.com']);
    await pool.query("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ['Site Admin', 'admin@spendwise.com', await bcrypt.hash('admin12345', 10)]);

    console.log(`Demo data created (${n} expenses). Login: ${email} / demo12345\nAdmin login: admin@spendwise.com / admin12345`);
  } catch (e) {
    console.error('Seeding failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
