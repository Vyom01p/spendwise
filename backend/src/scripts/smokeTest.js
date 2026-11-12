// End-to-end API check. Start the server first (npm run dev), then: npm run smoke
// Creates a throwaway user, exercises every endpoint, and reports PASS/FAIL.
const pool = require('../config/db'); // only used to promote the test user to admin
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let token = '';
let failed = 0;

async function call(method, path, body, auth = true) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  return { status: res.status, data };
}
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
  if (!cond) failed++;
}

(async () => {
  const email = `smoke_${Date.now()}@example.com`;
  const month = new Date().toISOString().slice(0, 7);
  const day = `${month}-10`;

  let r = await call('GET', '/health', null, false);
  check('health: server + database', r.status === 200 && r.data.database === 'connected');

  r = await call('POST', '/auth/register', { full_name: 'Smoke Test', email, password: 'short' }, false);
  check('register rejects short password (400)', r.status === 400);

  r = await call('POST', '/auth/register', { full_name: 'Smoke Test', email, password: 'password123' }, false);
  check('register (201 + token)', r.status === 201 && !!r.data.token);
  token = r.data.token;

  r = await call('POST', '/auth/register', { full_name: 'Smoke Test', email, password: 'password123' }, false);
  check('duplicate email rejected (409)', r.status === 409);

  r = await call('POST', '/auth/login', { email, password: 'wrongpass1' }, false);
  check('wrong password rejected (401)', r.status === 401);

  r = await call('POST', '/auth/login', { email, password: 'password123' }, false);
  check('login (200 + token)', r.status === 200 && !!r.data.token);

  r = await call('GET', '/auth/me');
  check('GET /auth/me', r.status === 200 && r.data.user.email === email);

  const noAuth = await fetch(BASE + '/expenses');
  check('protected route without token (401)', noAuth.status === 401);

  r = await call('GET', '/categories');
  check('6 default categories visible', r.status === 200 && r.data.categories.filter((c) => c.is_default).length === 6);
  const food = r.data.categories.find((c) => c.category_name === 'Food & Dining');

  r = await call('POST', '/categories', { category_name: 'Gym' });
  check('create custom category', r.status === 201);
  const gym = r.data.category;
  r = await call('POST', '/categories', { category_name: 'food & dining' });
  check('duplicate of default rejected (409)', r.status === 409);

  r = await call('PUT', '/budgets', { month_year: month, category_id: null, budget_cap: 1000 });
  check('set overall budget', r.status === 200 && r.data.overall.budget_cap === 1000);
  r = await call('PUT', '/budgets', { month_year: month, category_id: null, budget_cap: 1000 });
  r = await call('PUT', '/budgets', { month_year: month, category_id: food.category_id, budget_cap: 300 });
  check('set category budget', r.status === 200 && r.data.categories.length === 1);

  r = await call('POST', '/expenses', { category_id: food.category_id, amount: 0, expense_date: day });
  check('amount 0 rejected (400)', r.status === 400);

  r = await call('POST', '/expenses', { category_id: food.category_id, amount: 250, expense_date: day, description: 'Mess bill' });
  check('add expense (201)', r.status === 201);
  const expId = r.data.expense && r.data.expense.expense_id;
  check('category at 83% -> warning alert', r.data.alerts.some((a) => a.scope === 'Food & Dining' && a.status === 'warning'),
    JSON.stringify(r.data.alerts));

  r = await call('POST', '/expenses', { category_id: gym.category_id, amount: 800, expense_date: day, description: 'Annual pass' });
  check('overall at 105% -> exceeded alert', r.data.alerts.some((a) => a.scope === 'Overall' && a.status === 'exceeded'),
    JSON.stringify(r.data.alerts));

  r = await call('PUT', `/expenses/${expId}`, { category_id: food.category_id, amount: 100, expense_date: day, description: 'Edited' });
  check('edit expense', r.status === 200 && r.data.expense.amount === 100);

  r = await call('GET', `/expenses?search=Annual&category_id=${gym.category_id}&from=${month}-01&to=${month}-28`);
  check('filter by keyword + category + dates', r.status === 200 && r.data.expenses.length === 1 && r.data.total_amount === 800);

  r = await call('GET', '/analytics/summary');
  check('dashboard summary', r.status === 200 && r.data.total_spent === 900 && r.data.status === 'warning'
    && r.data.by_category.length === 2 && r.data.trend.length === 6, JSON.stringify(r.data).slice(0, 300));

  r = await call('DELETE', `/categories/${gym.category_id}`);
  check('cannot delete category in use (409)', r.status === 409);

  r = await call('DELETE', `/expenses/${expId}`);
  check('delete expense', r.status === 200);

  // ----- CSV export -----
  const csv = await fetch(`${BASE}/expenses/export?category_id=${gym.category_id}`, { headers: { Authorization: `Bearer ${token}` } });
  const csvText = await csv.text();
  check('CSV export', csv.status === 200 && (csv.headers.get('content-type') || '').includes('text/csv')
    && csvText.includes('Annual pass') && csvText.includes('800.00'));

  // ----- Copy budgets to another month -----
  const [yy, mm] = month.split('-').map(Number);
  const nextMonth = mm === 12 ? `${yy + 1}-01` : `${yy}-${String(mm + 1).padStart(2, '0')}`;
  r = await call('POST', '/budgets/copy', { from_month: month, to_month: nextMonth });
  check('copy budgets to next month (2 copied)', r.status === 200 && r.data.copied === 2 && r.data.overall.budget_cap === 1000, JSON.stringify(r.data).slice(0, 200));
  r = await call('POST', '/budgets/copy', { from_month: month, to_month: nextMonth });
  check('copying again does not duplicate (0 copied)', r.status === 200 && r.data.copied === 0);

  // ----- Profile picture -----
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const upload = async (bytes, name, type) => {
    const fd = new FormData();
    fd.append('avatar', new Blob([bytes], { type }), name);
    const res = await fetch(`${BASE}/auth/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  r = await upload(Buffer.from('this is not an image at all'), 'evil.png', 'image/png');
  check('fake image (text renamed .png) rejected (400)', r.status === 400);
  r = await upload(Buffer.alloc(3 * 1024 * 1024, 1), 'big.png', 'image/png');
  check('image over 2 MB rejected (400)', r.status === 400);
  r = await upload(PNG, 'me.png', 'image/png');
  check('upload real PNG', r.status === 200 && /^\/uploads\/avatars\/.+\.png$/.test(r.data.user.avatar_url), JSON.stringify(r.data));
  const avatarUrl = r.data.user && r.data.user.avatar_url;
  const img = await fetch(BASE + avatarUrl);
  check('uploaded picture is served', img.status === 200 && (img.headers.get('content-type') || '').includes('image/png'));
  r = await call('GET', '/auth/me');
  check('/auth/me includes avatar_url', r.data.user.avatar_url === avatarUrl);
  r = await call('DELETE', '/auth/avatar');
  check('remove picture', r.status === 200 && r.data.user.avatar_url === null);
  const gone = await fetch(BASE + avatarUrl);
  check('old file deleted from disk', gone.status === 404);

  // ----- Income -----
  r = await call('POST', '/income', { amount: -5, income_date: day, source: 'Allowance' });
  check('income amount must be positive (400)', r.status === 400);
  r = await call('POST', '/income', { amount: 3000, income_date: day, source: 'Allowance', notes: 'Monthly' });
  check('add income (201)', r.status === 201);
  const incId = r.data.income && r.data.income.income_id;
  r = await call('PUT', `/income/${incId}`, { amount: 3500, income_date: day, source: 'Allowance' });
  check('edit income', r.status === 200 && r.data.income.amount === 3500);
  r = await call('GET', '/income?to=2026-02-31');
  const r2 = await call('GET', '/expenses?to=2026-02-31');
  check('impossible filter date (Feb 31) gives 400, not a crash', r.status === 400 && r2.status === 400, `${r.status}/${r2.status}`);
  r = await call('GET', `/income?from=${month}-01&to=${month}-28`);
  check('list income with total', r.status === 200 && r.data.total_amount === 3500 && r.data.income.length === 1);

  // ----- Savings goals -----
  const nextYear = `${yy + 1}-${String(mm).padStart(2, '0')}-15`;
  r = await call('POST', '/goals', { name: 'Laptop', target_amount: 10000, target_date: nextYear });
  check('create goal', r.status === 201 && r.data.goal.percent === 0 && r.data.goal.monthly_needed > 0, JSON.stringify(r.data));
  const goalId = r.data.goal.goal_id;
  r = await call('POST', `/goals/${goalId}/contribute`, { amount: 2500 });
  check('add money to goal (25%)', r.status === 200 && r.data.goal.percent === 25);
  r = await call('POST', `/goals/${goalId}/contribute`, { amount: -9000 });
  check('cannot withdraw more than saved (400)', r.status === 400);
  r = await call('POST', `/goals/${goalId}/contribute`, { amount: 7500 });
  check('goal completed at 100%', r.status === 200 && r.data.goal.completed === true && r.data.goal.percent === 100);

  // ----- Recurring expenses -----
  const dd = new Date().getDate();
  const today = `${month}-${String(dd).padStart(2, '0')}`;
  r = await call('POST', '/recurring', { category_id: food.category_id, amount: 499, description: 'Netflix', day_of_month: dd, start_date: today });
  check('recurring rule due today creates an expense', r.status === 201 && r.data.added === 1, JSON.stringify(r.data));
  const ruleId = r.data.rule && r.data.rule.recurring_id;
  await call('GET', '/recurring');
  r = await call('GET', '/expenses?search=Netflix');
  check('recurring expense added exactly once', r.status === 200 && r.data.expenses.length === 1 && r.data.expenses[0].expense_date === today, JSON.stringify(r.data.expenses));
  r = await call('GET', '/recurring');
  check('rule shows next due date in the future', r.data.rules[0].next_due > today, JSON.stringify(r.data.rules[0]));
  r = await call('GET', '/analytics/summary');
  check('summary has income and net savings', r.data.income_total === 3500 && r.data.net_savings === 3500 - r.data.total_spent
    && r.data.trend[5].income === 3500, JSON.stringify(r.data).slice(0, 250));
  r = await call('DELETE', `/recurring/${ruleId}`);
  check('delete recurring rule', r.status === 200);

  // ----- Forgot / reset password -----
  r = await call('POST', '/auth/forgot', { email: 'nobody@example.com' }, false);
  const unknownMsg = r.data.message;
  check('forgot: unknown email gets the generic answer (200)', r.status === 200 && !!unknownMsg);
  r = await call('POST', '/auth/forgot', { email }, false);
  check('forgot: real email gets the identical answer', r.status === 200 && r.data.message === unknownMsg);
  r = await call('POST', '/auth/reset', { token: 'x'.repeat(64), password: 'whatever123' }, false);
  check('reset with a made-up token fails (400)', r.status === 400);

  // ----- Admin -----
  r = await call('GET', '/admin/users');
  check('normal user cannot open admin area (403)', r.status === 403);
  await pool.query("UPDATE users SET role = 'admin' WHERE email = ?", [email]);
  r = await call('GET', '/admin/stats');
  check('admin stats', r.status === 200 && r.data.users >= 1);
  r = await call('GET', `/admin/users?search=${encodeURIComponent(email)}`);
  check('admin user search', r.status === 200 && r.data.users.length === 1 && r.data.users[0].expense_count >= 1);

  const victimEmail = `victim_${Date.now()}@example.com`;
  const victim = (await call('POST', '/auth/register', { full_name: 'Victim', email: victimEmail, password: 'password123' }, false)).data;
  r = await call('PATCH', `/admin/users/${victim.user.user_id}`, { status: 'Inactive' });
  check('admin deactivates a user', r.status === 200);
  r = await call('POST', '/auth/login', { email: victimEmail, password: 'password123' }, false);
  check('deactivated user cannot log in (401)', r.status === 401);
  const stale = await fetch(BASE + '/auth/me', { headers: { Authorization: `Bearer ${victim.token}` } });
  check('deactivated user\'s old token stops working (401)', stale.status === 401);
  r = await call('PATCH', `/admin/users/${victim.user.user_id}`, { status: 'Active' });
  r = await call('DELETE', `/admin/users/${victim.user.user_id}`);
  check('admin deletes a user', r.status === 200);
  r = await call('PATCH', `/admin/users/${(await call('GET', '/auth/me')).data.user.user_id}`, { status: 'Inactive' });
  check('admin cannot deactivate themselves (400)', r.status === 400);
  r = await call('POST', '/admin/cleanup', { days: 3650 });
  check('cleanup of 10-year-inactive accounts deletes nobody', r.status === 200 && r.data.deleted === 0);

  r = await call('POST', '/admin/categories', { category_name: 'Smoke Default' });
  check('admin adds a default category', r.status === 201);
  const defId = r.data.category && r.data.category.category_id;
  r = await call('GET', '/categories');
  check('new default is visible to students', r.data.categories.some((c) => c.category_name === 'Smoke Default' && c.is_default));
  r = await call('DELETE', `/admin/categories/${defId}`);
  check('admin removes the default category', r.status === 200);

  r = await call('PUT', '/auth/me', { full_name: 'Renamed', current_password: 'password123', new_password: 'newpassword123' });
  check('update profile + password', r.status === 200 && r.data.user.full_name === 'Renamed');
  r = await call('POST', '/auth/login', { email, password: 'newpassword123' }, false);
  check('login with new password', r.status === 200);

  console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('Could not reach the API:', e.message); process.exit(1); });
