import axiosInstance from "@/shared/api/axios";

export const fetchDocuments = (merchantId: string) =>
  axiosInstance.get(`/merchants/${merchantId}/documents`).then((res) => res.data); // الباك إند يرسل: { success, data, requestId, timestamp }

export const uploadDocument = (merchantId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post(`/merchants/${merchantId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((res) => res.data);
};

export const deleteDocument = (merchantId: string, docId: string) =>
  axiosInstance.delete(`/merchants/${merchantId}/documents/${docId}`).then((res) => res.data);
