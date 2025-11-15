// src/shared/assets.ts

// اجعل BASE URL من env عشان يكون قابل للتغيير بسهولة
export const CDN_BASE =
  import.meta.env.VITE_CDN_BASE || "https://cdn.kaleem-ai.com";

/**
 * يبني رابط الصورة من أي شكل مدخل:
 * - Presigned URL → يحوله لرابط CDN نظيف
 * - Full URL → يرجع نفسه
 * - Key (path فقط) → يركب عليه CDN_BASE
 * - undefined/null → placeholder
 */
export function getAssetUrl(input?: string | null): string {
  if (!input) {
    return `${CDN_BASE}/placeholders/image-placeholder.webp`;
  }

  // ✅ لو أصلاً يبدأ بـ https://cdn.kaleem-ai.com أو أي http
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);

      // لو presigned من MinIO (فيه X-Amz-…)
      if (url.searchParams.has("X-Amz-Algorithm")) {
        // استخرج المسار فقط بدون Query
        return `${CDN_BASE}${url.pathname}`;
      }

      // غير كذا رجعه كما هو
      return input;
    } catch {
      // لو مو URL صحيح، نكمل
    }
  }

  // ✅ لو مجرد Key مثل "documents/merchants/..../image.webp"
  return `${CDN_BASE}/${input.replace(/^\/+/, "")}`;
}
