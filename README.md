# Spend-Wise: Personal Expense Tracker

A full-stack web app for students to log daily expenses, set monthly budgets, get early-warning alerts,
and see spending patterns in charts. Built to the project's SRS, ER diagram and DFDs.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, Recharts, plain CSS |
| Backend | Node.js, Express 5, mysql2, JWT (jsonwebtoken), bcryptjs, express-validator, helmet, cors, express-rate-limit |
| Database | MySQL 8.0.16+ |

## New in v3

**Look and feel:** gentle page and card transitions, bars and numbers that animate in, a smooth light/dark switch (top bar), icons in the sidebar, soft shadows. No gradients, no neon. Motion switches off automatically for people who prefer reduced motion.

**Features**
- **Income:** record allowance, salary, scholarships. The dashboard shows income, net savings, and spent-vs-income for 6 months.
- **Savings goals:** target, deadline, add/take out money, "save about X a month" hint.
- **Recurring expenses:** rent, subscriptions and so on are added automatically on their day each month (never twice). Pause, edit or delete any time.
- **Forgot password:** emailed link, valid 30 minutes, single use.
- **Admin panel:** user list/search, activate/deactivate, delete, clean up long-inactive accounts, manage default categories.
- Also from v2: per-category limits (leave empty or **Skip** for no limit), copy last month's budgets, collapsible sidebar, profile photo, CSV export, remaining-in-category hint.

**Bug fixed:** an impossible filter date such as `2026-02-31` used to cause a server error. It now returns a clear message.

### Upgrading from v1 or v2

```powershell
# 1. Stop both servers (Ctrl+C)
# 2. Extract this zip over your existing folder (your .env, uploads and node_modules are not touched)
cd backend
npm install          # installs multer and nodemailer
npm run db:init      # adds the new tables/columns. Your data is kept
npm run dev
```
The frontend needs no new packages: `npm run dev` again.

### Making yourself an admin

Register normally, then run in `backend`:
```powershell
npm run make-admin -- you@example.com
```
Log out and back in; an **Admin** link appears in the sidebar. (For a quick demo, `npm run seed` also creates `admin@spendwise.com` / `admin12345`. Never use that on a real deployment.)

### Forgot-password emails

- **Development (default):** leave the `SMTP_*` lines in `backend/.env` empty. When someone clicks "Forgot password", the reset link is **printed in the backend terminal**. Copy it into the browser.
- **Real emails:** fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. For Gmail: `smtp.gmail.com`, port `587`, your address, and an **App Password** (Google Account → Security → 2-Step Verification → App passwords), not your normal password. Also set `CLIENT_URL` to where your site is hosted so the link points to the right place.

## 1. What to install first

| Tool | Version | Check with |
|---|---|---|
| Node.js (includes npm) | 18 or newer (22 tested) | `node -v` |
| MySQL Community Server | 8.0.16 or newer (needed for CHECK constraints) | `mysql --version` |

Optional: MySQL Workbench (GUI), VS Code, Thunder Client / Postman.
During MySQL installation you set a password for the `root` user. Remember it.

## 2. Setup (one time)

### Step A: Backend

```bash
cd backend
npm install
```

Create your environment file:

```bash
# Windows (PowerShell / CMD):  copy .env.example .env
# macOS / Linux:               cp .env.example .env
```

Open `backend/.env` and set:
- `DB_PASSWORD`: your MySQL root password
- `JWT_SECRET`: any long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Create the database, tables and default categories (one command, safe to re-run):

```bash
npm run db:init
```

### Step B: Frontend

```bash
cd ../frontend
npm install
```

No `.env` is needed in development.

## 3. Run the app (two terminals)

```bash
# Terminal 1: API on http://localhost:5000
cd backend
npm run dev

# Terminal 2: website on http://localhost:5173
cd frontend
npm run dev
```

Open **http://localhost:5173**, register an account, and start adding expenses.

Optional demo data (sample expenses, budgets in warning/exceeded state, good for screenshots):

```bash
cd backend
npm run seed        # student: demo@spendwise.com / demo12345   admin: admin@spendwise.com / admin12345
```

Optional automatic API test (server must be running): `npm run smoke` (60+ checks).

## 4. Project structure

```
spendwise/
├── database/schema.sql            Tables, constraints, default categories
├── backend/
│   ├── .env.example               Copy to .env
│   └── src/
│       ├── server.js, app.js      Startup, middleware, route mounting
│       ├── config/db.js           MySQL connection pool
│       ├── middleware/            auth.js (JWT check), validate.js
│       ├── routes/                auth, categories, expenses, budgets, analytics
│       ├── controllers/           Request handlers (SQL lives here)
│       ├── services/budgetService.js   Budget usage % and alert logic
│       └── scripts/               initDb.js, seedDemo.js, smokeTest.js
└── frontend/
    ├── vite.config.js             Dev server + /api proxy to backend
    └── src/
        ├── api.js                 Axios instance (adds JWT, handles 401)
        ├── context/AuthContext.jsx  Login state
        ├── components/            Layout, ExpenseModal, BudgetMeter, Toast
        ├── pages/                 Login, Register, Dashboard, Expenses, Budgets, Categories, Profile
        └── styles.css
```

