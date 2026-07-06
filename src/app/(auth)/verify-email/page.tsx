import { redirect } from "next/navigation";

import { getOtpEmailCookie } from "@/app/actions/otp";
import { VerifyEmailForm } from "./verify-email-form";

export default async function VerifyEmailPage() {
  // Guard: you can't reach step 2 without having requested a code in step 1.
  // No otp_email cookie means either direct navigation or an expired/cleared
  // cookie — send back to step 1 rather than showing a dead form.
  const email = await getOtpEmailCookie();
  if (!email) {
    redirect("/register");
  }

  return <VerifyEmailForm email={email} />;
}
