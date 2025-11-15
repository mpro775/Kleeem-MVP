// src/types/api.ts
export type ApiEnvelope<T> = {
    success: boolean;
    data: T;
    requestId?: string;
    timestamp?: string;
  };
  
  export type IdLike = string | { id?: string; _id?: string; merchantId?: string };
  
  export type StorefrontEnvelope = {
    merchantId?: string;
    merchant?: IdLike;
    store?: { merchant?: IdLike };
    storefront?: { merchant?: IdLike };
  };
  
  export function isObj(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }
  
  export function pickId(x: unknown): string | null {
    if (typeof x === "string") return x;
    if (isObj(x)) {
      const v =
        (typeof x.id === "string" && x.id) ||
        (typeof x._id === "string" && x._id) ||
        (typeof x.merchantId === "string" && x.merchantId) ||
        null;
      return v ? String(v) : null;
    }
    return null;
  }
  