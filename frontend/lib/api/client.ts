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
    // Every backend error response in this codebase is `{ detail: "..." }` with a
    // human-readable message — surface that verbatim so callers can render it
    // straight to the user. Anything else (HTML error page, proxy timeout, empty
    // body) falls back to the raw transport string for debuggability.
    let detail: string | undefined;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed?.detail === "string") detail = parsed.detail;
    } catch {
      // body wasn't JSON — fall through to the raw-body message below
    }
    throw new Error(detail ?? `API request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
