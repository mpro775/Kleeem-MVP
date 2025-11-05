'use client';

// src/components/landing/integrationsData.tsx
import React from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import SallaIcon from "/assets/Salla.svg";
import ZidIcon from "/assets/Zid.svg";
import ShopifyIcon from "/assets/Shopify.svg";
import WooCommerceIcon from "/assets/WooCommerce.svg";

export interface IntegrationItem {
  title: string;
  desc: string;
  iconImg?: string;
  Icon?: React.ElementType<SvgIconProps>;
  soon?: boolean;
  scale?: number;
}

export const items: IntegrationItem[] = [
  {
    title: "Salla",
    desc: "مزامنة سلسة للمنتجات، الأسعار، والمخزون مع متجرك.",
    iconImg: SallaIcon,
    scale: 1.25,
  },
  {
    title: "Zid",
    desc: "تحديثات فورية للمخزون وبيانات المنتجات تلقائيًا.",
    iconImg: ZidIcon,
    scale: 1.25,
  },
  {
    title: "Shopify",
    desc: "تكامل عالمي لمتجر إلكتروني احترافي.",
    iconImg: ShopifyIcon,
    soon: true,
  },
  {
    title: "WooCommerce",
    desc: "ربط قوي مع منصة ووردبريس لإدارة أعمالك.",
    iconImg: WooCommerceIcon,
    soon: true,
  },
  // يمكنك إضافة المزيد من التكاملات هنا
];
