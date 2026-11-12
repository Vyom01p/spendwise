// End-to-end API check. Start the server first (npm run dev), then: npm run smoke
// Creates a throwaway user, exercises every endpoint, and reports PASS/FAIL.
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

  r = await call('PUT', '/auth/me', { full_name: 'Renamed', current_password: 'password123', new_password: 'newpassword123' });
  check('update profile + password', r.status === 200 && r.data.user.full_name === 'Renamed');
  r = await call('POST', '/auth/login', { email, password: 'newpassword123' }, false);
  check('login with new password', r.status === 200);

  console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('Could not reach the API:', e.message); process.exit(1); });
