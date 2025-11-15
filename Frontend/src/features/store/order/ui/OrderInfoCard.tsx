import {
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";
import {
  Receipt,
  Storefront as StorefrontIcon,
  Payment,
} from "@mui/icons-material";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";
import type { Order } from "@/features/store/type";
import { useNavigate } from "react-router-dom";

export default function OrderInfoCard({
  order,
  merchant,
}: {
  order: Order;
  merchant: MerchantInfo | null;
}) {
  const navigate = useNavigate();
  return (
    <Box sx={{ flex: 1, minWidth: 300 }}>
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{ mb: 2, display: "flex", alignItems: "center" }}
      >
        <Receipt sx={{ mr: 1, color: "var(--brand)" }} /> معلومات الطلب
      </Typography>
      <List>
        <ListItem sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Receipt sx={{ color: "var(--brand)" }} />
          </ListItemIcon>
          <ListItemText
            primary="رقم الطلب"
            secondary={`#${order._id.substring(0, 8).toUpperCase()}`}
            secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
          />
        </ListItem>
        <ListItem sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <StorefrontIcon sx={{ color: "var(--brand)" }} />
          </ListItemIcon>
          <ListItemText
            primary="المتجر"
            secondary={merchant?.name || "متجرنا"}
            onClick={() =>
              navigate(
                `/store/${
                  merchant?.publicSlug || merchant?._id || order.merchantId
                }`
              )
            }
            secondaryTypographyProps={{
              sx: { fontWeight: "bold", cursor: "pointer" },
            }}
          />
        </ListItem>
        <ListItem sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Payment sx={{ color: "var(--brand)" }} />
          </ListItemIcon>
          <ListItemText
            primary="طريقة الدفع"
            secondary="الدفع عند الاستلام"
            secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
          />
        </ListItem>
      </List>
    </Box>
  );
}
