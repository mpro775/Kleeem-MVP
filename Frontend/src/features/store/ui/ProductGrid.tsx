// components/store/ProductGrid.tsx
import { Box, Typography, IconButton, useTheme, Button } from "@mui/material";
import type { ProductResponse } from "@/features/mechant/products/type";
import { ProductCard } from "./ProductCard";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import TuneIcon from "@mui/icons-material/Tune";
import { useState, useEffect } from "react";

type Props = {
  products: ProductResponse[];
  onAddToCart: (p: ProductResponse) => void;
  onOpen: (p: ProductResponse) => void;
};

export function ProductGrid({ products, onAddToCart, onOpen }: Props) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOption, setSortOption] = useState<
    "default" | "price_asc" | "price_desc" | "newest"
  >("default");
  const [sortedProducts, setSortedProducts] =
    useState<ProductResponse[]>(products);

  useEffect(() => {
    // تطبيق خيارات الفرز
    const result = [...products];

    switch (sortOption) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        break;
      default:
      // الترتيب الافتراضي
    }

    setSortedProducts(result);
  }, [products, sortOption]);

  return (
    <Box>
      {/* شريط التحكم في العرض */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          backgroundColor: "white",
          borderRadius: 3,
          p: 2,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          {products.length} منتج متوفر
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              border: "1px solid",
              borderColor: theme.palette.divider,
              borderRadius: 2,
            }}
          >
            <IconButton
              onClick={() => setViewMode("grid")}
              sx={{
                backgroundColor:
                  viewMode === "grid" ? "var(--brand)" : "transparent",
                borderRadius: "8px 0 0 8px",
                color: viewMode === "grid" ? "var(--on-brand)" : "var(--brand)",
              }}
            >
              <GridViewIcon />
            </IconButton>
            <IconButton
              onClick={() => setViewMode("list")}
              sx={{
                backgroundColor:
                  viewMode === "list" ? "var(--brand)" : "transparent",
                borderRadius: "0 8px 8px 0",
                color: viewMode === "list" ? "var(--brand)" : "var(--brand)",
              }}
            >
              <ViewListIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              position: "relative",
              ml: 2,
            }}
          >
            <IconButton
              onClick={() => setFilterOpen(!filterOpen)}
              sx={{
                backgroundColor: filterOpen
                  ? theme.palette.primary.light
                  : "transparent",
                color: filterOpen ? theme.palette.primary.main : "inherit",
              }}
            >
              <TuneIcon />
            </IconButton>

            {filterOpen && (
              <Box
                sx={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 10,
                  backgroundColor: "white",
                  borderRadius: 2,
                  boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
                  p: 2,
                  mt: 1,
                  minWidth: 200,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  ترتيب حسب
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant={sortOption === "default" ? "contained" : "text"}
                    onClick={() => setSortOption("default")}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    الافتراضي
                  </Button>
                  <Button
                    variant={sortOption === "price_asc" ? "contained" : "text"}
                    onClick={() => setSortOption("price_asc")}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    السعر: من الأقل للأعلى
                  </Button>
                  <Button
                    variant={sortOption === "price_desc" ? "contained" : "text"}
                    onClick={() => setSortOption("price_desc")}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    السعر: من الأعلى للأقل
                  </Button>
                  <Button
                    variant={sortOption === "newest" ? "contained" : "text"}
                    onClick={() => setSortOption("newest")}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    الأحدث
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* عرض المنتجات */}
      {sortedProducts.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            backgroundColor: "white",
            borderRadius: 3,
            p: 4,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <Typography
            color="--var(brand)"
            variant="h5"
            sx={{ mb: 2, fontWeight: "bold" }}
          >
            لم يتم العثور على منتجات
          </Typography>
          <Typography variant="body1" color="var(brand)">
            لا توجد منتجات تطابق معايير البحث الخاصة بك
          </Typography>
        </Box>
      ) : viewMode === "grid" ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: { xs: 2, sm: 3 },
          }}
        >
          {sortedProducts.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              onAddToCart={onAddToCart}
              onOpen={onOpen}
              viewMode={viewMode}
            />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {sortedProducts.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              onAddToCart={onAddToCart}
              onOpen={onOpen}
              viewMode={viewMode}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
