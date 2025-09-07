import { Card, CardContent, Typography, Box, useTheme } from "@mui/material";
import {
  Policy,
  Autorenew,
  LocalShipping,
  Description,
} from "@mui/icons-material";
import type { MerchantInfo } from "../type";

type Props = { merchant: MerchantInfo };

export default function PoliciesSection({ merchant }: Props) {
  const theme = useTheme();

  const PolicyCard = ({
    icon,
    title,
    text,
  }: {
    icon: React.ReactNode;
    title: string;
    text: string;
  }) => (
    <Box
      sx={{
        flex: 1,
        backgroundColor: theme.palette.grey[50],
        borderRadius: 3,
        p: 3,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          color: "var(--brand)",
        }}
      >
        {icon}
        <Typography variant="h6" fontWeight="bold" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      <Typography>{text}</Typography>
    </Box>
  );

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography
          variant="h5"
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            color: "var(--brand)",
          }}
        >
          <Policy sx={{ mr: 1 }} /> سياسات المتجر
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          <PolicyCard
            icon={<Autorenew sx={{ fontSize: 30 }} />}
            title="سياسة الاستبدال"
            text={
              merchant.exchangePolicy ||
              "يمكنك استبدال المنتجات خلال 7 أيام من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية مع الاحتفاظ بالفاتورة."
            }
          />
          <PolicyCard
            icon={<LocalShipping sx={{ fontSize: 30 }} />}
            title="سياسة الشحن"
            text={
              merchant.shippingPolicy ||
              "نقدم خدمة الشحن لجميع الأنحاء خلال 2-5 أيام عمل. الشحن مجاني للطلبات فوق 200 ر.س."
            }
          />
          <PolicyCard
            icon={<Description sx={{ fontSize: 30 }} />}
            title="سياسة الاسترجاع"
            text={
              merchant.returnPolicy ||
              "يمكنك إرجاع المنتجات خلال 14 يومًا من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية مع الاحتفاظ بالفاتورة."
            }
          />
        </Box>
      </CardContent>
    </Card>
  );
}
