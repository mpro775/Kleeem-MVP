// src/features/mechant/coupons/utils.ts
import dayjs from "dayjs";
import "dayjs/locale/ar";
import type { Coupon } from "./type";

dayjs.locale("ar");

export type CouponStatusDisplay = {
  label: string;
  color: "success" | "warning" | "default";
};

export function formatCouponValue(coupon: Coupon): string {
  switch (coupon.type) {
    case "percentage":
      return `${coupon.value}%`;
    case "fixed_amount":
      return `${coupon.value.toLocaleString("ar-EG")} ر.س`;
    case "free_shipping":
      return "شحن مجاني";
    default:
      return coupon.value.toString();
  }
}

export function formatUsage(coupon: Coupon): string {
  if (coupon.usageLimit === null || coupon.usageLimit === undefined) {
    return `${coupon.usedCount} / غير محدود`;
  }
  return `${coupon.usedCount} / ${coupon.usageLimit}`;
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

export function getCouponStatusDisplay(
  status: Coupon["status"]
): CouponStatusDisplay {
  switch (status) {
    case "active":
      return { label: "نشط", color: "success" };
    case "inactive":
      return { label: "متوقف", color: "warning" };
    case "expired":
    default:
      return { label: "منتهي", color: "default" };
  }
}

