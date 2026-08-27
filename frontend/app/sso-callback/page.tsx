import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Landing page for OAuth redirects started by LoginForm's
// `signIn.authenticateWithRedirect({ redirectUrl: "/sso-callback" })`.
// Clerk finishes the handshake here, then forwards to `redirectUrlComplete`.
export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      <AuthenticateWithRedirectCallback />
      Finishing sign-in…
    </div>
  );
}
