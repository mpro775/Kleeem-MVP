import {
  Avatar,
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import { Storefront as StorefrontIcon } from "@mui/icons-material";
import type { OrderProduct } from "@/features/store/type";
import { formatMoney } from "@/features/store/order/utils";
import type { Currency } from "@/features/mechant/products/type";

export default function ItemsList({
  products,
  currency = "SAR",
}: {
  products: OrderProduct[];
  currency?: string;
}) {
  const theme = useTheme();
  return (
    <List
      sx={{
        backgroundColor: theme.palette.grey[50],
        borderRadius: 3,
        p: 2,
        mb: 3,
      }}
    >
      {products.map((item, idx) => (
        <ListItem
          key={idx}
          sx={{
            py: 2,
            borderBottom:
              idx < products.length - 1
                ? `1px solid ${theme.palette.divider}`
                : "none",
          }}
        >
          <Avatar
            src={item.image}
            variant="rounded"
            sx={{
              width: 60,
              height: 60,
              mr: 2,
              backgroundColor: theme.palette.grey[200],
            }}
          >
            <StorefrontIcon />
          </Avatar>
          <ListItemText
            primary={<Typography fontWeight="bold">{item.name}</Typography>}
            secondary={
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  {item.quantity} × {formatMoney(item.price, currency as Currency)}
                </Typography>
                <Typography fontWeight="bold">
                  {formatMoney(item.price * item.quantity, currency as Currency)}
                </Typography>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
