// src/features/support/api.ts
import axiosInstance from "@/lib/axios";
import type { AdminContactPayload, ContactResponse } from "./types";

/**
 * دالة لإنشاء كائن FormData من بيانات النموذج والملفات.
 * تقوم أيضًا بإثراء الرسالة والموضوع بالبيانات الإضافية.
 */
function buildFormData(
  payload: AdminContactPayload,
  files?: FileList | null
): FormData {
  const fd = new FormData();
  const { merchantId, urgency, ...basePayload } = payload;

  // إثراء الموضوع والرسالة بمعلومات الأولوية ومعرّف التاجر
  const enrichedPayload = {
    ...basePayload,
    subject: `[${urgency.toUpperCase()}] ${
      basePayload.subject
    } — (merchantId: ${merchantId})`,
    message: `MerchantId: ${merchantId}\nUrgency: ${urgency}\n\n${basePayload.message}`,
  };

  fd.append("payload", JSON.stringify(enrichedPayload));

  if (files) {
    Array.from(files).forEach((file) => fd.append("files", file));
  }

  return fd;
}

/**
 * دالة لإرسال طلب الدعم إلى الـ API.
 */
export async function submitSupportTicket(
  payload: AdminContactPayload,
  files?: FileList | null
): Promise<ContactResponse> {
  const formData = buildFormData(payload, files);
  const response = await axiosInstance.post<ContactResponse>(
    "/support/contact/merchant",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
}
