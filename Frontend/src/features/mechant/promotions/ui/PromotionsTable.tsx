// src/features/mechant/promotions/ui/PromotionsTable.tsx
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Tooltip,
  Pagination,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { Promotion } from "../type";
import {
  formatApplyTo,
  formatDateRange,
  formatPromotionType,
  formatPromotionValue,
  formatUsage,
  getPromotionStatusDisplay,
} from "../utils";

interface PromotionsTableProps {
  promotions: Promotion[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (promotion: Promotion) => void;
  onEdit: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
}

export default function PromotionsTable({
  promotions,
  loading = false,
  page,
  totalPages,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: PromotionsTableProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box sx={{ width: "100%", position: "relative" }}>
        {loading ? (
          <LinearProgress
            color="primary"
            sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 }}
          />
        ) : null}

        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>الحملة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>نوع العرض</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القيمة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>نطاق التطبيق</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>مدة العرض</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الاستخدام</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                إجراءات
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {promotions.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Stack
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    py={4}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      لا توجد عروض ترويجية حالياً
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      قم بإنشاء عرض جديد للترويج لمنتجاتك وزيادة المبيعات.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promotion) => {
                const status = getPromotionStatusDisplay(promotion.status);
                return (
                  <TableRow key={promotion._id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          component="span"
                        >
                          {promotion.name}
                        </Typography>
                        {promotion.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                          >
                            {promotion.description}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {formatPromotionType(promotion.type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{formatPromotionValue(promotion)}</Typography>
                      {promotion.maxDiscountAmount ? (
                        <Typography variant="caption" color="text.secondary">
                          حد أقصى:{" "}
                          {promotion.maxDiscountAmount.toLocaleString("ar-EG")}{" "}
                          ر.س
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography>{formatApplyTo(promotion.applyTo)}</Typography>
                      {promotion.minCartAmount ? (
                        <Typography variant="caption" color="text.secondary">
                          حد السلة:{" "}
                          {promotion.minCartAmount.toLocaleString("ar-EG")} ر.س
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography>
                        {formatDateRange(promotion.startDate, promotion.endDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{formatUsage(promotion)}</Typography>
                      {promotion.totalDiscountGiven ? (
                        <Typography variant="caption" color="text.secondary">
                          إجمالي الخصم:{" "}
                          {promotion.totalDiscountGiven.toLocaleString("ar-EG")}{" "}
                          ر.س
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="عرض التفاصيل">
                          <IconButton
                            color="primary"
                            onClick={() => onView(promotion)}
                            size="small"
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton
                            color="info"
                            onClick={() => onEdit(promotion)}
                            size="small"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            color="error"
                            onClick={() => onDelete(promotion)}
                            size="small"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>

      {totalPages > 1 ? (
        <Stack alignItems="center" py={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, next) => onPageChange(next)}
            color="primary"
            dir="ltr"
          />
        </Stack>
      ) : null}
    </Paper>
  );
}

