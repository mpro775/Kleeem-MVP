import { Box, Paper, Typography } from "@mui/material";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, Cell } from "recharts";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const COLORS = ["#0077b6", "#00b4d8", "#90e0ef", "#ff9e00", "#ff6d00", "#ff5400"];

type ProductChartType = {
  name: string;
  value: number;
  productId?: string;
};

interface ProductsChartProps {
  products: ProductChartType[];
}

export default function ProductsChart({ products }: ProductsChartProps) {
    const isEmpty = !products || products.length === 0;

  return (
<Paper sx={{ p: { xs: 1.5, md: 3 }, borderRadius: 3, boxShadow: 3, mb: 3 }}>      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>أعلى المنتجات تفاعلاً</Typography>
      {isEmpty ? (
        <Box sx={{ minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
          <InfoOutlinedIcon sx={{ fontSize: 44, mb: 1 }} />
          <Typography variant="body1" fontWeight={500}>لا توجد بيانات منتجات لعرضها حالياً</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>ابدأ التفاعل مع العملاء أو أضف منتجات ليظهر لك التحليل هنا.</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={products} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <RechartsTooltip
            formatter={(value: number) => [`${value} تفاعل`, "عدد التفاعلات"]}
            contentStyle={{
              borderRadius: 12,
              border: "none",
              boxShadow: "0px 2px 6px rgba(0,0,0,0.15)", // يجب أن يكون String وليس رقم
            }}
          />
          <Bar dataKey="value" fill="#E19930" radius={[0, 20, 20, 0]} barSize={20}>
            {products.map((_entry, index: number) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
        )}
    </Paper>
  );
}
