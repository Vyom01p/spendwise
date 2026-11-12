import { Link } from 'react-router-dom';
import { money, STATUS_LABEL } from '../utils.js';
import { useGrow } from '../hooks.js';

// Spent vs cap, coloured by SRS status (80% / 100%). The bar grows in when it appears.
export default function BudgetMeter({ spent, cap, usage, status, compact = false }) {
  const width = useGrow(Math.min(usage ?? 0, 100));
  if (cap === null || cap === undefined) {
    return (
      <div className="meter-empty">
        <span>No monthly budget set.</span> <Link to="/budgets">Set a budget</Link>
      </div>
    );
  }
  return (
    <div className={`meter ${compact ? 'meter-compact' : ''}`}>
      <div className="meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100}
           aria-valuenow={Math.round(usage ?? 0)} aria-label="Budget used">
        <div className={`meter-fill s-${status}`} style={{ width: `${width}%` }} />
        <span className="meter-mark" style={{ left: '80%' }} title="80% warning point" />
      </div>
      <div className="meter-legend">
        <span className={`pill s-${status}`}>{STATUS_LABEL[status]}</span>
        <span className="num">{usage}% of {money(cap)} used</span>
        {!compact && <span className="num muted">({money(spent)} spent)</span>}
      </div>
    </div>
  );
}
