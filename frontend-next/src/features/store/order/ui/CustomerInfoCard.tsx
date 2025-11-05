'use client';

import {
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";
import { Person, Phone, LocationOn } from "@mui/icons-material";
import type { Order } from "@/features/store/type";

export default function CustomerInfoCard({ order }: { order: Order }) {
  return (
    <Box sx={{ flex: 1, minWidth: 300 }}>
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{ mb: 2, display: "flex", alignItems: "center" }}
      >
        <Person sx={{ mr: 1, color: "var(--brand)" }} /> معلومات العميل
      </Typography>
      <List>
        <ListItem sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Person sx={{ color: "var(--brand)" }} />
          </ListItemIcon>
          <ListItemText
            primary="الاسم"
            secondary={order.customer?.name || "—"}
            secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
          />
        </ListItem>
        <ListItem sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Phone sx={{ color: "var(--brand)" }} />
          </ListItemIcon>
          <ListItemText
            primary="رقم الجوال"
            secondary={order.customer?.phone || "—"}
            secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
          />
        </ListItem>
        <ListItem sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LocationOn sx={{ color: "var(--brand)" }} />
          </ListItemIcon>
          <ListItemText
            primary="العنوان"
            secondary={
              typeof order.customer?.address === "string"
                ? order.customer?.address
                : order.customer?.address?.line1 || "غير متوفر"
            }
            secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
          />
        </ListItem>
      </List>
    </Box>
  );
}
