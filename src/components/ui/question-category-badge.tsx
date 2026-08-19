import { type QuestionCategory } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { QUESTION_CATEGORY_LABELS, QUESTION_CATEGORY_TONES, type QuestionCategoryTone } from "@/lib/validations/question";

const toneClass: Record<QuestionCategoryTone, string> = {
  normal: "border-[color-mix(in_srgb,var(--success)_40%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))] text-[var(--success)]",
  epileptiform: "border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] text-[var(--danger)]",
  seizure: "border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--accent-soft))] text-[color-mix(in_srgb,var(--danger)_65%,var(--accent-2))]",
  artifact: "border-[color-mix(in_srgb,var(--warning)_40%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_10%,var(--surface))] text-[var(--warning)]",
  encephalopathy: "border-[color-mix(in_srgb,var(--warning)_40%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_8%,var(--accent-soft))] text-[color-mix(in_srgb,var(--warning)_65%,var(--accent-2))]",
  focal: "border-[color-mix(in_srgb,var(--accent-2)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent-2)_10%,var(--surface))] text-[var(--accent-2)]",
  other: "border-[color-mix(in_srgb,var(--muted)_35%,var(--border))] bg-[color-mix(in_srgb,var(--muted)_8%,var(--surface))] text-[var(--muted)]",
};

/** Category label plus its token-derived visual tone — never colour alone. */
export function QuestionCategoryBadge({ category, className = "" }: { category: QuestionCategory; className?: string }) {
  return (
    <Badge tone="neutral" className={`${toneClass[QUESTION_CATEGORY_TONES[category]]} ${className}`}>
      {QUESTION_CATEGORY_LABELS[category]}
    </Badge>
  );
}
