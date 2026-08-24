import { apiFetch } from "./client";

export interface User {
  id: number;
  email: string;
  username: string | null;
  is_verified: boolean;
}

export async function getMe(token?: string | null): Promise<User | null> {
  try {
    return await apiFetch<User>("/api/v1/users/me/", {}, token);
  } catch {
    return null;
  }
}
