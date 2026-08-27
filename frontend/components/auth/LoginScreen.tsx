import { AuthSplitLayout } from "./AuthSplitLayout";
import { LoginForm } from "./LoginForm";

// Right-panel image: drop a file at `public/login-hero.jpg` (portrait-ish
// crop, storage/warehouse imagery works well) — falls back to a plain
// tinted panel until one exists, no broken-image icon.
export function LoginScreen({ afterSignInUrl }: { afterSignInUrl?: string }) {
  return (
    <AuthSplitLayout tagline="Verified hosts. Escrow-protected bookings. Spare space, sorted fast.">
      <LoginForm afterSignInUrl={afterSignInUrl} />
    </AuthSplitLayout>
  );
}
