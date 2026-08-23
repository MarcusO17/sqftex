"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/users";
import { ensureCsrfCookie } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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
    <main>
      <h1>Log in</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}
