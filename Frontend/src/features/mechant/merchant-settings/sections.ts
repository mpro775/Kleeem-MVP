// src/features/merchant-settings/sections.ts
import type { TabSection } from "./types";

// نفس مكوناتك الحالية (تتوافق مع props: initialData, onSave, loading)
import GeneralInfoForm from "./ui/GeneralInfoForm";
import AddressForm from "./ui/AddressForm";
import PoliciesForm from "./ui/PoliciesForm";
import WorkingHoursForm from "./ui/WorkingHoursForm";
import SocialLinksSection from "./ui/SocialLinksSection";

export const SECTIONS: TabSection[] = [
  { label: "المعلومات العامة", component: GeneralInfoForm },
  { label: "العنوان", component: AddressForm },
  { label: "ساعات العمل", component: WorkingHoursForm },
  { label: "السياسات", component: PoliciesForm },
  { label: "روابط التواصل الاجتماعي", component: SocialLinksSection },
];
