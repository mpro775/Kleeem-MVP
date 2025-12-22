// src/features/merchant-settings/types.ts
import type { ComponentType } from "react";
export interface SocialLinks {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    [key: string]: string | undefined;
  }
  export interface Address {
    label: string;      // تسمية العنوان (إجباري)
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }
   export interface WorkingHour {
    day: string;          // e.g. "Monday"
    openTime: string;     // "HH:mm"
    closeTime: string;  
  }
  
  export interface MerchantInfo {
    _id: string;
    name: string;
    logoUrl?: string;
    phone?: string;

    // كان عندك slug اختياري؛ نستبدله/نكمله بـ publicSlug على مستوى التاجر
    publicSlug?: string;              // ✅ السلاج الموحّد
    publicSlugEnabled?: boolean;      // (اختياري) لإخفاء/تعطيل الروابط العامة

    businessDescription?: string;
    addresses: Address[];
    workingHours: WorkingHour[];
    returnPolicy?: string;
    exchangePolicy?: string;
    shippingPolicy?: string;
    categories: string[];
    customCategory?: string;
    socialLinks?: SocialLinks;
  }
export type SectionComponentProps = {
  initialData: MerchantInfo;
  onSave: (sectionData: Partial<MerchantInfo>) => Promise<void>;
  loading: boolean;
};

export type SectionComponent = ComponentType<SectionComponentProps>;

export type TabSection = {
  label: string;
  component: SectionComponent;
};
