export class ApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export type FetchOptions = {
  params?: Record<string, QueryValue>;
  token?: string | null;
  init?: RequestInit;
};

export async function apiFetch<T>(
  path: string,
  optsOrParams?: FetchOptions | Record<string, QueryValue>,
  init?: RequestInit
): Promise<T> {
  let params: Record<string, QueryValue> | undefined;
  let token: string | null | undefined;
  let reqInit: RequestInit | undefined;

  if (optsOrParams && ("token" in optsOrParams || "params" in optsOrParams || "init" in optsOrParams)) {
    const opts = optsOrParams as FetchOptions;
    params = opts.params;
    token = opts.token;
    reqInit = opts.init;
  } else {
    params = optsOrParams as Record<string, QueryValue> | undefined;
    reqInit = init;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not configured.");
  }

  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(reqInit?.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    ...reqInit,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let body: unknown = undefined;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }

    throw new ApiError(
      `Request failed for ${path} with status ${response.status}`,
      response.status,
      body
    );
  }

  return response.json() as Promise<T>;
}
