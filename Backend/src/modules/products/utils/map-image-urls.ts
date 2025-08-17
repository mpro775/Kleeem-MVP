// src/products/utils/map-image-urls.ts
export function mapZidImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const img of images) {
    if (img && typeof img === 'object' && 'url' in img) {
      const u = (img as Record<string, unknown>).url;
      if (typeof u === 'string' && u.trim()) out.push(u);
    }
  }
  return out;
}
