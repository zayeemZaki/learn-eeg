import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  // In Next 15+/16, searchParams is async and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).token;
  // Tolerate a missing/duplicated token param; the form handles the empty case.
  const token = typeof raw === "string" ? raw : "";

  return <ResetPasswordForm token={token} />;
}
