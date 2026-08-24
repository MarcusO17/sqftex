"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { updateMe, verifyStub, type User } from "@/lib/api/users";

// Dev-only verify shortcut mirrors the backend's production gate (see
// backend/src/routes/users.ts) so the button simply doesn't render once
// this is built for a real deployment.
const VERIFY_STUB_ENABLED = process.env.NODE_ENV !== "production";

const ROLE_LABELS: Record<NonNullable<User["role"]>, string> = {
  renter: "Renter",
  host: "Host",
};

function formatMemberSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
}

function initials(username: string | null, email: string): string {
  const source = username?.trim() || email;
  return source.slice(0, 2).toUpperCase();
}

export function ProfileForm({ initialUser }: { initialUser: User }) {
  const { getToken } = useAuth();
  const [user, setUser] = useState(initialUser);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const data = new FormData(event.currentTarget);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");

      const updated = await updateMe(
        {
          username: String(data.get("username") ?? ""),
          phone: String(data.get("phone") ?? ""),
          address: String(data.get("address") ?? ""),
        },
        token
      );
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong saving your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setVerifying(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      const updated = await verifyStub(token);
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify right now.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 28, alignItems: "start" }}>
      <aside
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: "var(--primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 26,
            marginBottom: 14,
          }}
        >
          {initials(user.username, user.email)}
        </div>
        <h3 style={{ fontSize: 20 }}>{user.username || "Unnamed renter"}</h3>
        <p style={{ fontSize: 14, color: "var(--ink)", opacity: 0.6, marginBottom: 12 }}>{user.email}</p>

        {user.is_verified ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              width: "fit-content",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.03em",
              padding: "6px 12px",
              borderRadius: 999,
              marginBottom: 22,
              background: "rgba(8,145,178,0.16)",
              color: "var(--primary-dark)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--primary)" }} />
            ID verified
          </span>
        ) : (
          <div style={{ marginBottom: 22 }}>
            {VERIFY_STUB_ENABLED ? (
              <button type="button" className="btn-primary" onClick={handleVerify} disabled={verifying}>
                {verifying ? "Verifying..." : "Verify ID"}
              </button>
            ) : (
              <span className="label" style={{ color: "var(--secondary-dark)" }}>
                Not verified yet
              </span>
            )}
          </div>
        )}

        <hr style={{ border: "none", height: 1, background: "var(--line)", margin: "20px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field" style={{ gap: 2 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, opacity: 0.5 }}>
              Role
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>
              {user.role ? ROLE_LABELS[user.role] : "Not set yet"}
            </span>
          </div>
          <div className="field" style={{ gap: 2 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, opacity: 0.5 }}>
              Member since
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{formatMemberSince(user.created_at)}</span>
          </div>
        </div>
      </aside>

      <section
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Profile details</h2>
        <p style={{ fontSize: 14, opacity: 0.65, marginBottom: 26, lineHeight: 1.5 }}>
          Shown to hosts once you book, and used to coordinate move-in.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {error && <p role="alert">{error}</p>}

          <div className="field">
            <label htmlFor="username">Display name</label>
            <input id="username" name="username" defaultValue={user.username ?? ""} placeholder="How hosts will see you" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" name="phone" type="tel" defaultValue={user.phone} placeholder="+60 12-345 6789" />
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <input id="address" name="address" defaultValue={user.address} placeholder="Optional" />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saved && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-dark)" }}>Saved.</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
