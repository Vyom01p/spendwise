# 💸 Spend-Wise

A full-stack expense tracking and budgeting platform for students. Built to make managing money simpler, clearer, and less stressful.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

## 📋 Overview

Spend-Wise is a comprehensive personal finance web application designed for college and university students. It lets users log daily expenses, set monthly and per-category budgets, get early-warning alerts before overspending, track income and savings goals, and see exactly where their money goes through clear charts, all in one place.

Built with a clean REST API backend and a fully responsive React frontend, Spend-Wise delivers a calm, modern budgeting experience with light and dark modes.

## ✨ Features

### 👤 User Features

**Account Management**
- User registration and login with JWT authentication
- Forgot-password flow with an emailed, single-use reset link (valid for 30 minutes)
- Profile management: update your name, change your password, upload a profile photo
- Securely hashed passwords

**Expense Tracking**
- Add, edit and delete expenses with amount, category, date and description
- Search by keyword and filter by category and date range
- Pagination for long histories
- Export your expenses to CSV (respects the current filters)
- Live hint while adding an expense showing how much is left in the chosen category

**Categories**
- Six built-in categories: Food & Dining, Transport, Books & Supplies, Rent & Utilities, Entertainment, Miscellaneous
- Create, rename and delete your own custom categories
- Categories that still have expenses are protected from deletion

**Budgets & Alerts**
- Set an overall monthly spending cap
- Give any category its own optional limit, or skip it
- Copy last month's budgets into the current month with one click
- Automatic status for every budget:

| Usage | Status |
|---|---|
| Below 80% | 🟢 On track |
| 80% to 99% | 🟠 Nearing limit |
| 100% or more | 🔴 Over budget |

- Instant alert notifications whenever a new expense pushes a budget into warning or exceeded

**Income**
- Record allowance, salary, scholarships, freelance work and more
- Dashboard shows income and net savings for the month

**Recurring Expenses**
- Add rent, subscriptions or recharges once and they are added automatically on their day every month
- Never duplicated, even if you open the app many times
- Pause, resume, edit or delete any rule

**Savings Goals**
- Create goals with a target amount and optional deadline
- Add money to, or take money out of, a goal at any time
- Progress bar and a "save about X a month" suggestion
- Goal-reached celebration at 100%

**Dashboard**
- Spent this month, monthly cap, remaining balance and a colour-coded budget meter
- Income, net savings and transaction count
- Donut chart of spending by category
- Six-month chart comparing spending and income
- Category budget progress and recent expenses at a glance

**Interface**
- Light and dark mode with a smooth switch
- Collapsible sidebar (slide-over drawer on phones)
- Gentle page transitions and animated progress bars
- Fully responsive, with reduced-motion support

### 🛡️ Admin Features
- User list with search, expense counts and last-login dates
- Activate, deactivate or delete user accounts
- Clean up accounts that have been inactive for a chosen number of days
- Manage the default categories shared by all students
- Deactivated users are locked out immediately, even if their login token has not expired

## 🛠️ Tech Stack

### Frontend
- **React 18**: component-based UI
- **Vite**: fast dev server and build tool
- **React Router**: client-side routing
- **Axios**: HTTP client
- **Recharts**: charts and data visualisation
- **Plain CSS** with theme variables for light and dark mode

### Backend
- **Node.js**: JavaScript runtime
- **Express.js 5**: web framework
- **MySQL 8**: relational database (via `mysql2`)
- **JWT** (`jsonwebtoken`): secure authentication
- **bcryptjs**: password hashing
- **express-validator**: request validation
- **Multer**: profile photo uploads
- **Nodemailer**: password-reset emails
- **Helmet, CORS, express-rate-limit, Morgan**: security and logging

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL 8.0.16 or higher (needed for CHECK constraints)
- npm

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/<your-username>/spendwise.git
cd spendwise
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

**4. Environment configuration**

Create a `.env` file in the `backend` directory (copy `.env.example`):

