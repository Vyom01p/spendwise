// Change these two lines to switch currency (e.g. 'USD' / 'en-US').
export const CURRENCY = 'INR';
export const LOCALE = 'en-IN';

export const money = (n) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(n ?? 0);

const pad = (n) => String(n).padStart(2, '0');

export const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
export const shortMonth = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString(LOCALE, { month: 'short' });
export const fmtDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });

export const STATUS_LABEL = {
  normal: 'On track',
  warning: 'Nearing limit',
  exceeded: 'Over budget',
  none: 'No budget set',
};

export const errMsg = (e) =>
  e?.response?.data?.message || (e?.request ? 'Cannot reach the server. Is the backend running?' : 'Something went wrong.');

// Colours for chart slices.
export const CHART_COLORS = ['#2446C9', '#1B8A5A', '#C77C02', '#B5338A', '#0F8FA8', '#7A4FD6', '#C93A2B', '#5B6B7D'];
