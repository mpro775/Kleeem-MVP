  import axiosInstance from "@/shared/api/axios";
import type {
  Category,
  CategoryNode,
} from "@/features/mechant/categories/type";

// الباك إند يرسل الآن صيغة موحدة دائماً: { success, data, requestId, timestamp }
// لا نحتاج للـ unwrap
function unwrap<T>(data: unknown): T {
  return data as T;
}

// جلب الشجرة (مع كسر الكاش)
export async function getCategoriesTree(
  merchantId: string
): Promise<CategoryNode[]> {
  const res = await axiosInstance.get(`/categories`, {
    params: { merchantId, tree: true, _t: Date.now() }, // ← يكسر الكاش
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });
  // لو 304 بدون body، رجّع مصفوفة فاضية وخليه يتعامل معها الكومبوننت
  return Array.isArray(unwrap<CategoryNode[]>(res.data))
    ? unwrap(res.data)
    : [];
}
export async function hasAnyCategory(merchantId: string): Promise<boolean> {
  if (!merchantId) return false;
  const res = await axiosInstance.get(`/categories`, { params: { merchantId } });
  // الكنترولر يرجّع Array مباشرة، لكن نراعي إن بعض المشاريع تلفّها داخل data
  const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return Array.isArray(list) && list.length > 0;
}
// جلب flat (مع كسر الكاش أيضاً لسلامة التوافق)
export async function getCategoriesFlat(
  merchantId: string
): Promise<Category[]> {
  const res = await axiosInstance.get(`/categories`, {
    params: { merchantId, _t: Date.now() },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });
  return Array.isArray(unwrap<Category[]>(res.data)) ? unwrap(res.data) : [];
}
export async function uploadCategoryImage(
  categoryId: string,
  merchantId: string,
  file: File
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosInstance.post(`/categories/${categoryId}/image`, form, {
    params: { merchantId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { url }
}
// جلب مسار الـ breadcrumbs لفئة محددة
export async function getBreadcrumbs(id: string, merchantId: string) {
  const { data } = await axiosInstance.get(`/categories/${id}/breadcrumbs`, {
    params: { merchantId },
  });
  return data as Array<{
    name: string;
    slug: string;
    path: string;
    depth: number;
  }>;
}

// جلب شجرة فرعية لفئة محددة
export async function getSubtree(
  id: string,
  merchantId: string
): Promise<CategoryNode> {
  const { data } = await axiosInstance.get(`/categories/${id}/subtree`, {
    params: { merchantId },
  });
  return data;
}

// إنشاء فئة جديدة
export async function createCategory(payload: {
  name: string;
  merchantId: string;
  parent?: string;
  image?: string;
  description?: string;
  keywords?: string[];
}): Promise<Category> {
  const { data } = await axiosInstance.post(`/categories`, payload);
  return data;
}

// تحديث فئة
export async function updateCategory(
  id: string,
  merchantId: string,
  payload: {
    name?: string;
    parent?: string | null;
    image?: string;
    description?: string;
    keywords?: string[];
  }
) {
  const { data } = await axiosInstance.put(`/categories/${id}`, payload, {
    params: { merchantId }, // ✅ يمرر merchantId كـ query
  });
  return data;
}

// نقل فئة (تغيير الأب)
export async function moveCategory(
  id: string,
  newParent: string | null,
  merchantId: string
) {
  const { data } = await axiosInstance.patch(
    `/categories/${id}/move`,
    { parent: newParent ?? null },
    { params: { merchantId } }
  );
  return data;
}
export async function moveCategoryAdvanced(
  id: string,
  merchantId: string,
  payload: {
    parent?: string | null;
    afterId?: string | null;
    beforeId?: string | null;
    position?: number | null;
  }
) {
  const { data } = await axiosInstance.patch(`/categories/${id}/move`, payload, {
    params: { merchantId },
  });
  return data;
}
// حذف فئة
export async function deleteCategory(
  id: string,
  merchantId: string,
  cascade = false
): Promise<void> {
  await axiosInstance.delete(`/categories/${id}`, {
    params: { merchantId, cascade },
  });
}
