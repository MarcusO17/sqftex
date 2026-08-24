const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
