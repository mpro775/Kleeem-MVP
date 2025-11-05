import { AppError } from "@/lib/errors";
import axios from "axios";
import type { AxiosError } from "axios";

export function parseAxiosError(err: unknown): AppError {
  if (axios.isAxiosError(err)) {
    const aerr = err as AxiosError<{ message?: string; code?: string; status?: number; requestId?: string }>;
    const status = aerr.response?.status;
    const code = aerr.response?.data?.code || (status ? `API_${status}` : "NETWORK_ERROR");
    const message = aerr.response?.data?.message || aerr.response?.statusText || aerr.message || "Request failed";

    return new AppError({
      message,
      status,
      code,
      requestId: aerr.response?.headers?.["X-Request-Id"] || aerr.response?.data?.requestId,
    });
  }
  return new AppError({
    message: err instanceof Error ? err.message : "Unknown error",
    code: "UNKNOWN_ERROR"
  });
}