```env
# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=spendwise

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d

# Email for password reset (optional)
# Leave SMTP_HOST empty in development: the reset link is printed in the backend terminal instead.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Spend-Wise <no-reply@example.com>"
```

Generate a strong secret with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

The frontend needs no `.env` in development. For production, set `VITE_API_URL=https://your-api-domain/api` before building.

**5. Set up the database**

```bash
cd backend
npm run db:init
```

This creates the database, all tables and the default categories. It is safe to run again, and it upgrades older databases without losing data.

**6. Start the application**

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** and create an account.

### Optional: demo data and admin access

```bash
cd backend
npm run seed                              # sample data for demos
npm run make-admin -- you@example.com     # promote your own account to admin
```

The seed script creates `demo@spendwise.com` / `demo12345` (student) and `admin@spendwise.com` / `admin12345` (admin). Use it for local development only.

### Available Scripts

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | backend / frontend | Start with auto-reload |
| `npm start` | backend | Start in production mode |
| `npm run db:init` | backend | Create or upgrade the database |
| `npm run seed` | backend | Load demo data |
| `npm run make-admin -- <email>` | backend | Make a user an admin |
| `npm run smoke` | backend | Run the end-to-end API checks (server must be running) |
| `npm run build` | frontend | Production build |

## 📁 Project Structure

