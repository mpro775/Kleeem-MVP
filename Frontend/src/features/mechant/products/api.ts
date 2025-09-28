import axiosInstanceInstance from "@/shared/api/axiosInstance";
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductResponse,
} from "@/features/mechant/products/type";
import { ensureIdString } from "@/shared/utils/ids";

// إنشاء منتج
export async function createProduct(
  payload: CreateProductDto
): Promise<ProductResponse> {
  const casted: CreateProductDto = {
    ...payload,
    category: payload.category ? ensureIdString(payload.category) : undefined,
  };
  const { data } = await axiosInstance.post<ProductResponse>("/products", casted);
  return data;
}

// تحديث منتج
export async function updateProduct(
  id: string,
  payload: UpdateProductDto
): Promise<ProductResponse> {
  const casted: UpdateProductDto = {
    ...payload,
    category:
      payload.category !== undefined
        ? ensureIdString(payload.category)
        : undefined,
  };
  const { data } = await axiosInstance.put<ProductResponse>(
    `/products/${encodeURIComponent(ensureIdString(id))}`,
    casted
  );
  return data;
}

// حذف منتج
export async function deleteProduct(id: string): Promise<{ message: string }> {
  const { data } = await axiosInstance.delete<{ message: string }>(
    `/products/${encodeURIComponent(ensureIdString(id))}`
  );
  return data;
}

// جلب منتجات التاجر
export async function getMerchantProducts(
  merchantId: string
): Promise<ProductResponse[]> {
  const { data } = await axiosInstance.get<
    { success?: boolean; data?: ProductResponse[] } | ProductResponse[]
  >("/products", { params: { merchantId: ensureIdString(merchantId) } });
  if (Array.isArray(data)) return data;
  if (data?.success && Array.isArray(data.data)) return data.data;
  return [];
}

// رفع صور متعددة
export async function uploadProductImages(
  id: string | { _id?: any } | any,
  files: File[],
  replace = false
): Promise<{
  urls: string[];
  count: number;
  accepted: number;
  remaining: number;
}> {
  const productId = ensureIdString(id);
  if (!files?.length) throw new Error("لا توجد ملفات للرفع");

  const form = new FormData();
  files.forEach((f) => form.append("files", f, f.name)); // متوافق مع FilesInterceptor('files', 6)

  const { data } = await axiosInstance.post(
    `/products/${encodeURIComponent(productId)}/images`,
    form,
    {
      params: { replace },
      // onUploadProgress: (e) => console.debug('progress', e.loaded/e.total)
    }
  );
  return data;
}
