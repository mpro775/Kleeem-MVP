'use client';

import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Phone, LocationOn, Public, Email } from "@mui/icons-material";
import type { MerchantInfo } from '../types';
import { getPrimaryAddress } from "../utils/transform";

type Props = { merchant: MerchantInfo };

export default function ContactCard({ merchant }: Props) {
  return (
    <Card sx={{ borderRadius: 3, height: "100%" }}>
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
          <Phone sx={{ mr: 1 }} /> معلومات التواصل
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Phone sx={{ color: "var(--brand)" }} />
            </ListItemIcon>
            <ListItemText
              primary="رقم الهاتف"
              secondary={merchant.phone || "غير متوفر"}
              secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LocationOn sx={{ color: "var(--brand)" }} />
            </ListItemIcon>
            <ListItemText
              primary="العنوان"
              secondary={getPrimaryAddress(merchant.addresses)}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Email sx={{ color: "var(--brand)" }} />
            </ListItemIcon>
            <ListItemText
              primary="البريد الإلكتروني"
              secondary={merchant.email || "غير متوفر"}
              secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Public sx={{ color: "var(--brand)" }} />
            </ListItemIcon>
            <ListItemText
              primary="الموقع الإلكتروني"
              secondary={merchant.storefrontUrl || "—"}
              secondaryTypographyProps={{ sx: { fontWeight: "bold" } }}
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
}
