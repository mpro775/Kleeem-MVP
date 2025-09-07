import axios, { AxiosError } from "axios";

type ApiErrorBody = { message?: string };

export function getErrorMessage(
  e: unknown,
  fallback = "حدث خطأ غير متوقع"
): string {
  // axios error
  if (axios.isAxiosError(e)) {
    const ax = e as AxiosError<ApiErrorBody>;
    const msg = ax.response?.data?.message || ax.message;
    return msg || fallback;
  }
  // Error العادي
  if (e instanceof Error) return e.message || fallback;
  // نص خام
  if (typeof e === "string") return e;
  return fallback;
}
