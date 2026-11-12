// Quiet placeholder shown while data loads (a soft pulse, no shimmer gradient).
export default function Skeleton({ height = 20, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}
