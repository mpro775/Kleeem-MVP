import { Box, Button, IconButton } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router-dom";
import { useOrderDetails } from "@/features/store/order/hooks/useOrderDetails";
import OrderHeader from "@/features/store/order/ui/OrderHeader";
import CustomerInfoCard from "@/features/store/order/ui/CustomerInfoCard";
import OrderInfoCard from "@/features/store/order/ui/OrderInfoCard";
import ItemsList from "@/features/store/order/ui/ItemsList";
import SummaryCard from "@/features/store/order/ui/SummaryCard";
import StatusTimeline from "@/features/store/order/ui/StatusTimeline";
import OrderDetailsSkeleton from "@/features/store/order/ui/OrderDetailsSkeleton";
import { useErrorHandler } from "@/shared/errors";

export default function OrderDetailsPage() {
  const { orderId = "", slug = "" } = useParams<{
    orderId: string;
    slug: string;
  }>();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();

  const { order, merchant, loading } = useOrderDetails(orderId, slug);

  if (!orderId) {
    // لو وصلنا بدون id، ارجع للمتجر أو للخلف
    navigate(`/store/${slug}`);
    return null;
  }

  if (loading) return <OrderDetailsSkeleton />;

  if (!order) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "70vh",
          justifyContent: "center",
          textAlign: "center",
          p: 3,
        }}
      >
        تعذر تحميل تفاصيل الطلب
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          العودة
        </Button>
      </Box>
    );
  }

  const currency = (order as any).currency || "SAR";

  const steps = [
    { label: "تم الطلب", date: "١٠ مارس ٢٠٢٣", time: "١٠:٣٠ ص", active: true },
    {
      label: "قيد التجهيز",
      date: "١٠ مارس ٢٠٢٣",
      time: "١١:٤٥ ص",
      active: order.status !== "pending",
    },
    {
      label: "تم التوصيل",
      date: "١٢ مارس ٢٠٢٣",
      time: "٠٢:٣٠ م",
      active: ["delivered", "paid"].includes(order.status as any),
    },
  ];

  return (
    <Box
      sx={{
        maxWidth: "md",
        mx: "auto",
        py: 4,
        px: { xs: 2, sm: 3 },
        bgcolor: "#fff",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          <ArrowBack sx={{ mr: 1 }} />
          العودة
        </IconButton>
      </Box>

      <Box
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          mb: 4,
        }}
      >
        <OrderHeader orderId={order._id} status={order.status} />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, mb: 4 }}>
            <CustomerInfoCard order={order} />
            <OrderInfoCard order={order} merchant={merchant} />
          </Box>

          <ItemsList products={order.products} currency={currency} />

          <SummaryCard
            products={order.products}
            shipping={0}
            discount={0}
            currency={currency}
          />

          <StatusTimeline steps={steps} />

          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 5, gap: 2 }}
          >
            <Button
              variant="contained"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: "bold",
                background: "var(--brand)",
                color: "var(--on-brand)",
                "&:hover": { background: "var(--brand-hover)" },
              }}
              onClick={() =>
                navigate(
                  `/store/${
                    merchant?.publicSlug ||
                    merchant?._id ||
                    order.merchantId ||
                    ""
                  }`
                )
              }
            >
              متابعة التسوق
            </Button>
            <Button
              variant="outlined"
              sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: "bold" }}
              onClick={() => window.print()}
            >
              طباعة الفاتورة
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
