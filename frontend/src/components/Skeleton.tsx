/** Animated placeholder cards shown while recommendations load. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="rec-card skeleton-card" key={i}>
          <div className="sk sk-line" style={{ width: "62%", height: 18 }} />
          <div className="sk sk-line" style={{ width: "38%", height: 12 }} />
          <div className="sk sk-block" style={{ height: 44 }} />
          <div className="sk sk-line" style={{ width: "80%", height: 12 }} />
          <div className="sk sk-line" style={{ width: "45%", height: 30, borderRadius: 9 }} />
        </div>
      ))}
    </div>
  );
}
