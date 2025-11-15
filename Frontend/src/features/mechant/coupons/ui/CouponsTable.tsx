// src/features/mechant/coupons/ui/CouponsTable.tsx
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
import type { Coupon } from "../type";
import {
  formatCouponValue,
  formatUsage,
  formatDateRange,
  getCouponStatusDisplay,
} from "../utils";

interface CouponsTableProps {
  coupons: Coupon[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (coupon: Coupon) => void;
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
}

export default function CouponsTable({
  coupons,
  loading = false,
  page,
  totalPages,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: CouponsTableProps) {
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
              <TableCell sx={{ fontWeight: 700 }}>الكود</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>نوع الخصم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القيمة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>عدد الاستخدامات</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الصلاحية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                إجراءات
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {coupons.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Stack
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    py={4}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      لا توجد كوبونات حالياً
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      قم بإنشاء كوبون جديد لزيادة مبيعاتك وتشجيع عملائك.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const status = getCouponStatusDisplay(coupon.status);
                return (
                  <TableRow key={coupon._id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          component="span"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {coupon.code}
                        </Typography>
                        {coupon.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                          >
                            {coupon.description}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {coupon.type === "percentage"
                          ? "خصم بنسبة"
                          : coupon.type === "fixed_amount"
                          ? "خصم بمبلغ ثابت"
                          : "شحن مجاني"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{formatCouponValue(coupon)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{formatUsage(coupon)}</Typography>
                      {coupon.oneTimePerCustomer ? (
                        <Typography variant="caption" color="text.secondary">
                          استخدام واحد لكل عميل
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography>{formatDateRange(coupon.startDate, coupon.endDate)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status.label}
                        color={status.color}
                        variant={status.color === "default" ? "outlined" : "filled"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="عرض التفاصيل">
                          <IconButton
                            color="primary"
                            onClick={() => onView(coupon)}
                            size="small"
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton
                            color="info"
                            onClick={() => onEdit(coupon)}
                            size="small"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            color="error"
                            onClick={() => onDelete(coupon)}
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
            onChange={(_, nextPage) => onPageChange(nextPage)}
            color="primary"
            dir="ltr"
          />
        </Stack>
      ) : null}
    </Paper>
  );
}