```
spendwise/
│
├── database/
│   └── schema.sql                # Tables, constraints, default categories
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Layout, Avatar, BudgetMeter, ExpenseModal, Modal, Toast...
│   │   ├── pages/                # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Income.jsx
│   │   │   ├── Budgets.jsx
│   │   │   ├── Recurring.jsx
│   │   │   ├── Goals.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Admin.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── context/              # Auth context
│   │   ├── api.js                # Axios instance (adds JWT, handles 401)
│   │   ├── hooks.js              # Animation hooks
│   │   ├── utils.js              # Formatting helpers
│   │   ├── styles.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/               # Database connection pool
│   │   ├── controllers/          # Route controllers
│   │   │   ├── authController.js
│   │   │   ├── categoryController.js
│   │   │   ├── expenseController.js
│   │   │   ├── incomeController.js
│   │   │   ├── budgetController.js
│   │   │   ├── recurringController.js
│   │   │   ├── goalController.js
│   │   │   ├── analyticsController.js
│   │   │   └── adminController.js
│   │   ├── routes/               # API routes
│   │   ├── middleware/           # Auth, admin, validation, recurring expenses
│   │   ├── services/             # Budget logic, recurring logic, mailer
│   │   ├── scripts/              # db init, seed, admin, smoke tests
│   │   ├── app.js
│   │   └── server.js
│   ├── uploads/                  # Profile photos (git-ignored)
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🗄️ Database

| Table | Purpose |
|---|---|
| `users` | Accounts, roles, status, last login, profile photo |
| `categories` | Default (shared) and custom (per-user) categories |
| `expenses` | Every logged expense |
| `budgets` | Monthly overall and per-category limits |
| `income` | Money coming in |
| `goals` | Savings goals and progress |
| `recurring_expenses` | Rules for monthly repeating expenses |
| `password_resets` | Hashed, expiring password-reset tokens |

Relationships use foreign keys with cascading deletes, so removing a user removes all of their data, and a category that is still in use cannot be deleted.

## 🔌 API Endpoints

All endpoints except authentication and health need an `Authorization: Bearer <token>` header.

### Authentication
```
POST   /api/auth/register         # Register new user
POST   /api/auth/login            # Login
GET    /api/auth/me               # Current user
PUT    /api/auth/me               # Update name / password
POST   /api/auth/avatar           # Upload profile photo
DELETE /api/auth/avatar           # Remove profile photo
POST   /api/auth/forgot           # Request a password-reset link
POST   /api/auth/reset            # Set a new password with the token
```

### Expenses
```
GET    /api/expenses              # List (filters: from, to, category_id, search, page, limit)
GET    /api/expenses/export       # Download as CSV
POST   /api/expenses              # Add expense (returns budget alerts)
PUT    /api/expenses/:id          # Update expense
DELETE /api/expenses/:id          # Delete expense
```

### Categories
```
GET    /api/categories            # Defaults + your custom categories
POST   /api/categories            # Create custom category
PUT    /api/categories/:id        # Rename
DELETE /api/categories/:id        # Delete
```

### Budgets
```
GET    /api/budgets?month=YYYY-MM # Overall and category budgets with usage and status
PUT    /api/budgets               # Create or update a budget
POST   /api/budgets/copy          # Copy budgets from another month
DELETE /api/budgets/:id           # Remove a budget
```

### Income
```
GET    /api/income                # List income
POST   /api/income                # Add income
PUT    /api/income/:id            # Update income
DELETE /api/income/:id            # Delete income
```

### Recurring Expenses
```
GET    /api/recurring             # List rules with next due date
POST   /api/recurring             # Create rule
PUT    /api/recurring/:id         # Update, pause or resume
DELETE /api/recurring/:id         # Delete rule
```

### Savings Goals
```
GET    /api/goals                       # List goals with progress
POST   /api/goals                       # Create goal
PUT    /api/goals/:id                   # Update goal
POST   /api/goals/:id/contribute        # Add (or take out) money
DELETE /api/goals/:id                   # Delete goal
```

### Analytics
```
GET    /api/analytics/summary?month=YYYY-MM   # Everything the dashboard needs
```

### Admin (admin accounts only)
```
GET    /api/admin/stats                 # Totals
GET    /api/admin/users                 # List and search users
PATCH  /api/admin/users/:id             # Activate / deactivate
DELETE /api/admin/users/:id             # Delete user and their data
POST   /api/admin/cleanup               # Delete accounts inactive for N days
GET    /api/admin/categories            # Default categories
POST   /api/admin/categories            # Add default category
PUT    /api/admin/categories/:id        # Rename default category
DELETE /api/admin/categories/:id        # Delete default category
```

### Health
```
GET    /api/health                      # Server and database check
```

## 🔒 Security Features

- **JWT Authentication**: secure token-based sessions
- **Password Hashing**: bcrypt with salting
- **Live Account Checks**: every request re-verifies the account, so deactivated or deleted users are locked out immediately
- **Protected Routes**: auth middleware on all private endpoints, plus an admin-only guard
- **SQL Injection Protection**: every query uses parameterised statements
- **Input Validation**: server-side validation on all request bodies and query parameters
- **Rate Limiting**: login, registration and password-reset endpoints are throttled
- **Safe Password Reset**: tokens are random, stored only as hashes, single-use and expire in 30 minutes; the API never reveals whether an email is registered
- **Safe Uploads**: profile photos are checked by their real file signature, limited to 2 MB and stored under random names
- **CSV Injection Guard**: exported cells that start with formula characters are neutralised
- **Secure Headers & CORS**: Helmet, and CORS limited to the frontend origin
- **Environment Variables**: secrets are kept out of source code

## 🧪 Testing

With the backend running, `npm run smoke` runs more than 60 automated end-to-end checks covering authentication, validation, budgets and alerts, income, goals, recurring expenses, password reset, uploads, CSV export and the admin area.

## 🩹 Troubleshooting

| Problem | Fix |
|---|---|
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` in `backend/.env` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL is not running. Start the MySQL service |
| `Unknown database 'spendwise'` or `Unknown column` | Run `npm run db:init` in `backend` |
| `JWT_SECRET is missing` | Create `backend/.env` from `.env.example` |
| Frontend says "Cannot reach the server" | The backend is not running |
| Reset email never arrives | In development the link is printed in the backend terminal. Set `SMTP_*` to send real email |

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [React](https://react.dev) and [Vite](https://vitejs.dev) for the frontend foundation
- [Recharts](https://recharts.org) for the charts
- [Express](https://expressjs.com) and [MySQL](https://www.mysql.com) for the backend and data layer
- The open-source community for the amazing tools that made this possible
