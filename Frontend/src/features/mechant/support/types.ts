// src/features/support/types.ts
import { z } from "zod";

// تعريف أنواع الموضوعات لتكون قابلة لإعادة الاستخدام
export const ContactTopic = {
  SALES: "sales",
  SUPPORT: "support",
  BILLING: "billing",
  PARTNERSHIP: "partnership",
} as const;

export type ContactTopic = (typeof ContactTopic)[keyof typeof ContactTopic];

// مخطط التحقق من صحة النموذج باستخدام Zod
export const adminContactSchema = z.object({
  name: z.string().min(2, "فضلاً اكتب الاسم الكامل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  phone: z.string().optional(),
  merchantId: z.string().min(10, "معرّف التاجر مفقود"),
  topic: z.nativeEnum(ContactTopic, {
    errorMap: () => ({ message: "اختر نوع الطلب" }),
  }),
  urgency: z.enum(["low", "normal", "high"]),
  subject: z.string().min(5, "الموضوع قصير جداً").max(200),
  message: z.string().min(20, "نحتاج تفاصيل أكثر لمساعدتك").max(5000),
  website: z.string().optional(), // Honeypot field for spam prevention
});

// استنتاج نوع البيانات من مخطط Zod
export type AdminContactPayload = z.infer<typeof adminContactSchema>;

// نوع البيانات المتوقع من الـ API بعد إرسال الطلب
export type ContactResponse = {
  id: string;
  ticketNumber: string;
  status: "open" | "pending" | "resolved" | "closed";
  createdAt: string;
};