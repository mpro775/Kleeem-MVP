// =========================
// File: src/pages/store/StorePage.tsx
// (new path: moved from src/pages/StorePage.tsx)
// =========================
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  IconButton,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useCart, CartProvider } from "@/context/CartContext";
import { useErrorHandler } from "@/shared/errors";
import { getSessionId } from "@/shared/utils/session";
import { getLocalCustomer } from "@/shared/utils/customer";
import type {
  CustomerInfo,
  ProductResponse,
} from "@/features/store/home/types";
import { useStoreData } from "@/features/store/home/hooks/useStoreData";
import { useKleemWidget } from "@/features/store/home/hooks/useKleemWidget";
import { useNoIndexWhenDemo } from "@/features/store/home/hooks/useNoIndexWhenDemo";
import { mapOffersToProducts } from "@/features/store/home/utils/transform";

import { StoreNavbar } from "@/features/store/ui/StoreNavbar";
import { StoreHeader } from "@/features/store/ui/StoreHeader";
import { Footer } from "@/features/store/ui/Footer";
import { BannerCarousel } from "@/features/store/home/ui/BannerCarousel";
import { ControlsBar } from "@/features/store/home/ui/ControlsBar";
import { OffersSection } from "@/features/store/home/ui/OffersSection";
import { SidebarCategories } from "@/features/store/home/ui/SidebarCategories";
import { MobileFiltersDrawer } from "@/features/store/home/ui/MobileFiltersDrawer";
import { ProductGrid } from "@/features/store/ui/ProductGrid";
import CartDialog from "@/features/store/ui/CartDialog";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { FloatingCartButton } from "@/features/store/home/ui/FloatingCartButton";

export function StorePageInner() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { handleError } = useErrorHandler();
  const isDemo =
    slug === "demo" || new URLSearchParams(location.search).has("demo");

  const { items, addItem } = useCart();
  const cartCount = items.reduce((t, i) => t + i.quantity, 0);
  const [openCart, setOpenCart] = useState(false);
  const [sessionId] = useState<string>(() => getSessionId());
  const localCustomer = getLocalCustomer() as CustomerInfo;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    merchant,
    storefront,
    products,
    categories,
    productById,
    offers,
    offersLoading,
    isLoading,
    error,
  } = useStoreData(slug, isDemo, handleError);

  useKleemWidget(merchant, storefront); // ✅ Bubble widget only
  useNoIndexWhenDemo(isDemo);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const offerAsProducts: ProductResponse[] = useMemo(
    () => mapOffersToProducts(offers, productById),
    [offers, productById]
  );

  if (error)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#fff",
        }}
      >
        <Typography
          variant="h5"
          color="error"
          sx={{ textAlign: "center", p: 3 }}
        >
          {error}
        </Typography>
      </Box>
    );

  if (!merchant || !storefront)
    return <Typography sx={{ p: 3 }}>جارٍ التحميل…</Typography>;

  const sourceList: ProductResponse[] = showOffersOnly
    ? offerAsProducts
    : Array.isArray(products)
    ? products
    : [];
  const productCategoryId = (p: ProductResponse): string | null => {
    const c = p.category;
    if (!c) return null;
    if (typeof c === "string") return c;
    const obj = c as { _id?: string };
    return obj?._id ?? null;
  };
  const filteredProducts = (Array.isArray(sourceList) ? sourceList : []).filter(
    (p) =>
      (!activeCategory || productCategoryId(p) === activeCategory) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.shortDescription?.toLowerCase().includes(search.toLowerCase()) ||
        p.richDescription?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box sx={{ minHeight: "100vh", background: "#fff" }}>
      <StoreNavbar merchant={merchant} storefront={storefront} />

      {/* ✅ زر السلة العائم (بدل أي نموذج ظاهر عشوائي) */}
      <FloatingCartButton count={cartCount} onClick={() => setOpenCart(true)} />

      <Container maxWidth="xl" sx={{ pt: 4, pb: 10 }}>
        {isLoading ? (
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={200}
              sx={{ borderRadius: 3, mb: 3 }}
            />
            <Skeleton
              variant="text"
              width="60%"
              height={40}
              sx={{ mx: "auto", mb: 2 }}
            />
            <Skeleton
              variant="text"
              width="80%"
              height={30}
              sx={{ mx: "auto" }}
            />
          </Box>
        ) : (
          <>
            <StoreHeader merchant={merchant} storefront={storefront} />
          </>
        )}

        <BannerCarousel banners={storefront?.banners ?? []} />

        <ControlsBar
          search={search}
          onSearch={setSearch}
          showOffersOnly={showOffersOnly}
          onToggleOffers={() => setShowOffersOnly((v) => !v)}
          offersCount={offers?.length || 0}
          offersLoading={!!offersLoading}
          onOpenMobileFilters={() => setMobileFiltersOpen(true)}
        />

        {!showOffersOnly && (
          <OffersSection
            offers={offerAsProducts}
            onOpenAll={() => setShowOffersOnly(true)}
            onOpenProduct={(p) =>
              navigate(
                `/store/${slug}/product/${encodeURIComponent(p.slug || p._id)}`
              )
            }
            onAddToCart={addItem}
            slug={slug}
          />
        )}

        <Box sx={{ display: "flex", gap: 4 }}>
          {!isMobile && (
            <SidebarCategories
              categories={categories}
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />
          )}

          <Box sx={{ flexGrow: 1 }}>
            {isMobile && (
              <MobileFiltersDrawer
                open={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                categories={categories}
                activeCategory={activeCategory}
                onChange={setActiveCategory}
              />
            )}

            {activeCategory && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 3,
                  backgroundColor: "var(--brand)",
                  color: "var(--on-brand)",
                  borderRadius: 3,
                  p: 1.5,
                  width: "fit-content",
                }}
              >
                <LocalOfferIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {categories.find((c) => c._id === activeCategory)?.name}
                </Typography>
                <IconButton
                  size="small"
                  sx={{
                    color: "var(--on-brand)",
                    ml: 1,
                    "&:hover": { opacity: 0.85 },
                  }}
                  onClick={() => setActiveCategory(null)}
                >
                  ✕
                </IconButton>
              </Box>
            )}

            {isLoading ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr",
                  },
                  gap: 3,
                }}
              >
                {[...Array(6)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      backgroundColor: "white",
                      borderRadius: 3,
                      overflow: "hidden",
                      boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Skeleton variant="rectangular" width="100%" height={200} />
                    <Box sx={{ p: 2 }}>
                      <Skeleton variant="text" height={30} />
                      <Skeleton variant="text" height={25} width="60%" />
                      <Skeleton variant="text" height={20} width="40%" />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <ProductGrid
                products={filteredProducts}
                onAddToCart={addItem}
                onOpen={(p) =>
                  navigate(
                    `/store/${slug}/product/${encodeURIComponent(
                      p.slug || p._id
                    )}`
                  )
                }
              />
            )}
          </Box>
        </Box>

        <CartDialog
          open={openCart}
          onClose={() => setOpenCart(false)}
          merchantId={merchant._id}
          sessionId={sessionId}
          defaultCustomer={localCustomer}
          onOrderSuccess={(orderId) =>
            navigate(`/store/${slug}/order/${orderId}`)
          }
        />
      </Container>

      <Footer merchant={merchant} categories={categories} />
    </Box>
  );
}

export default function StorePage() {
  return (
    <CartProvider>
      <StorePageInner />
    </CartProvider>
  );
}
