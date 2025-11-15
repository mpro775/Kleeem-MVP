// src/features/mechant/promotions/ui/PromotionDetailsDialog.tsx
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
import type { Promotion } from "../type";
import {
  formatApplyTo,
  formatDateRange,
  formatPromotionType,
  formatPromotionValue,
  formatUsage,
  getPromotionStatusDisplay,
} from "../utils";

interface PromotionDetailsDialogProps {
  open: boolean;
  promotion?: Promotion | null;
  onClose: () => void;
  onEdit?: (promotion: Promotion) => void;
}

export default function PromotionDetailsDialog({
  open,
  promotion,
  onClose,
  onEdit,
}: PromotionDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!promotion) {
    return null;
  }

  const status = getPromotionStatusDisplay(promotion.status);

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(promotion.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>تفاصيل العرض</DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              {promotion.name}
            </Typography>
            <Tooltip title={copied ? "تم النسخ" : "نسخ الاسم"}>
              <IconButton size="small" color="primary" onClick={copyName}>
                {copied ? (
                  <DoneIcon fontSize="small" />
                ) : (
                  <ContentCopyIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Chip
              label={status.label}
              color={
                status.color === "default"
                  ? "default"
                  : status.color === "info"
                  ? "info"
                  : status.color
              }
              variant={status.color === "default" ? "outlined" : "filled"}
            />
          </Stack>

          {promotion.description ? (
            <Typography variant="body1">{promotion.description}</Typography>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <InfoBlock label="نوع العرض" value={formatPromotionType(promotion.type)} />
            <InfoBlock label="قيمة الخصم" value={formatPromotionValue(promotion)} />
            <InfoBlock
              label="الحد الأقصى للخصم"
              value={
                promotion.maxDiscountAmount !== null &&
                promotion.maxDiscountAmount !== undefined
                  ? `${promotion.maxDiscountAmount.toLocaleString("ar-EG")} ر.س`
                  : "غير محدد"
              }
            />
            <InfoBlock
              label="الحد الأدنى للسلة"
              value={
                promotion.minCartAmount
                  ? `${promotion.minCartAmount.toLocaleString("ar-EG")} ر.س`
                  : "غير محدد"
              }
            />
          </Box>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <InfoBlock label="نطاق التطبيق" value={formatApplyTo(promotion.applyTo)} />
            <InfoBlock
              label="الفترة الزمنية"
              value={formatDateRange(promotion.startDate, promotion.endDate)}
            />
            <InfoBlock
              label="الأولوية"
              value={
                promotion.priority !== undefined
                  ? promotion.priority.toString()
                  : "غير محدد"
              }
            />
            <InfoBlock
              label="عداد تنازلي"
              value={promotion.countdownTimer ? "مفعل" : "غير مفعل"}
            />
          </Box>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <InfoBlock label="حد الاستخدام" value={formatUsage(promotion)} />
            <InfoBlock
              label="إجمالي الخصم الممنوح"
              value={
                promotion.totalDiscountGiven
                  ? `${promotion.totalDiscountGiven.toLocaleString("ar-EG")} ر.س`
                  : "0 ر.س"
              }
            />
            <InfoBlock
              label="تاريخ الإنشاء"
              value={
                promotion.createdAt
                  ? new Date(promotion.createdAt).toLocaleString("ar-EG")
                  : "غير متوفر"
              }
            />
            <InfoBlock
              label="آخر تحديث"
              value={
                promotion.updatedAt
                  ? new Date(promotion.updatedAt).toLocaleString("ar-EG")
                  : "غير متوفر"
              }
            />
          </Box>

          {promotion.applyTo === "categories" ? (
            <InfoBlock
              label="الفئات المحددة"
              value={
                <ScrollableList
                  items={promotion.categoryIds}
                  emptyLabel="لم يتم تحديد فئات"
                />
              }
            />
          ) : null}

          {promotion.applyTo === "products" ? (
            <InfoBlock
              label="المنتجات المحددة"
              value={
                <ScrollableList
                  items={promotion.productIds}
                  emptyLabel="لم يتم تحديد منتجات"
                />
              }
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        {onEdit ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => onEdit(promotion)}
          >
            تعديل العرض
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

interface ScrollableListProps {
  items?: string[];
  emptyLabel: string;
}

function ScrollableList({ items, emptyLabel }: ScrollableListProps) {
  if (!items || items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Box
      component="ul"
      sx={{
        listStyle: "none",
        p: 0,
        m: 0,
        maxHeight: 160,
        overflowY: "auto",
      }}
    >
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
    </Box>
  );
}

