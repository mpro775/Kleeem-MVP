import axiosInstance from "@/shared/api/axios";

export const fetchLinks = (merchantId: string) =>
  axiosInstance.get(`/merchants/${merchantId}/knowledge/urls`).then((res) => res.data); // الباك إند يرسل: { success, data, requestId, timestamp }

export const addLinks = (merchantId: string, urls: string[]) => {
  console.log("[linksApi] addLinks called:", { merchantId, urls, url: `/merchants/${merchantId}/knowledge/urls` });
  return axiosInstance.post(`/merchants/${merchantId}/knowledge/urls`, { urls }).then((res) => {
    console.log("[linksApi] addLinks response:", res.data);
    return res.data;
  }).catch((error) => {
    console.error("[linksApi] addLinks error:", error);
    throw error;
  });
};

export const deleteLink = (merchantId: string, linkId: string) =>
  axiosInstance.delete(`/merchants/${merchantId}/knowledge/urls/${linkId}`).then((res) => res.data);
