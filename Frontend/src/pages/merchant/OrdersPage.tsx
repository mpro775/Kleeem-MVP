// src/pages/OrderPage.tsx
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
  Pagination,
  Stack,
  Button,
} from "@mui/material";

// Hooks and API
import { useErrorHandler } from "@/shared/errors";
import { fetchOrders, updateOrderStatus } from "@/features/mechant/orders/api";
import type { Order, OrderStatus } from "@/features/mechant/orders/type";

// UI Components
import { OrdersTable } from "@/features/mechant/orders/ui/OrdersTable";
import { MobileOrdersView } from "@/features/mechant/orders/ui/MobileOrdersView";
import { OrderDetailsDialog } from "@/features/mechant/orders/ui/OrderDetailsDialog";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function OrdersPage() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const { handleError } = useErrorHandler();
  const query = useQuery();

  // State Management
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filter State (مثال مبسط، يمكن فصله في مكون خاص)
  const [filters] = useState({
    phone: query.get("phone") || "",
    status: "",
  });

  // Dialog State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetching data logic
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { orders: fetchedOrders, total } = await fetchOrders({
        page,
        limit: pageSize,
        phone: filters.phone || undefined,
        status: filters.status || undefined,
      });
      setOrders(fetchedOrders);
      setTotalOrders(total);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, handleError]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]); // سيتم استدعاء الدالة عند تغير أي من dependencies

  // Handlers
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      // تحديث الطلب في القائمة المحلية
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? updatedOrder : o))
      );
      // تحديث الطلب المفتوح في الحوار
      setSelectedOrder(updatedOrder);
    } catch (error) {
      handleError(error);
    }
  };

  const totalPages = Math.ceil(totalOrders / pageSize);

  return (
    <Box
      dir="rtl"
      sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f5f5f5", minHeight: "100vh" }}
    >
      <Typography variant="h5" fontWeight="bold" mb={2}>
        جميع الطلبات
      </Typography>

      {/* Filter Component would go here */}

      {loading ? (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: "center", bgcolor: "#fff" }}
        >
          <CircularProgress />
        </Paper>
      ) : !orders.length ? (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: "center", bgcolor: "#fff" }}
        >
          <Typography variant="body1" color="text.secondary">
            لا توجد طلبات تطابق بحثك
          </Typography>
          <Button sx={{ mt: 2 }} variant="contained">
            إضافة طلب يدوي
          </Button>
        </Paper>
      ) : isSm ? (
        <MobileOrdersView orders={orders} onOpenDetails={handleOpenDetails} />
      ) : (
        <OrdersTable orders={orders} onOpenDetails={handleOpenDetails} />
      )}

      {/* Pagination Component would go here */}
      {!loading && totalOrders > 0 && (
        <Stack alignItems="center" mt={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Stack>
      )}

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={handleCloseDialog}
        onUpdateStatus={handleUpdateStatus}
      />
    </Box>
  );
}