## 5. How the SRS maps to the code

| SRS requirement | Where |
|---|---|
| Register / login, bcrypt, JWT, session restore | `authController.js`, `AuthContext.jsx` |
| Expense CRUD, validation (amount > 0), date filters, search | `expenseController.js`, `ExpenseModal.jsx`, `Expenses.jsx` |
| Default + custom categories | `categoryController.js`, `Categories.jsx` |
| Monthly budget + per-category caps | `budgetController.js`, `Budgets.jsx` |
| Normal < 80%, Warning 80-99%, Exceeded 100%+ | `budgetService.js` (`statusFor`) |
| Alerts when an expense is saved | `getAlerts()` returned by POST/PUT `/expenses`, shown as toasts |
| Pie chart + 6-month trend + remaining balance | `analyticsController.js`, `Dashboard.jsx` |
| SQL injection protection | Every query uses `?` placeholders |
| Foreign-key cascades | `schema.sql` (ON DELETE CASCADE / RESTRICT) |

## 6. API reference (all except auth need `Authorization: Bearer <token>`)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account, returns token |
| POST | `/api/auth/login` | Log in, returns token |
| GET / PUT | `/api/auth/me` | Get / update profile and password |
| GET | `/api/categories` | Defaults + your custom categories |
| POST / PUT / DELETE | `/api/categories[/:id]` | Manage custom categories |
| GET | `/api/expenses?from=&to=&category_id=&search=&page=&limit=` | List with filters |
| POST / PUT / DELETE | `/api/expenses[/:id]` | Manage expenses (POST/PUT also return `alerts`) |
| GET | `/api/budgets?month=YYYY-MM` | Overall + category caps with usage % and status |
| PUT | `/api/budgets` | `{month_year, category_id (null = overall), budget_cap}`: create or update |
| DELETE | `/api/budgets/:id` | Remove a budget |
| GET | `/api/analytics/summary?month=YYYY-MM` | Everything the dashboard needs |
| GET / POST / PUT / DELETE | `/api/income[/:id]` | Income entries (list takes `from`, `to`, `search`, `page`) |
| GET / POST / PUT / DELETE | `/api/goals[/:id]` | Savings goals; `POST /api/goals/:id/contribute {amount}` adds (or with a negative amount, removes) money |
| GET / POST / PUT / DELETE | `/api/recurring[/:id]` | Recurring expenses |
| POST | `/api/auth/forgot`, `/api/auth/reset` | Request a reset link / set a new password with the token |
| * | `/api/admin/...` | Admin only: `stats`, `users`, `users/:id` (PATCH status, DELETE), `cleanup`, `categories` |
| POST | `/api/budgets/copy` | `{from_month, to_month}`: copy budgets into another month (keeps existing ones) |
| GET | `/api/expenses/export` | Download expenses as CSV (same filters as the list) |
| POST / DELETE | `/api/auth/avatar` | Upload (`multipart`, field `avatar`) / remove profile photo |
| GET | `/api/health` | Server + database check |

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` in `backend/.env` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL isn't running. Start the MySQL service |
| `Client does not support authentication protocol` | Run in MySQL: `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourpassword';` |
| `Unknown database 'spendwise'` | Run `npm run db:init` in `backend` |
| `JWT_SECRET is missing` | You haven't created `backend/.env` |
| Port 5000 already in use (common on macOS) | Change `PORT` in `backend/.env` **and** the proxy target in `frontend/vite.config.js` |
| Frontend shows "Cannot reach the server" | Backend isn't running, or crashed. Check Terminal 1 |
| CHECK constraint ignored | MySQL older than 8.0.16. Upgrade MySQL |

## 8. Deploying (outline)

1. Build the frontend: `cd frontend && npm run build` produces `dist/`. Host it on Netlify / Vercel / any static host.
2. Set `VITE_API_URL=https://your-api-domain/api` **before** building.
3. Host the backend (Render, Railway, a VPS) with a managed MySQL. Set the same variables as `.env`, and set
   `CLIENT_URL` to your frontend's URL. Use a strong `JWT_SECRET` and serve everything over HTTPS.

## 9. Notes and design decisions

- `category_name` is unique **per user** (the SRS says globally unique, which would stop two students from both creating "Gym").
- One overall cap per month is enforced in code, because MySQL unique keys allow duplicate NULLs.
- Income, goals, recurring expenses and password reset go beyond the original SRS/ER diagram, so add them to your documentation if you submit this for a course.
- Every request re-checks the account in the database, so deactivating or deleting a user locks them out immediately, even if their login token hasn't expired.
- Recurring expenses are created when you open the app (not by a background timer), using the server's clock. Each month is claimed atomically, so it can never be added twice.
- Profile photos are saved in `backend/uploads/avatars/` (git-ignored). The server checks the real file signature, not just the file name, and renames every upload. On hosts with temporary disks (Render/Heroku free tiers) use cloud storage instead.
- The JWT is kept in `localStorage` for simplicity. For higher security, move it to an httpOnly cookie.
- Currency defaults to INR. Change `CURRENCY` / `LOCALE` at the top of `frontend/src/utils.js`.
