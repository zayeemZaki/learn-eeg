/**
 * The shared result shape for server actions.
 *
 * Every action in this directory reports the same way — success, or a failure with
 * a human-readable message the caller can render verbatim. It lived in four
 * separate files (each re-declaring an identical type), and two modules imported
 * it from admin-questions.ts, which made unrelated features depend on the question
 * feature for a type that belongs to neither. One declaration here, imported by
 * all.
 *
 * WHY A MESSAGE, NOT A CODE: these strings are written for the person reading them
 * and are already localised at the call site. Actions that need to signal
 * something structured extend this shape rather than replacing it (see
 * AccountResult's `reauth` flag and AnswerResult's answer payload).
 *
 * Note that a failure here is an EXPECTED, handled outcome — a taken email, a
 * question already answered. Authorization failures are NOT modelled as a result:
 * the guards in src/lib/auth-guards.ts throw, so a caller can never mistake
 * "unauthorized" for a message to render.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };
