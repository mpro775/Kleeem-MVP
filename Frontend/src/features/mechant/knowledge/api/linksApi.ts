import axiosInstance from "@/shared/api/axios";

export const fetchLinks = (merchantId: string) =>
  axiosInstance.get(`/merchants/${merchantId}/knowledge/urls`).then((res) => res.data); // الباك إند يرسل: { success, data, requestId, timestamp }

export const addLinks = (merchantId: string, urls: string[]) =>
  axiosInstance.post(`/merchants/${merchantId}/knowledge/urls`, { urls }).then((res) => res.data);

export const deleteLink = (merchantId: string, linkId: string) =>
  axiosInstance.delete(`/merchants/${merchantId}/knowledge/urls/${linkId}`).then((res) => res.data);
