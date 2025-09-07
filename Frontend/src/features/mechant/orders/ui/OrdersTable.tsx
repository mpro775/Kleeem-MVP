// src/features/ui/OrdersTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { format } from "date-fns";
import type { Order } from "../type";
import { STATUS_LABEL, getStatusColor } from "./constants";

interface OrdersTableProps {
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

export function OrdersTable({ orders, onOpenDetails }: OrdersTableProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflowX: "auto",
        bgcolor: "#fff",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>رقم الطلب</TableCell>
            <TableCell>العميل</TableCell>
            <TableCell>الجوال</TableCell>
            <TableCell>الإجمالي</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>تاريخ الطلب</TableCell>
            <TableCell>إجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order._id} hover>
              <TableCell>{order._id.substring(0, 8).toUpperCase()}</TableCell>
              <TableCell>{order.customer?.name || "-"}</TableCell>
              <TableCell>{order.customer?.phone || "-"}</TableCell>
              <TableCell>{calculateTotal(order).toFixed(2)} ر.س</TableCell>
              <TableCell>
                <Chip
                  label={STATUS_LABEL[order.status] || order.status}
                  color={getStatusColor(order.status)}
                  variant="outlined"
                  sx={{ fontWeight: "bold" }}
                />
              </TableCell>
              <TableCell>
                {format(new Date(order.createdAt), "yyyy/MM/dd HH:mm")}
              </TableCell>
              <TableCell>
                <Tooltip title="تفاصيل الطلب">
                  <IconButton onClick={() => onOpenDetails(order)}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
