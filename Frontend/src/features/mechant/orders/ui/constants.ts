// src/features/ui/constants.ts
import type { OrderStatus } from "../type";

// كائن لترجمة حالة الطلب إلى نص عربي
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  canceled: "ملغي",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  refunded: "مسترجع",
};

// دالة لتحديد لون الحالة
export function getStatusColor(
  status: OrderStatus
): "default" | "primary" | "success" | "info" | "warning" | "error" {
  switch (status) {
    case "pending":
      return "warning";
    case "paid":
      return "primary";
    case "shipped":
      return "info";
    case "delivered":
      return "success";
    case "refunded":
      return "default";
    case "canceled":
      return "error";
    default:
      return "default";
  }
}