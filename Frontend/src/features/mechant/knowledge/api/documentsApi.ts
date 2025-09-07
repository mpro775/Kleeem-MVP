import axios from "@/shared/api/axios";

export const fetchDocuments = (merchantId: string) =>
  axios.get(`/merchants/${merchantId}/documents`).then((res) => res.data.data || res.data);

export const uploadDocument = (merchantId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return axios.post(`/merchants/${merchantId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((res) => res.data.data || res.data);
};

export const deleteDocument = (merchantId: string, docId: string) =>
  axios.delete(`/merchants/${merchantId}/documents/${docId}`).then((res) => res.data.data || res.data);
