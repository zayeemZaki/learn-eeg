import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  /** Lift on hover — for cards that are themselves a link/tap target. */
  interactive?: boolean;
  className?: string;
}

export function Card({ children, interactive = false, className = "" }: CardProps) {
  const lift = interactive
    ? "transition-shadow duration-200 hover:shadow-sm motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5"
    : "";

  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs ${lift} ${className}`}
    >
      {children}
    </div>
  );
}
