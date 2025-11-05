import { z } from 'zod';

export const ContactTopic = {
    SALES: 'sales',
    SUPPORT: 'support',
    BILLING: 'billing',
    PARTNERSHIP: 'partnership',
  } as const;
  export type ContactTopic = (typeof ContactTopic)[keyof typeof ContactTopic];

export const contactSchema = z.object({
  name: z.string().min(2, 'فضلاً اكتب الاسم الكامل'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  phone: z.string().optional(),
  topic: z.nativeEnum(ContactTopic, { message: 'اختر نوع الطلب' }),
  subject: z.string().min(5, 'الموضوع قصير جداً').max(200),
  message: z.string().min(20, 'نحتاج تفاصيل أكثر لمساعدتك').max(5000),
  website: z.string().optional(), // honeypot
  recaptchaToken: z.string().optional(),
});

export type ContactPayload = z.infer<typeof contactSchema>;

export type ContactResponse = {
  id: string;
  ticketNumber: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  createdAt: string;
};

export type WorkHours = Record<number, { from: string; to: string; off?: boolean }>; // 0..6

export type ContactConfig = {
  businessName?: string;
  address?: string;
  mapEmbedUrl?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  phone?: string;
  workHours?: WorkHours;
  showFaq?: boolean;
  enableReCaptcha?: boolean;
};

export const defaultContactConfig: Required<Pick<ContactConfig,
  'businessName' | 'email' | 'phone' | 'whatsapp' | 'telegram' | 'address' | 'mapEmbedUrl' | 'showFaq' | 'workHours'>> = {
  businessName: 'كليم — Kaleem',
  email: 'support@kaleem.app',
  phone: '+967-7XXXXXXX',
  whatsapp: 'https://wa.me/0000000000',
  telegram: 'https://t.me/kaleem_support',
  address: 'صنعاء، اليمن',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.22300390024!2d46.7165336!3d16.776771499999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f48000000000000%3A0x1234567890abcdef!2sKaleem!5e0!3m2!1sen!2s!4v1234567890!5m2!1sen!2s',
  showFaq: true,
  workHours: {
    0: { from: '09:00', to: '18:00' },
    1: { from: '09:00', to: '18:00' },
    2: { from: '09:00', to: '18:00' },
    3: { from: '09:00', to: '18:00' },
    4: { from: '09:00', to: '18:00' },
    5: { from: '10:00', to: '16:00' },
    6: { from: '', to: '', off: true },
  },
};