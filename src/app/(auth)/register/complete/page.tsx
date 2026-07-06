import { redirect } from "next/navigation";

import { getOtpVerifiedCookie } from "@/app/actions/otp";
import { CompleteRegistrationForm } from "./complete-registration-form";

export default async function CompleteRegistrationPage() {
  // Guard: step 3 requires a completed step 2. No otp_verified cookie means
  // the visitor skipped verification (or its 15-min window lapsed) — send
  // back to step 1 rather than showing a form that registerUser will reject.
  const email = await getOtpVerifiedCookie();
  if (!email) {
    redirect("/register");
  }

  return <CompleteRegistrationForm email={email} />;
}
