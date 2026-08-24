import { SignIn } from "@clerk/nextjs";
import { NavBar } from "@/components/layout/NavBar";

export default function LoginPage() {
  return (
    <div>
      <NavBar variant="guest" />
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <SignIn path="/login" routing="path" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
