import { Box, Chip, Typography } from "@mui/material";

export default function OrderHeader({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const label =
    (
      {
        pending: "قيد الانتظار",
        paid: "مدفوع",
        canceled: "ملغي",
        shipped: "تم الشحن",
        delivered: "تم التسليم",
        refunded: "مسترد",
      } as Record<string, string>
    )[status] || status;

  return (
    <Box
      sx={{
        backgroundColor: "var(--brand)",
        color: "var(--on-brand)",
        p: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "center",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
    >
      <Typography variant="h4" fontWeight="bold">
        الطلب #{orderId.substring(0, 8).toUpperCase()}
      </Typography>
      <Chip
        label={label}
        sx={{
          bgcolor: "var(--on-brand)",
          color: "var(--brand)",
          fontWeight: "bold",
          fontSize: 16,
          px: 2,
          py: 1,
          mt: { xs: 2, sm: 0 },
        }}
      />
    </Box>
  );
}
