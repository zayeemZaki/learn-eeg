/**
 * Input schemas for auth flows. These are the single source of truth for what
 * valid input looks like — used by both client forms and server actions, so
 * validation can never drift between the two.
 */
import { z } from "zod";
import { Position } from "@prisma/client";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
  position: z.nativeEnum(Position, {
    errorMap: () => ({ message: "Select your position" }),
  }),
  institution: z.string().trim().min(2, "Institution is required").max(160),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Human-readable labels for the Position enum (UI + display). */
export const POSITION_LABELS: Record<Position, string> = {
  MEDICAL_STUDENT: "Medical Student",
  RESIDENT: "Resident",
  ATTENDING_NEUROLOGIST: "Attending Neurologist",
};
