import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NavBar } from "@/components/layout/NavBar";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getMe } from "@/lib/api/users";

export default async function ProfilePage() {
  const { userId, getToken } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const token = await getToken();
  const me = await getMe(token);

  if (!me) {
    redirect("/login");
  }

  return (
    <div>
      <NavBar variant="app" />
      <div style={{ display: "flex", justifyContent: "center", padding: "56px 32px 96px" }}>
        <div style={{ width: "100%", maxWidth: 1040, display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="label">Account</div>
            <h1 style={{ fontSize: 34 }}>Your profile</h1>
          </div>
          <ProfileForm initialUser={me} />
        </div>
      </div>
    </div>
  );
}
