// src/pages/store/MyOrdersPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "@/shared/api/axios";
import { getSessionId } from "@/shared/utils/session";
import { getLocalCustomer } from "@/shared/utils/customer";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Container,
  Stack,
  Divider,
  Card,
  CardContent,
  CardActions,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import DirectionsIcon from "@mui/icons-material/Directions";
import type { Order } from "@/features/store/type";
import { getStorefrontInfo } from "@/features/mechant/storefront-theme/api";
import { setBrandVars } from "@/features/shared/brandCss";
import { StoreNavbar } from "@/features/store/ui/StoreNavbar";
import { Footer } from "@/features/store/ui/Footer";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";
import type { Category } from "@/features/mechant/categories/type";

const STATUS_LABEL: Record<string, string> = {
  all: "الكل",
  pending: "قيد الانتظار",
  paid: "مدفوع",
  canceled: "ملغي",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  refunded: "مسترد",
};

const STATUS_KEYS = [
  "all",
  "pending",
  "paid",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

export default function MyOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string>("");
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeStatus, setActiveStatus] = useState<StatusKey>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const sid = getSessionId();
    setLoading(true);
    axiosInstance
      .get(`/storefront/${slug}`)
      .then(async (res) => {
        const mid = res.data.merchant._id as string;
        setMerchantId(mid);
        setMerchant(res.data.merchant);

        try {
          const sf = await getStorefrontInfo(mid);
          setBrandVars(sf.brandDark || "#111827");
        } catch {
          setBrandVars("#111827");
        }

        const phone = getLocalCustomer()?.phone;
        return axiosInstance.get(`/storefront/merchant/${mid}/my-orders`, {
          params: { sessionId: sid, phone },
        });
      })
      .then((res) => {
        const payload = res?.data;
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload)
          ? payload
          : [];
        setOrders(list);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const statusOk =
        activeStatus === "all" ? true : o.status === activeStatus;
      if (!statusOk) return false;
      if (!q) return true;
      const id = o._id?.toLowerCase() ?? "";
      const phone = o.customer?.phone?.toLowerCase() ?? "";
      const name = o.customer?.name?.toLowerCase() ?? "";
      return id.includes(q) || phone.includes(q) || name.includes(q);
    });
  }, [orders, activeStatus, query]);

  const totalSum = (o: Order) =>
    o.products.reduce((s, p) => s + p.price * p.quantity, 0);

  if (loading || !merchant) {
    return (
      <Box sx={{ p: 6, textAlign: "center", bgcolor: "#fff" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#fff" }}>
      {/* هيرو نحيف أنيق */}
      <StoreNavbar merchant={merchant} storefront={{} as any} />
      <Box
        sx={{
          position: "relative",
          color: "var(--on-brand)",
          background:
            "linear-gradient(135deg, var(--brand) 0%, rgba(0,0,0,0.55) 100%)",
          boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: -80,
            background:
              "radial-gradient(600px 300px at 85% -10%, rgba(255,255,255,0.16), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <Container
          maxWidth="lg"
          sx={{ py: { xs: 3, md: 4 }, position: "relative", zIndex: 1 }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LocalMallIcon />
              <Typography color="var(--on-brand)" variant="h5" fontWeight={800}>
                طلباتي
              </Typography>
              <Chip
                label={`${orders.length} إجمالي الطلبات`}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.14)",
                  color: "var(--on-brand)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Stack>

            {/* بحث سريع */}
            <TextField
              size="small"
              placeholder="ابحث برقم الطلب / الاسم / الجوال"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "var(--on-brand)" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: { xs: "100%", sm: 340 },
                "& .MuiOutlinedInput-root": {
                  background: "rgba(255,255,255,0.14)",
                  color: "var(--on-brand)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.28)" },
                },
              }}
            />
          </Stack>

          {/* فلاتر الحالة */}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 2 }}
          >
            {STATUS_KEYS.map((s) => (
              <Chip
                key={s}
                label={STATUS_LABEL[s]}
                onClick={() => setActiveStatus(s)}
                color={activeStatus === s ? "default" : undefined}
                sx={{
                  color: "var(--on-brand)",
                  background:
                    activeStatus === s
                      ? "rgba(255,255,255,0.26)"
                      : "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  backdropFilter: "blur(4px)",
                  fontWeight: activeStatus === s ? 700 : 500,
                }}
              />
            ))}
          </Stack>
        </Container>
      </Box>

      {/* المحتوى */}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {filtered.length === 0 ? (
          <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              لا توجد طلبات مطابقة لبحثك
            </Typography>
            <Typography sx={{ opacity: 0.8 }}>
              جرّب إزالة الفلاتر أو تغيير كلمات البحث.
            </Typography>
            <Button
              sx={{
                mt: 2.5,
                background: "var(--brand)",
                color: "var(--on-brand)",
                "&:hover": { background: "var(--brand-hover)" },
              }}
              variant="contained"
              onClick={() => nav(`/store/${slug}`)}
              startIcon={<DirectionsIcon />}
            >
              تصفح المنتجات
            </Button>
          </Paper>
        ) : isMobile ? (
          // موبايل: بطاقات
          <Stack spacing={2}>
            {filtered.map((o) => (
              <Card key={o._id} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="subtitle1" fontWeight={800}>
                      #{o._id.slice(0, 8).toUpperCase()}
                    </Typography>
                    <Chip
                      label={STATUS_LABEL[o.status] || o.status}
                      sx={{
                        bgcolor: "var(--brand)",
                        color: "var(--on-brand)",
                        fontWeight: "bold",
                        borderRadius: 2,
                      }}
                    />
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      <strong>العميل:</strong> {o.customer?.name || "—"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>الجوال:</strong> {o.customer?.phone || "—"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>الإجمالي:</strong> {totalSum(o).toFixed(2)} ر.س
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{
                      background: "var(--brand)",
                      color: "var(--on-brand)",
                      "&:hover": { background: "var(--brand-hover)" },
                    }}
                    onClick={() => nav(`/store/${slug}/order/${o._id}`)}
                  >
                    عرض التفاصيل
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        ) : (
          // ديسكتوب: جدول
          <Paper sx={{ overflowX: "auto", borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ background: "var(--brand)" }}>
                  {[
                    "رقم",
                    "العميل",
                    "الجوال",
                    "الإجمالي",
                    "الحالة",
                    "التاريخ",
                    "تفاصيل",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      sx={{ color: "var(--on-brand)", fontWeight: "bold" }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o._id} hover>
                    <TableCell>#{o._id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{o.customer?.name || "—"}</TableCell>
                    <TableCell>{o.customer?.phone || "—"}</TableCell>
                    <TableCell>{totalSum(o).toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[o.status] || o.status}
                        sx={{
                          bgcolor: "var(--brand)",
                          color: "var(--on-brand)",
                          fontWeight: "bold",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(o.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        sx={{
                          background: "var(--brand)",
                          color: "var(--on-brand)",
                          "&:hover": { background: "var(--brand-hover)" },
                        }}
                        variant="contained"
                        onClick={() => nav(`/store/${slug}/order/${o._id}`)}
                      >
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Container>
      <Footer merchant={merchant} categories={categories} />
    </Box>
  );
}
