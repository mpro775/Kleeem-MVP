import axiosInstance from "@/shared/api/axios";

export const uploadBannerImages = async (merchantId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
  
    const { data } = await axiosInstance.post<{
      urls: string[];
      accepted: number;
      remaining: number;
      max: number;
    }>(`/storefront/by-merchant/${merchantId}/banners/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  
    return data;
  };