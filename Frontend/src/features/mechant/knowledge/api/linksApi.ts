import axios from "@/shared/api/axios";

export const fetchLinks = (merchantId: string) =>
  axios.get(`/merchants/${merchantId}/knowledge/urls`).then((res) => res.data.data || res.data);

export const addLinks = (merchantId: string, urls: string[]) =>
  axios.post(`/merchants/${merchantId}/knowledge/urls`, { urls }).then((res) => res.data.data || res.data);

export const deleteLink = (merchantId: string, linkId: string) =>
  axios.delete(`/merchants/${merchantId}/knowledge/urls/${linkId}`).then((res) => res.data.data || res.data);
