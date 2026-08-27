import "server-only";

import type {
  ApiPaginated,
  ApiResponse,
  ApiValidationErrors,
} from "@/types/api";

/**
 * Server-side client for the Laravel API.
 *
 * Imported with `server-only` so a stray import from a Client Component fails
 * the build rather than shipping the API host — and eventually a bearer token
 * — to the browser. Client Components reach the API through the route
 * handlers under /api/bff instead.
 */

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

/** Thrown for any non-2xx response, carrying the API's own message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: ApiValidationErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the API rejected the payload rather than failing outright. */
  get isValidationError(): boolean {
    return this.status === 422;
  }

  /** First message for a field, for rendering inline under an input. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** Serialised as JSON unless it is already a FormData or string. */
  body?: unknown;
  /** Appended as a query string; null and undefined entries are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Bearer token. Omit for public endpoints. */
  token?: string | null;
  /** Passed through to Next's fetch cache. */
  next?: NextFetchRequestConfig;
};

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
  const url = new URL(
    `/api/${path.replace(/^\/+/, "")}`,
    API_URL.replace(/\/+$/, ""),
  );

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, query, token, headers, ...rest } = options;

  const isFormData = body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(isFormData || body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData
      ? body
      : body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof payload?.message === "string"
        ? payload.message
        : `Request failed with status ${response.status}.`,
      (payload?.errors as ApiValidationErrors) ?? {},
    );
  }

  return payload as T;
}

/** Unwraps a single-resource envelope down to its `data`. */
export async function apiItem<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const response = await apiFetch<ApiResponse<T>>(path, options);

  return response.data;
}

/** Unwraps a list envelope, keeping pagination meta alongside the items. */
export async function apiList<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<{ items: T[]; meta: ApiPaginated<T>["meta"] | null }> {
  const response = await apiFetch<ApiPaginated<T>>(path, options);

  return {
    items: Array.isArray(response.data) ? response.data : [],
    meta: response.meta ?? null,
  };
}
