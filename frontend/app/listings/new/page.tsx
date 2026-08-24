import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NewListingWizard } from "@/components/listings/wizard/NewListingWizard";
import { NavBar } from "@/components/layout/NavBar";
import { getMe } from "@/lib/api/users";

export default async function NewListingPage() {
  const { userId, getToken } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const token = await getToken();
  const me = await getMe(token);

  if (!me) {
    redirect("/login");
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
              border: "1px solid var(--line)",
              borderRadius: 16,
              boxShadow: "0 2px 10px rgba(14,13,16,0.06)",
            }}
          >
            <div
              className="label"
              style={{
                alignSelf: "flex-start",
                color: "#fff",
                background: "var(--secondary)",
                padding: "6px 12px",
                borderRadius: 999,
                transform: "rotate(-3deg)",
              }}
            >
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
      <NewListingWizard />
    </div>
  );
}
