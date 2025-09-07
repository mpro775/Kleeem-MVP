// src/features/ui/MobileOrdersView.tsx
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  Button,
  Box,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { format } from "date-fns";
import type { Order } from "../type";
import { STATUS_LABEL, getStatusColor } from "./constants";

interface MobileOrdersViewProps {
  orders: Order[];
  onOpenDetails: (order: Order) => void;
}

// دالة مساعدة لحساب الإجمالي
const calculateTotal = (order: Order) => {
  return (order.products || []).reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );
};

export function MobileOrdersView({
  orders,
  onOpenDetails,
}: MobileOrdersViewProps) {
  // هذا المكون الآن يركز فقط على كيفية عرض الطلبات في الجوال
  // لا يحتوي على أي منطق لجلب البيانات أو إدارة الحالة

  if (!orders.length) {
    // يمكنك وضع رسالة "لا توجد طلبات" هنا أو تركها للمكون الأب
    return null;
  }

  return (
    <Stack spacing={2}>
      {orders.map((order) => {
        const total = calculateTotal(order);

        return (
          <Card
            key={order._id}
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <CardContent>
              <Stack spacing={2}>
                {/* Header */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    #{order._id.substring(0, 8).toUpperCase()}
                  </Typography>
                  <Chip
                    label={STATUS_LABEL[order.status] || order.status}
                    color={getStatusColor(order.status)}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                {/* Customer Info */}
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>العميل:</strong> {order.customer?.name || "-"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الإجمالي:</strong> {total.toFixed(2)} ر.س
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>التاريخ:</strong>{" "}
                    {format(new Date(order.createdAt), "yyyy/MM/dd HH:mm")}
                  </Typography>
                </Stack>

                {/* Action Button */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<InfoIcon />}
                  onClick={() => onOpenDetails(order)}
                  fullWidth
                >
                  عرض التفاصيل
                </Button>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
