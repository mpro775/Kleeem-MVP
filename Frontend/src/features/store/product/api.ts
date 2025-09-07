import axiosInstance from "@/shared/api/axios";

const unwrap = (x: any) => x?.data?.data ?? x?.data ?? x;

export async function fetchProductById(productId: string) {
  const res = await axiosInstance.get(`/products/${productId}`);
  return unwrap(res);
}
