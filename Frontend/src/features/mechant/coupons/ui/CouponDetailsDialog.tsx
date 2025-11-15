// src/features/mechant/coupons/ui/CouponDetailsDialog.tsx
import { useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";
import type { Coupon } from "../type";
import {
  formatCouponValue,
  formatDateRange,
  formatUsage,
  getCouponStatusDisplay,
} from "../utils";

interface CouponDetailsDialogProps {
  open: boolean;
  coupon?: Coupon | null;
  onClose: () => void;
  onEdit?: (coupon: Coupon) => void;
}

export default function CouponDetailsDialog({
  open,
  coupon,
  onClose,
  onEdit,
}: CouponDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!coupon) {
    return null;
  }

  const status = getCouponStatusDisplay(coupon.status);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const renderList = (items?: string[], emptyLabel?: string) => {
    if (!items || items.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel ?? "غير محدد"}
        </Typography>
      );
    }
    return (
      <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {items.map((item) => (
          <Typography
            key={item}
            component="li"
            variant="body2"
            sx={{ fontFamily: "monospace", direction: "ltr" }}
          >
            {item}
          </Typography>
        ))}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>تفاصيل الكوبون</DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5" sx={{ fontFamily: "monospace" }}>
              {coupon.code}
            </Typography>
            <Tooltip title={copied ? "تم النسخ" : "نسخ الكود"}>
              <IconButton size="small" color="primary" onClick={copyCode}>
                {copied ? (
                  <DoneIcon fontSize="small" />
                ) : (
                  <ContentCopyIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Chip
              label={status.label}
              color={status.color}
              variant={status.color === "default" ? "outlined" : "filled"}
            />
          </Stack>

          {coupon.description ? (
            <Typography variant="body1">{coupon.description}</Typography>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <InfoBlock label="نوع الخصم" value={couponTypeLabel(coupon.type)} />
            <InfoBlock label="قيمة الخصم" value={formatCouponValue(coupon)} />
            <InfoBlock
              label="الصلاحية الزمنية"
              value={formatDateRange(coupon.startDate, coupon.endDate)}
            />
            <InfoBlock label="عدد الاستخدامات" value={formatUsage(coupon)} />
          </Box>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <InfoBlock
              label="الحد الأدنى للطلب"
              value={
                coupon.minOrderAmount
                  ? `${coupon.minOrderAmount.toLocaleString("ar-EG")} ر.س`
                  : "غير محدد"
              }
            />
            <InfoBlock
              label="الحد الأقصى للخصم"
              value={
                coupon.maxDiscountAmount !== null &&
                coupon.maxDiscountAmount !== undefined
                  ? `${coupon.maxDiscountAmount.toLocaleString("ar-EG")} ر.س`
                  : "غير محدد"
              }
            />
            <InfoBlock
              label="محدد لعميل واحد"
              value={coupon.oneTimePerCustomer ? "نعم" : "لا"}
            />
            <InfoBlock
              label="تطبيق على المتجر بالكامل"
              value={coupon.storeWide ? "نعم" : "لا"}
            />
          </Box>

          <Divider />

          <Stack spacing={2}>
            <InfoBlock
              label="العملاء المسموح لهم"
              value={
                <Box sx={{ maxHeight: 160, overflowY: "auto" }}>
                  {renderList(coupon.allowedCustomers, "جميع العملاء")}
                </Box>
              }
            />
            <InfoBlock
              label="أرقام العملاء الذين استخدموا الكوبون"
              value={
                <Box sx={{ maxHeight: 160, overflowY: "auto" }}>
                  {renderList(coupon.usedByCustomers, "لم يستخدم بعد")}
                </Box>
              }
            />
            {!coupon.storeWide ? (
              <Stack spacing={2}>
                <InfoBlock
                  label="المنتجات المحددة"
                  value={
                    <Box sx={{ maxHeight: 160, overflowY: "auto" }}>
                      {renderList(coupon.products, "لم يتم تحديد منتجات")}
                    </Box>
                  }
                />
                <InfoBlock
                  label="الفئات المحددة"
                  value={
                    <Box sx={{ maxHeight: 160, overflowY: "auto" }}>
                      {renderList(coupon.categories, "لم يتم تحديد فئات")}
                    </Box>
                  }
                />
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        {onEdit ? (
          <Button variant="contained" color="primary" onClick={() => onEdit(coupon)}>
            تعديل الكوبون
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

interface InfoBlockProps {
  label: string;
  value: ReactNode;
}

function InfoBlock({ label, value }: InfoBlockProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      {typeof value === "string" || typeof value === "number" ? (
        <Typography variant="body1">{value}</Typography>
      ) : (
        value
      )}
    </Stack>
  );
}

function couponTypeLabel(type: Coupon["type"]): string {
  switch (type) {
    case "percentage":
      return "خصم بنسبة";
    case "fixed_amount":
      return "خصم بمبلغ ثابت";
    case "free_shipping":
    default:
      return "شحن مجاني";
  }
}

