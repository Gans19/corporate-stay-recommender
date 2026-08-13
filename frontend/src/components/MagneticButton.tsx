import type { ReactNode } from "react";

/**
 * Minimalist Monochrome favors stillness and instant state changes over
 * playful motion — magnetic cursor-following is exactly the kind of
 * "bouncy" interaction the system forbids. This is now a plain button with
 * an instant color-inversion hover (handled in CSS), keeping the same
 * props/API so call sites don't need to change.
 */
export function MagneticButton({
  children,
  onClick,
  disabled,
  className = "btn",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
