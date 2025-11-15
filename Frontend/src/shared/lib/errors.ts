// src/shared/lib/errors.ts
import axios from "axios";
export function getAxiosMessage(err: unknown, fallback = "حدث خطأ غير متوقع"): string {
  if (axios.isAxiosError(err)) {
    const m = err.response?.data as { message?: string };
    if (typeof m?.message === "string") return m.message;
    if (typeof err.message === "string") return err.message;
  }
  if (typeof err === "string") return err;
  return fallback;
}
