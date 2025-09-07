// src/utils/render.ts
export function toDisplayString(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  if (Array.isArray(x)) return x.map(toDisplayString).join(" · ");

  // ObjectId أو كائنات أخرى
  const anyObj = x as any;

  // Handle Buffer objects (MongoDB ObjectId)
  if (anyObj?.buffer && Array.isArray(anyObj.buffer?.data)) {
    return "ObjectId"; // أو يمكن إرجاع string representation
  }

  if (typeof anyObj?.name === "string") return anyObj.name; // في حال وصل كـ { _id, name }
  if (typeof anyObj?.title === "string") return anyObj.title; // في حال وصل كـ { _id, title }
  if (typeof anyObj?._id === "string") return anyObj._id;
  if (typeof anyObj?.toString === "function") {
    const s = anyObj.toString();
    if (s && s !== "[object Object]") return s;
  }

  // لا نطبع الخاصية buffer أبدًا
  try {
    const clone: Record<string, any> = {};
    for (const k of Object.keys(anyObj)) {
      if (k.toLowerCase() === "buffer") continue;
      clone[k] = anyObj[k];
    }
    const s = JSON.stringify(clone);
    return s === "{}" ? "" : s;
  } catch {
    return "";
  }
}
