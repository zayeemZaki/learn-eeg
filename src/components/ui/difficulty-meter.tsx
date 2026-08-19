interface DifficultyMeterProps {
  difficulty: number;
  className?: string;
}

/** A compact, text-labelled-by-ARIA three-step difficulty indicator. */
export function DifficultyMeter({ difficulty, className = "" }: DifficultyMeterProps) {
  const value = Math.max(0, Math.min(3, Math.round(difficulty)));

  return (
    <span
      role="img"
      aria-label={`Difficulty: ${value} of 3`}
      className={`inline-flex h-4 items-end gap-1 ${className}`}
    >
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          aria-hidden="true"
          className={`w-1.5 rounded-sm ${level <= value ? "h-4 bg-[var(--accent)]" : "h-2 bg-[var(--border)]"}`}
        />
      ))}
    </span>
  );
}
