// تطبيع احترافي: أحرف إنجليزية وأرقام وشرطات فقط + إزالة التكرار وطول مناسب
export function normalizeSlug(input: string): string {
    // تحويل مسافات وشرطات سفلية إلى شرطات
    let s = input.trim().toLowerCase().replace(/[\s_]+/g, "-");
  
    // إزالة أي محارف ليست a-z0-9- (نكتفي باللاتيني للاحترافية والدعم الأوسع)
    s = s.replace(/[^a-z0-9-]/g, "");
  
    // إزالة الشرطات المتكررة وبدايات/نهايات الشرطات
    s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  
    // حد الطول
    if (s.length > 50) s = s.slice(0, 50).replace(/-+$/g, "");
  
    return s;
  }
  
  export function isValidSlug(s: string): boolean {
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s) && s.length >= 3 && s.length <= 50;
  }
  
  // اقتراحات بسيطة
  export function slugSuggestions(base: string): string[] {
    const n = normalizeSlug(base);
    if (!n) return [];
    const rnd = () => Math.floor(100 + Math.random() * 900);
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    return [n, `${n}-${y}`, `${n}-${rnd()}`, `${n}-shop`, `${n}-store`];
  }
  