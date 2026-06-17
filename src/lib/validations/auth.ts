/**
 * Input schemas for auth flows. These are the single source of truth for what
 * valid input looks like — used by both client forms and server actions, so
 * validation can never drift between the two.
 */
import { z } from "zod";
import { Position, Role } from "@prisma/client";

// Per-field rules, named once so every schema that touches a name / email /
// password / position / institution shares the EXACT same validation — register,
// login, profile edit, password change, and admin user edit can never drift.
// Email carries its own `.trim().toLowerCase()` normalization, so any field that
// reuses it gets a normalized value out of `parse` for free.
const nameRule = z.string().trim().min(2, "Name is required").max(120);
const emailRule = z.string().trim().toLowerCase().email("Enter a valid email");
const passwordRule = z.string().min(8, "Use at least 8 characters").max(128);
const positionRule = z.nativeEnum(Position, {
  errorMap: () => ({ message: "Select your position" }),
});
const institutionRule = z.string().trim().min(2, "Institution is required").max(160);
const roleRule = z.nativeEnum(Role, {
  errorMap: () => ({ message: "Select a role" }),
});

export const registerSchema = z.object({
  name: nameRule,
  email: emailRule,
  password: passwordRule,
  position: positionRule,
  institution: institutionRule,
});

export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, "Password is required"),
});

// ── M5: account management ──────────────────────────────────────────────────

/** Self-service profile edit (name + email). Reuses the register field rules. */
export const profileSchema = z.object({
  name: nameRule,
  email: emailRule,
});

/**
 * Self-service password change. The current password is required to authorize
 * the change (verified against the stored hash server-side); the new password
 * reuses the register password rule.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordRule,
});

/** Admin editing of any user's details + role. No current-password (override). */
export const adminUpdateUserSchema = z.object({
  name: nameRule,
  email: emailRule,
  position: positionRule,
  institution: institutionRule,
  role: roleRule,
});

/** Admin password reset for any user. No current-password (override). */
export const adminResetPasswordSchema = z.object({
  newPassword: passwordRule,
});

// ── M6: forgot-password via email ───────────────────────────────────────────

/** Reset request — just an email, reusing the shared normalized email rule. */
export const forgotPasswordSchema = z.object({
  email: emailRule,
});

/**
 * Reset confirm — the raw token from the emailed link plus the new password
 * (same rule as registration). The token is opaque to the client; we only check
 * it's a non-empty string here and validate it against the DB in the action.
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is missing"),
  newPassword: passwordRule,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Human-readable labels for the Position enum (UI + display). */
export const POSITION_LABELS: Record<Position, string> = {
  MEDICAL_STUDENT: "Medical Student",
  RESIDENT: "Resident",
  ATTENDING_NEUROLOGIST: "Attending Neurologist",
};
