import axios from "@/shared/api/axios";

export const fetchFaqs = (merchantId: string) =>
  axios.get(`/merchants/${merchantId}/faqs`).then((res) => res.data.data || res.data);

export const addFaqs = (
  merchantId: string,
  faqs: { question: string; answer: string }[]
) => axios.post(`/merchants/${merchantId}/faqs`, faqs).then((res) => res.data.data || res.data);

export const add = addFaqs; // alias for backward compatibility

export const deleteFaq = (merchantId: string, faqId: string) =>
  axios.delete(`/merchants/${merchantId}/faqs/${faqId}`).then((res) => res.data.data || res.data);

export const remove = deleteFaq; // alias for backward compatibility
