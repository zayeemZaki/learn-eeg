/**
 * Transactional email, isolated behind one module so the provider (Resend) and
 * the sender address live in a single place. Callers pass already-built values
 * (e.g. an absolute reset URL); this module owns nothing security-sensitive
 * beyond talking to Resend.
 *
 * Resend errors are logged server-side but NEVER returned to the caller's user:
 * the request flow shows a uniform message regardless of send outcome, so an
 * attacker can't probe for which addresses exist or whether mail was sent.
 */
import { Resend } from "resend";

import { env } from "@/env";

/**
 * Lazily construct the client so a missing key doesn't crash app boot — the
 * cost is paid only when mail is actually sent. Throws a clear, internal-only
 * error if the key is absent; the action layer catches it and still returns the
 * generic success message to the user.
 */
function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set; cannot send email");
  }
  return new Resend(env.RESEND_API_KEY);
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

/**
 * Send the password-reset email. `resetUrl` must be an absolute link that
 * already carries the raw token. Throws on a Resend error (the caller decides
 * how to surface — for the reset flow, it swallows and stays generic).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const resend = getResend();

  // resetUrl is server-built from env + a hex token, but escape defensively
  // before interpolating into the HTML body.
  const safeUrl = escapeHtml(resetUrl);

  const text = [
    "Reset your EEG Quiz password",
    "",
    "We received a request to reset your password. Open the link below to choose a new one:",
    "",
    resetUrl,
    "",
    "This link expires in 1 hour and can be used once.",
    "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        We received a request to reset the password for your EEG Quiz account.
        Click the button below to choose a new password.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #555; margin: 0 0 12px;">
        Or paste this link into your browser:<br />
        <a href="${safeUrl}" style="color: #2563eb; word-break: break-all;">${safeUrl}</a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #555; margin: 0 0 12px;">
        This link expires in 1 hour and can be used once.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #555; margin: 0;">
        If you didn't request a password reset, you can safely ignore this email —
        your password won't change.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your EEG Quiz password",
    html,
    text,
  });

  if (error) {
    // Log internally for diagnostics; never bubble Resend's message to the user.
    console.error("Resend password-reset send failed:", error);
    throw new Error("Failed to send password-reset email");
  }
}
