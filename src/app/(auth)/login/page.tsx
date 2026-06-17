import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  // In Next 15+/16, searchParams is async and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Surfaced after a successful password reset (reset-password → /login).
  const resetSuccess = (await searchParams).reset === "success";
  return <LoginForm resetSuccess={resetSuccess} />;
}
