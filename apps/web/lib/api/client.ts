export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text) as { error?: string; message?: string };
      message = json.error ?? json.message ?? text;
    } catch {
      // use raw text
    }
    throw new ApiResponseError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
