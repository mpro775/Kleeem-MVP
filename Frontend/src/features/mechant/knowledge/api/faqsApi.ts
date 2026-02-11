import axiosInstance from "@/shared/api/axios";

export const fetchFaqs = (merchantId: string) =>
  axiosInstance.get(`/merchants/${merchantId}/faqs`).then((res) => res.data); // الباك إند يرسل: { success, data, requestId, timestamp }

export const addFaqs = (
  merchantId: string,
  faqs: { question: string; answer: string }[]
) => axiosInstance.post(`/merchants/${merchantId}/faqs`, faqs).then((res) => res.data);

export const add = addFaqs; // alias for backward compatibility

/** حذف سؤال واحد؛ يدعم الحذف النهائي عبر ?hard=true */
export const deleteFaq = (
  merchantId: string,
  faqId: string,
  options?: { hard?: boolean }
) => {
  const hardParam = options?.hard ? "?hard=true" : "";
  return axiosInstance
    .delete(`/merchants/${merchantId}/faqs/${faqId}${hardParam}`)
    .then((res) => res.data);
};

export const remove = deleteFaq; // alias for backward compatibility

/** تحديث سؤال/جواب واحد */
export const updateFaq = (
  merchantId: string,
  faqId: string,
  body: { question?: string; answer?: string }
) =>
  axiosInstance
    .patch(`/merchants/${merchantId}/faqs/${faqId}`, body)
    .then((res) => res.data);

/** حذف جميع الأسئلة لهذا التاجر (soft/hard) */
export const deleteAllFaqs = (
  merchantId: string,
  options?: { hard?: boolean }
) => {
  const params = new URLSearchParams({ all: "true" });
  if (options?.hard) params.set("hard", "true");
  return axiosInstance
    .delete(`/merchants/${merchantId}/faqs?${params.toString()}`)
    .then((res) => res.data);
};

