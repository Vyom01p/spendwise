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
export const prevMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
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
export const CHART_COLORS = ['#4A69F0', '#1FA36B', '#E39A0B', '#C84FA0', '#18A5C2', '#8A63E8', '#E5604F', '#8896A8'];
