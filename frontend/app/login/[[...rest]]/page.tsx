import { LoginScreen } from "@/components/auth/LoginScreen";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string };
}) {
  return <LoginScreen afterSignInUrl={searchParams.redirect_url} />;
}
