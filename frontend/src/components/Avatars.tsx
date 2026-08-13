// Minimalist Monochrome: no colored avatars. Identity is carried by
// typographic initials in a bordered square, not color.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Overlapping bordered initials for the colleagues behind a recommendation. */
export function AvatarStack({
  names,
  total,
  max = 4,
}: {
  names: string[];
  total: number;
  max?: number;
}) {
  const shown = names.slice(0, max);
  const extra = total - shown.length;
  return (
    <div className="avatar-stack" title={names.join(", ")}>
      {shown.map((n, i) => (
        <span key={i} className="avatar" style={{ zIndex: shown.length - i }}>
          {initials(n)}
        </span>
      ))}
      {extra > 0 && (
        <span className="avatar avatar-more" style={{ zIndex: 0 }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

/** Monogram thumbnail for a hotel — bordered initials, no color, no gradient. */
export function HotelMonogram({ name }: { name: string }) {
  const mono = name.replace(/^(Hotel|The)\s+/i, "").slice(0, 2).toUpperCase();
  return (
    <div className="hotel-monogram" aria-hidden="true">
      <span>{mono}</span>
    </div>
  );
}
