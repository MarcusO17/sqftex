import { SignUp } from "@clerk/nextjs";
import { AuthSplitLayout, authFormAppearance } from "./AuthSplitLayout";

export function SignUpScreen() {
  return (
    <AuthSplitLayout
      heading={
        <>
          List a space or start booking.
          <br />
          Create your account.
        </>
      }
      tagline="Verified hosts. Escrow-protected bookings. Spare space, sorted fast."
    >
      <SignUp path="/sign-up" routing="path" signInUrl="/login" appearance={authFormAppearance} />
    </AuthSplitLayout>
  );
}
