import { Box, Card, CardContent, Typography, Stack } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

interface MetricsCardsProps {
  sessionsCount: number;
  percentageChange: number;
  productsCount: number;
  keywordsCount: number;
  channelsCount: number;
}

export default function MetricsCards({
  sessionsCount,
  percentageChange,
  productsCount,
  keywordsCount,
  channelsCount,
}: MetricsCardsProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4, "& > *": { flex: "1 1 250px", minWidth: 250 } }}>
      {/* الجلسات */}
      <Card sx={{
        borderRadius: 3,
        boxShadow: 4,
        background: "linear-gradient(135deg, #0077b6, #00b4d8)",
        color: "white",
        position: "relative",
        overflow: "hidden"
      }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ opacity: 0.9 }}>الجلسات</Typography>
            <ChatIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          </Stack>
          <Typography variant="h3" sx={{ mt: 1, fontWeight: 800 }}>{sessionsCount ?? 0}</Typography>
          <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
            {percentageChange >= 0 ? (
              <ArrowUpwardIcon sx={{ color: "#4caf50" }} />
            ) : (
              <ArrowDownwardIcon sx={{ color: "#f44336" }} />
            )}
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {Math.abs(percentageChange)}% عن الفترة الماضية
            </Typography>
          </Stack>
        </CardContent>
      </Card>
      {/* المنتجات */}
      <Card sx={{ borderRadius: 3, boxShadow: 4, background: "linear-gradient(135deg, #8B4B47, #E19930)", color: "white", position: "relative" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ opacity: 0.9 }}>المنتجات المميزة</Typography>
            <ShoppingBagIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          </Stack>
          <Typography variant="h3" sx={{ mt: 1, fontWeight: 800 }}>{productsCount}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            أكثر {Math.min(productsCount, 3)} منتجات تفاعلاً
          </Typography>
        </CardContent>
      </Card>
      {/* الكلمات المفتاحية */}
      <Card sx={{ borderRadius: 3, boxShadow: 4, background: "linear-gradient(135deg, #3E2723, #795548)", color: "white", position: "relative" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ opacity: 0.9 }}>الكلمات المفتاحية</Typography>
            <SearchIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          </Stack>
          <Typography variant="h3" sx={{ mt: 1, fontWeight: 800 }}>{keywordsCount}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            أكثر {Math.min(keywordsCount, 3)} كلمات بحثاً
          </Typography>
        </CardContent>
      </Card>
      {/* القنوات */}
      <Card sx={{ borderRadius: 3, boxShadow: 4, background: "linear-gradient(135deg, #22c55e, #0d8a42)", color: "white", position: "relative" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ opacity: 0.9 }}>قنوات التواصل</Typography>
            <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          </Stack>
          <Typography variant="h3" sx={{ mt: 1, fontWeight: 800 }}>{channelsCount}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            أكثر القنوات استخداماً
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
