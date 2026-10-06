import { clearSessionToken, getSessionToken } from "../auth/session";
import type {
  Account,
  ApiErrorBody,
  AuthSession,
  BatchScoreResponse,
  HealthResponse,
  ModelInfoResponse,
  PredictionRequest,
  PredictionResponse,
} from "../types/prediction";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = getSessionToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401 && token && !path.startsWith("/api/v1/auth/signin")) {
        clearSessionToken();
        window.dispatchEvent(new Event("bankreach:unauthorized"));
      }
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(
        body?.message || "The request could not be completed.",
        response.status,
        body?.error || "request_error",
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The prediction service took too long to respond.", 0, "timeout");
    }
    throw new ApiError(
      "The prediction service could not be reached. Start the BankReach API and try again.",
      0,
      "network_error",
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/v1/health");
}

export function getModelInfo(): Promise<ModelInfoResponse> {
  return request<ModelInfoResponse>("/api/v1/model");
}

export function predictSubscription(payload: PredictionRequest): Promise<PredictionResponse> {
  return request<PredictionResponse>("/api/v1/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function signUpAccount(payload: { name: string; email: string; password: string }): Promise<AuthSession> {
  return request<AuthSession>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function signInAccount(payload: { email: string; password: string }): Promise<AuthSession> {
  return request<AuthSession>("/api/v1/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function signOutAccount(): Promise<{ signed_out: boolean }> {
  return request<{ signed_out: boolean }>("/api/v1/auth/signout", { method: "POST" });
}

export function getCurrentAccount(): Promise<Account> {
  return request<Account>("/api/v1/auth/me");
}

export function scoreCampaignFile(file: File): Promise<BatchScoreResponse> {
  return request<BatchScoreResponse>(
    "/api/v1/predict/batch",
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": "text/csv" },
    },
    180000,
  );
}
