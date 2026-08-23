import { apiFetch } from "./client";

export interface User {
  id: number;
  email: string;
  username: string;
  is_verified: boolean;
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/api/v1/users/me/");
}

export async function login(email: string, password: string): Promise<User> {
  return apiFetch<User>("/api/v1/users/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
