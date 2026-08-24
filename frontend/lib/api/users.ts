import { apiFetch } from "./client";

export interface User {
  id: number;
  email: string;
  username: string | null;
  phone: string;
  address: string;
  role: "renter" | "host" | null;
  is_verified: boolean;
  created_at: string;
}

export interface UpdateProfileInput {
  username?: string;
  phone?: string;
  address?: string;
}

export async function getMe(token?: string | null): Promise<User | null> {
  try {
    return await apiFetch<User>("/api/v1/users/me/", {}, token);
  } catch {
    return null;
  }
}

export async function updateMe(input: UpdateProfileInput, token: string): Promise<User> {
  return apiFetch<User>(
    "/api/v1/users/me/",
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    token
  );
}

// Dev-only shortcut — see the matching backend route in
// backend/src/routes/users.ts for why this exists and its production gate.
export async function verifyStub(token: string): Promise<User> {
  return apiFetch<User>("/api/v1/users/me/verify-stub/", { method: "POST" }, token);
}
