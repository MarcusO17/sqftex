"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/users";
import { ensureCsrfCookie } from "@/lib/api/client";
import { NavBar } from "@/components/layout/NavBar";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    ensureCsrfCookie();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      await login(String(data.get("email")), String(data.get("password")));
      router.push("/listings/new");
    } catch {
      setError("Invalid email or password.");
    }
  }

  return (
    <div>
      <NavBar variant="guest" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="label">Welcome back</div>
            <h1 style={{ fontSize: 36 }}>LOG IN</h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && <p role="alert">{error}</p>}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="you@company.com" required />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  style={{ paddingRight: 44 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 10,
                    background: "none",
                    border: "none",
                    padding: 6,
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M4 4l16 16" />
                    </svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: 6, width: "100%" }}>
              Log in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
