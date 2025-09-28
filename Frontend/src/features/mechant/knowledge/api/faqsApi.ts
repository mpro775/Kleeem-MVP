import axiosInstance from "@/shared/api/axios";

export const fetchFaqs = (merchantId: string) =>
  axiosInstance.get(`/merchants/${merchantId}/faqs`).then((res) => res.data); // الباك إند يرسل: { success, data, requestId, timestamp }

export const addFaqs = (
  merchantId: string,
  faqs: { question: string; answer: string }[]
) => axiosInstance.post(`/merchants/${merchantId}/faqs`, faqs).then((res) => res.data);

export const add = addFaqs; // alias for backward compatibility

export const deleteFaq = (merchantId: string, faqId: string) =>
  axiosInstance.delete(`/merchants/${merchantId}/faqs/${faqId}`).then((res) => res.data);

export const remove = deleteFaq; // alias for backward compatibility
