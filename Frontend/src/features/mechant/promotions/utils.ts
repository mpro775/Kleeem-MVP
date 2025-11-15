// src/features/mechant/promotions/utils.ts
import dayjs from "dayjs";
import "dayjs/locale/ar";
import type { ApplyTo, Promotion, PromotionStatus, PromotionType } from "./type";

dayjs.locale("ar");

export type PromotionStatusDisplay = {
  label: string;
  color: "success" | "warning" | "default" | "info";
};

export function formatPromotionType(type: PromotionType): string {
  switch (type) {
    case "percentage":
      return "خصم بنسبة";
    case "fixed_amount":
      return "خصم بمبلغ ثابت";
    case "cart_threshold":
      return "خصم تلقائي عند حد سلة";
    default:
      return type;
  }
}

export function formatPromotionValue(promotion: Promotion): string {
  if (promotion.type === "percentage") {
    return `${promotion.discountValue}%`;
  }

  return `${promotion.discountValue.toLocaleString("ar-EG")} ر.س`;
}

export function formatApplyTo(applyTo: ApplyTo): string {
  switch (applyTo) {
    case "all":
      return "كل المنتجات";
    case "categories":
      return "فئات محددة";
    case "products":
      return "منتجات محددة";
    default:
      return applyTo;
  }
}

export function formatUsage(promotion: Promotion): string {
  const used = promotion.timesUsed ?? 0;

  if (promotion.usageLimit === null || promotion.usageLimit === undefined) {
    return `${used} / غير محدود`;
  }

  return `${used} / ${promotion.usageLimit}`;
}

export function formatDateRange(
  start?: string | null,
  end?: string | null
): string {
  const format = (value?: string | null) =>
    value ? dayjs(value).locale("ar").format("DD MMM YYYY") : undefined;

  const startLabel = format(start);
  const endLabel = format(end);

  if (!startLabel && !endLabel) {
    return "دون تاريخ محدد";
  }

  if (!startLabel) {
    return `حتى ${endLabel}`;
  }

  if (!endLabel) {
    return `من ${startLabel}`;
  }

  return `${startLabel} - ${endLabel}`;
}

export function getPromotionStatusDisplay(
  status: PromotionStatus
): PromotionStatusDisplay {
  switch (status) {
    case "active":
      return { label: "نشط", color: "success" };
    case "inactive":
      return { label: "متوقف", color: "warning" };
    case "scheduled":
      return { label: "مجدول", color: "info" };
    case "expired":
    default:
      return { label: "منتهي", color: "default" };
  }
}

