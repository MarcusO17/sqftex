import { SignUp } from "@clerk/nextjs";
import { NavBar } from "@/components/layout/NavBar";

export default function SignUpPage() {
  return (
    <div>
      <NavBar variant="guest" />
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <SignUp path="/sign-up" routing="path" signInUrl="/login" />
      </div>
    </div>
  );
}
