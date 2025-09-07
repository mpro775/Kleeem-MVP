// src/shared/utils/ids.ts
export function getIdString(x: unknown): string {
  if (!x) throw new Error("id مطلوب");
  if (typeof x === "string") return x;
  if (typeof x === "object") {
    const any = x as any;
    const candidate =
      any._id?.toString?.() ??
      any.id?.toString?.() ??
      any.value?.toString?.() ??
      any.toString?.();
    if (typeof candidate === "string") return candidate;
  }
  throw new Error("id غير صالح");
}

export function isObjectId(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(s);
}

export function ensureIdString(x: unknown): string {
  const id = getIdString(x);
  if (!isObjectId(id)) {
    throw new Error(`id ليس ObjectId صالح: ${id}`);
  }
  return id;
}
