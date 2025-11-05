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
  translationKey: string; // مفتاح الترجمة
  gradient: string;
}

// تصدير مصفوفة الميزات مع مفاتيح الترجمة
export const featuresConfig: Feature[] = [
  {
    icon: <AutoAwesomeIcon />,
    translationKey: "smartDialect",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <HubIcon />,
    translationKey: "allInOne",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <ThumbUpAltIcon />,
    translationKey: "instantReplies",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <StoreIcon />,
    translationKey: "easyIntegration",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <SecurityIcon />,
    translationKey: "security",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <QueryStatsIcon />,
    translationKey: "analytics",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <AccessTimeIcon />,
    translationKey: "alwaysAvailable",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
  {
    icon: <LanguageIcon />,
    translationKey: "arabicInterface",
    gradient: "linear-gradient(90deg, #7E66AC, #502e91)",
  },
];