import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ListingForm } from "@/components/listings/ListingForm";
import { NavBar } from "@/components/layout/NavBar";
import type { User } from "@/lib/api/users";

async function fetchMe(): Promise<User | null> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/v1/users/me/`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as User) : null;
  } catch {
    return null;
  }
}

export default async function NewListingPage() {
  const me = await fetchMe();

  if (!me) {
    redirect("/login?next=/listings/new");
  }

  if (!me.is_verified) {
    return (
      <div>
        <NavBar variant="app" />
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: 32,
              border: "3px solid var(--ink)",
              borderRadius: 2,
            }}
          >
            <div className="label" style={{ color: "var(--secondary-dark)" }}>
              Verification required
            </div>
            <h1 style={{ fontSize: 28 }}>VERIFY YOUR ID TO CONTINUE</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>
              You need to complete ID verification before you can create a listing. Upload your
              NRIC and wait for approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar variant="app" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 64px 96px" }}>
        <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="label">New listing</div>
            <h1 style={{ fontSize: 36 }}>LIST YOUR SPACE</h1>
          </div>
          <ListingForm />
        </div>
      </div>
    </div>
  );
}
