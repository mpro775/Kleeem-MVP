// src/components/landing/featuresData.tsx
import React from 'react';

// استيراد الأيقونات المستخدمة
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HubIcon from "@mui/icons-material/Hub";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import SecurityIcon from "@mui/icons-material/Security";
import StoreIcon from "@mui/icons-material/Store";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LanguageIcon from "@mui/icons-material/Language";

// تعريف نوع البيانات لكل ميزة لمزيد من الأمان البرمجي
export interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
}

// تصدير مصفوفة الميزات ليتم استيرادها في أي مكان آخر
export const features: Feature[] = [
  {
    icon: <AutoAwesomeIcon />,
    title: "ذكاء يفهم لهجتك",
    desc: "يرد على عملائك بشكل طبيعي ومخصص حتى باللهجات المحلية، مما يجعل تجربة التواصل أكثر قرباً وسلاسة.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <HubIcon />,
    title: "كل القنوات في مكان واحد",
    desc: "تحكم كامل في واتساب، تيليجرام، ودردشة الموقع من لوحة واحدة سهلة الاستخدام.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <ThumbUpAltIcon />,
    title: "ردود فورية مخصصة",
    desc: "كل عميل يحصل على رد يناسب سؤاله مباشرة بدون انتظار، بفضل الذكاء الاصطناعي.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <StoreIcon />,
    title: "ربط متجرك بسهولة",
    desc: "يدعم جميع المنصات الكبرى — سلة، زد، وغيرها — مع خطوات ربط سهلة وسريعة.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <SecurityIcon />,
    title: "أمان وخصوصية",
    desc: "بياناتك وبيانات عملائك بأمان تام، وتحكم كامل لك في جميع الإعدادات والصلاحيات.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <QueryStatsIcon />,
    title: "تحليلات وتقارير فورية",
    desc: "اكتشف أسئلة واهتمامات عملائك ونمِّ مبيعاتك من خلال تقارير وتحليلات فورية.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <AccessTimeIcon />,
    title: "توفر دائم 24/7",
    desc: "كليم يعمل ليل نهار لخدمة عملائك وزيادة مبيعاتك دون توقف.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <LanguageIcon />,
    title: "واجهة عربية سهلة",
    desc: "لوحة تحكم واضحة ودعم كامل للغة العربية، لتتمكن من إدارة جميع مهامك بسهولة.",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
];