'use client';

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Button,
  Box,
  Avatar,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import MenuIcon from "@mui/icons-material/Menu";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useCart } from "@/contexts/CartContext";
import type { MerchantInfo } from "@/features/merchant/merchant-settings/types";
import type { Storefront } from "@/features/merchant/storefront-theme/type";
import CartDialog from "./CartDialog";
import CustomerInfoDialog from "@/features/store/home/ui/CustomerInfoDialog";
import { useNavigate, useParams } from "react-router-dom";
import { getSessionId } from "@/lib/utils/session";
import { getLocalCustomer } from "@/lib/utils/customer";
import type { CustomerInfo } from "@/features/store/type";

interface Props {
  merchant: MerchantInfo;
  storefront: Storefront;
}

export function StoreNavbar({ merchant }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { items } = useCart();
  const [openCart, setOpenCart] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const openMenu = Boolean(anchorEl);
  const handleMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const sessionId = getSessionId();
  const defaultCustomer = getLocalCustomer() as CustomerInfo;

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          borderRadius: 0,
          backgroundColor: "var(--brand)",
          color: "var(--on-brand)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar sx={{ maxWidth: 1280, mx: "auto", width: "100%", py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            {merchant.logoUrl && (
              <Avatar
                src={merchant.logoUrl}
                alt={merchant.name}
                sx={{
                  width: 48,
                  height: 48,
                  mr: 2,
                  border: "1px solid rgba(255,255,255,0.25)",
                  bgcolor: "transparent",
                }}
              />
            )}

            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
              onClick={() => navigate(`/store/${slug}`)}
            >
              <StorefrontIcon sx={{ mr: 1 }} />
              {merchant.name}
            </Typography>
          </Box>

          {isMobile ? (
            <>
              <IconButton
                size="large"
                onClick={handleMenu}
                sx={{
                  color: "var(--on-brand)",
                  "&:hover": { backgroundColor: "var(--brand-hover)" },
                }}
              >
                <MenuIcon />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseMenu}
              >
                <MenuItem
                  onClick={() => {
                    navigate(`/store/${slug}`);
                    handleCloseMenu();
                  }}
                >
                  الصفحة الرئيسية
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    navigate(`/store/${slug}/about`);
                    handleCloseMenu();
                  }}
                >
                  من نحن
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    navigate(`/store/${slug}/my-orders`);
                    handleCloseMenu();
                  }}
                >
                  طلباتي
                </MenuItem>

                {/* ✅ معلوماتي داخل القائمة في الموبايل */}
                <MenuItem
                  onClick={() => {
                    setOpenInfo(true);
                    handleCloseMenu();
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <InfoOutlinedIcon sx={{ mr: 1 }} />
                    معلوماتي
                  </Box>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setOpenCart(true);
                    handleCloseMenu();
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <ShoppingCartIcon sx={{ mr: 1 }} />
                    السلة
                    {items.length > 0 && (
                      <Badge
                        badgeContent={items.length}
                        color="error"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button
                sx={{
                  fontWeight: "bold",
                  mx: 1,
                  background: "var(--brand)",
                  color: "var(--on-brand)",
                  "&:hover": { backgroundColor: "var(--brand-hover)" },
                }}
                onClick={() => navigate(`/store/${slug}`)}
              >
                الصفحة الرئيسية
              </Button>

              <Button
                sx={{
                  fontWeight: "bold",
                  mx: 1,
                  color: "var(--on-brand)",
                  background: "var(--brand)",
                  "&:hover": { backgroundColor: "var(--brand-hover)" },
                }}
                onClick={() => navigate(`/store/${slug}/about`)}
              >
                من نحن
              </Button>

              <Button
                sx={{
                  fontWeight: "bold",
                  mx: 1,
                  background: "var(--brand)",
                  color: "var(--on-brand)",
                  "&:hover": { backgroundColor: "var(--brand-hover)" },
                }}
                onClick={() => navigate(`/store/${slug}/my-orders`)}
              >
                طلباتي
              </Button>

              {/* ✅ زر معلوماتي في الديسكتوب */}
              <Button
                sx={{
                  fontWeight: "bold",
                  mx: 1,
                  background: "var(--brand)",
                  color: "var(--on-brand)",
                  "&:hover": { backgroundColor: "var(--brand-hover)" },
                }}
                onClick={() => setOpenInfo(true)}
              >
                معلوماتي
              </Button>

              <IconButton
                sx={{
                  ml: 2,
                  color: "var(--on-brand)",
                  "&:hover": { backgroundColor: "var(--brand-hover)" },
                }}
                onClick={() => setOpenCart(true)}
              >
                <Badge badgeContent={items.length} color="error">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* ✅ سلة المشتريات */}
      <CartDialog
        open={openCart}
        onClose={() => setOpenCart(false)}
        merchantId={merchant._id}
        sessionId={sessionId}
        defaultCustomer={defaultCustomer}
        onOrderSuccess={(orderId) => {
          navigate(`/store/${slug}/order/${orderId}`);
        }}
      />

      {/* ✅ دايلوج معلوماتي */}
      <CustomerInfoDialog
        open={openInfo}
        onClose={() => setOpenInfo(false)}
        merchantId={merchant._id}
      />
    </>
  );
}
