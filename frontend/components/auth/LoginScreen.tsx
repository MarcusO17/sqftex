import { SignIn } from "@clerk/nextjs";
import { AuthSplitLayout, authFormAppearance } from "./AuthSplitLayout";

// Right-panel image: drop a file at `public/login-hero.jpg` (portrait-ish
// crop, storage/warehouse imagery works well) — falls back to a plain
// tinted panel until one exists, no broken-image icon.
export function LoginScreen() {
  return (
    <AuthSplitLayout
      heading={
        <>
          Welcome back.
          <br />
          Log in to your account.
        </>
      }
      tagline="Verified hosts. Escrow-protected bookings. Spare space, sorted fast."
    >
      <SignIn path="/login" routing="path" signUpUrl="/sign-up" appearance={authFormAppearance} />
    </AuthSplitLayout>
  );
}
