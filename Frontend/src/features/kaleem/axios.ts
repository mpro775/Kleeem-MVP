import axios from "axios";
import type { AxiosError } from "axios";

export 
function parseAxiosError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const aerr = err as AxiosError<{ message?: string }>;
    const msg =
      aerr.response?.data?.message ||
      aerr.response?.statusText ||
      aerr.message ||
      "Request failed";
    return new Error(msg);
  }
  return err instanceof Error ? err : new Error("Unknown error");
}