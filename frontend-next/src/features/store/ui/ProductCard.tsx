'use client';

import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  IconButton,
  Chip,
  useTheme,
} from "@mui/material";
import type { Offer, ProductResponse } from "@/features/merchant/products/types";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ShareIcon from "@mui/icons-material/Share";
import StarIcon from "@mui/icons-material/Star";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { useState } from "react";

type Props = {
  product: ProductResponse;
  onAddToCart: (p: ProductResponse) => void;
  onOpen: (p: ProductResponse) => void;
  viewMode: "grid" | "list";
};

function getDiscountPct(p: ProductResponse): number {
  const oldP = p.offer?.oldPrice;
  const newP = p.offer?.newPrice;
  const enabled = (p.offer as Offer)?.enabled ?? true; // إن وُجد علم التفعيل
  if (!enabled || !oldP || !newP || newP >= oldP) return 0;
  return Math.round((1 - newP / oldP) * 100);
}

export function ProductCard({ product, onAddToCart, onOpen, viewMode }: Props) {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const rating = 4.5;

  const statusColor =
    product.status === "out_of_stock"
      ? "error"
      : product.status === "inactive"
      ? "default"
      : "success";

  const statusText =
    product.status === "out_of_stock"
      ? "منتهي"
      : product.status === "inactive"
      ? "غير متوفر"
      : "متوفر";

  const pct = getDiscountPct(product);
  const showOffer = pct > 0;
  const sellPrice = showOffer
    ? (product.offer!.newPrice as number)
    : product.price ?? 0;
  const oldPrice = showOffer ? (product.offer!.oldPrice as number) : undefined;

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen(product)}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: viewMode === "grid" ? "column" : "row",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s ease",
        position: "relative",
        boxShadow: isHovered
          ? "0 10px 25px rgba(0,0,0,0.1)"
          : "0 2px 10px rgba(0,0,0,0.05)",
        transform: isHovered ? "translateY(-5px)" : "none",
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: "#fff",
      }}
    >
      {/* شارة الخصم (٪) */}
      {showOffer && (
        <Chip
          label={`خصم ${pct}%`}
          color="error"
          size="small"
          sx={{
            position: "absolute",
            top: { xs: 8, sm: 12 },
            left: { xs: 8, sm: 12 },
            zIndex: 2,
            fontWeight: "bold",
            fontSize: { xs: "0.7rem", sm: "inherit" },
            height: { xs: 20, sm: 32 }
          }}
        />
      )}

      {/* شارة سريع البيع */}
      {product.lowQuantity && product.lowQuantity < 10 && (
        <Chip
          label="ينفد سريعاً"
          color="warning"
          size="small"
          icon={<FlashOnIcon fontSize="small" sx={{ fontSize: { xs: 14, sm: 18 } }} />}
          sx={{
            position: "absolute",
            top: showOffer ? { xs: 36, sm: 50 } : { xs: 8, sm: 12 },
            left: { xs: 8, sm: 12 },
            zIndex: 2,
            fontWeight: "bold",
            fontSize: { xs: "0.7rem", sm: "inherit" },
            height: { xs: 20, sm: 32 }
          }}
        />
      )}

      {/* صورة المنتج */}
              <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
            width: viewMode === "grid" ? "100%" : 240,
            height: viewMode === "grid" ? { xs: 160, sm: 220 } : 200,
          }}
        >
        {product.images?.[0] ? (
          <CardMedia
            component="img"
            height="100%"
            image={product.images[0]}
            alt={product.name}
            sx={{
              objectFit: "contain",
              objectPosition: "center",
              backgroundColor: "#f8f9fa",
              width: "100%",
              height: "100%",
              transition: "transform 0.5s ease",
              transform: isHovered ? "scale(1.05)" : "scale(1)",
              // ضمان ظهور الصورة كاملة
              maxWidth: "100%",
              maxHeight: "100%",
              // تحسين جودة الصورة
              imageRendering: "auto",
              // إضافة ظل خفيف للصورة
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.palette.grey[100],
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary" variant="body2">
              لا توجد صورة
            </Typography>
          </Box>
        )}

        {/* أزرار الإجراءات السريعة */}
        <Box
          sx={{
            position: "absolute",
            top: { xs: 8, sm: 12 },
            right: { xs: 8, sm: 12 },
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            gap: { xs: 0.5, sm: 1 },
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <IconButton
            size="small"
            sx={{
              backgroundColor: "#fff",
              color: theme.palette.text.primary,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: "var(--brand)",
                color: "var(--on-brand)",
              },
            }}
            onClick={(e) => {
              e.stopPropagation();
              // إضافة إلى المفضلة
            }}
          >
            <FavoriteBorderIcon fontSize="small" sx={{ fontSize: { xs: 16, sm: 20 } }} />
          </IconButton>

          <IconButton
            size="small"
            sx={{
              backgroundColor: "#fff",
              color: theme.palette.text.primary,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: "var(--brand)",
                color: "var(--on-brand)",
              },
            }}
            onClick={(e) => {
              e.stopPropagation();
              // إضافة للمقارنة
            }}
          >
            <CompareArrowsIcon fontSize="small" sx={{ fontSize: { xs: 16, sm: 20 } }} />
          </IconButton>

          <IconButton
            size="small"
            sx={{
              backgroundColor: "#fff",
              color: theme.palette.text.primary,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: "var(--brand)",
                color: "var(--on-brand)",
              },
            }}
            onClick={(e) => {
              e.stopPropagation();
              // مشاركة المنتج
            }}
          >
            <ShareIcon fontSize="small" sx={{ fontSize: { xs: 16, sm: 20 } }} />
          </IconButton>
        </Box>
      </Box>

      {/* محتوى البطاقة */}
              <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            p: viewMode === "grid" ? { xs: 1.5, sm: 2 } : 3,
          }}
        >
        <CardContent sx={{ flexGrow: 1, p: 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Chip
              label={statusText}
              size="small"
              color={statusColor}
              variant="outlined"
              sx={{ 
                fontSize: { xs: "0.7rem", sm: "inherit" },
                height: { xs: 24, sm: 32 }
              }}
            />

            {product.source === "scraper" && (
              <Chip
                label="تحديث تلقائي"
                size="small"
                color="info"
                variant="outlined"
                sx={{ 
                  fontSize: { xs: "0.7rem", sm: "inherit" },
                  height: { xs: 24, sm: 32 }
                }}
              />
            )}
          </Box>

          <Typography
            variant={viewMode === "grid" ? "subtitle1" : "h6"}
            sx={{ 
              fontWeight: "bold", 
              mb: { xs: 0.5, sm: 1 },
              fontSize: { xs: "0.875rem", sm: "inherit" },
              display: "-webkit-box",
              WebkitLineClamp: viewMode === "grid" ? 1 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2
            }}
          >
            {product.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: { xs: 1, sm: 1.5 },
              fontSize: { xs: "0.75rem", sm: "inherit" },
              display: "-webkit-box",
              WebkitLineClamp: viewMode === "grid" ? 1 : 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3
            }}
          >
            {product.description || "لا يوجد وصف متوفر لهذا المنتج"}
          </Typography>

          {viewMode === "list" &&
            product.specsBlock &&
            product.specsBlock.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "bold", mb: 0.5 }}
                >
                  المواصفات:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {product.specsBlock.slice(0, 3).map((spec, index) => (
                    <Chip
                      key={index}
                      label={spec}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {product.specsBlock.length > 3 && (
                    <Chip
                      label={`+${product.specsBlock.length - 3}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            )}

          {/* التقييمات */}
          <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 1, sm: 1.5 } }}>
            <Box sx={{ display: "flex" }}>
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  sx={{
                    color:
                      i < Math.floor(rating)
                        ? theme.palette.warning.main
                        : theme.palette.grey[300],
                    fontSize: { xs: 14, sm: 16 },
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ 
              ml: 1,
              fontSize: { xs: "0.75rem", sm: "inherit" }
            }}>
              ({rating})
            </Typography>
          </Box>

          {/* السعر */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography
              variant={viewMode === "grid" ? "h6" : "h5"}
              fontWeight="bold"
              sx={{ 
                color: "var(--brand)",
                fontSize: { xs: "1rem", sm: "inherit" }
              }}
            >
              {sellPrice.toFixed(2)} ر.س
            </Typography>

            {oldPrice !== undefined && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ 
                  textDecoration: "line-through",
                  fontSize: { xs: "0.75rem", sm: "inherit" }
                }}
              >
                {oldPrice.toFixed(2)} ر.س
              </Typography>
            )}
          </Box>

          {viewMode === "list" &&
            product.keywords &&
            product.keywords.length > 0 && (
              <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {product.keywords.slice(0, 5).map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    size="small"
                    variant="outlined"
                    color="info"
                  />
                ))}
              </Box>
            )}
        </CardContent>

        <CardActions sx={{ p: 0, mt: "auto" }}>
          <Button
            variant="contained"
            fullWidth={viewMode === "grid"}
            startIcon={<ShoppingCartIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={product.status !== "active"}
            sx={{
              fontWeight: "bold",
              borderRadius: 2,
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: "0.75rem", sm: "inherit" },
              boxShadow: "none",
              background: "var(--brand)",
              color: "var(--on-brand)",
              "&:hover": {
                backgroundColor: "var(--brand-hover)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                transform: "translateY(-2px)",
              },
              transition: "all 0.25s ease",
            }}
          >
            أضف إلى السلة
          </Button>

          {viewMode === "list" && (
            <Button
              variant="outlined"
              sx={{
                ml: 2,
                fontWeight: "bold",
                borderRadius: 2,
                py: 1,
              }}
              onClick={() => onOpen(product)}
            >
              التفاصيل
            </Button>
          )}
        </CardActions>
      </Box>
    </Card>
  );
}
