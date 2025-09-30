import { Box, Divider, IconButton, Typography, Skeleton } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { CartProvider, useCart } from "@/context/CartContext";
import {
  isObjectId,
  getProductById,
  getPublicProductBySlug,
} from "@/features/store/home/api";
import Gallery from "@/features/store/product/ui/Gallery";
import PriceSection from "@/features/store/product/ui/PriceSection";
import AttributesSection from "@/features/store/product/ui/AttributesSection";
import QuantityPicker from "@/features/store/product/ui/QuantityPicker";
import ActionBar from "@/features/store/product/ui/ActionBar";
import DetailsTabs from "@/features/store/product/ui/DetailsTabs";
import RelatedSkeleton from "@/features/store/product/ui/RelatedSkeleton";
import { renderCategoryTrail } from "@/features/store/product/utils";
import type { ProductResponse } from "@/features/mechant/products/type";
import { Footer } from "@/features/store/ui/Footer";
import { StoreNavbar } from "@/features/store/ui/StoreNavbar";

import { FloatingCartButton } from "@/features/store/home/ui/FloatingCartButton";
import CartDialog from "@/features/store/ui/CartDialog";
import { getLocalCustomer } from "@/shared/utils/customer";
import { getSessionId } from "@/shared/utils/session";
import type { CustomerInfo } from "@/features/store/type";
import { useStoreData } from "@/features/store/home/hooks/useStoreData";
import { useErrorHandler } from "@/shared/errors";
import type { Storefront } from "@/features/mechant/storefront-theme/type";

function ProductSkeleton() {
  return (
    <Box
      sx={{
        maxWidth: "lg",
        mx: "auto",
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 4 },
      }}
    >
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Skeleton
          variant="rectangular"
          width={100}
          height={40}
          sx={{ borderRadius: 1 }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 2, sm: 3, md: 4 },
          mb: { xs: 4, sm: 5, md: 6 },
        }}
      >
        <Skeleton
          variant="rectangular"
          height={350}
          sx={{ flex: 1, borderRadius: 3 }}
        />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" height={45} sx={{ mb: 2 }} />
          <Skeleton variant="text" height={35} sx={{ mb: 3, width: "30%" }} />
          <Skeleton variant="text" height={30} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={30} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={30} sx={{ mb: 1, width: "80%" }} />
        </Box>
      </Box>
      <Skeleton
        variant="rectangular"
        height={250}
        sx={{ borderRadius: 3, mb: { xs: 4, sm: 5, md: 6 } }}
      />
      <RelatedSkeleton />
    </Box>
  );
}

export function ProductDetailsPage() {
  const { idOrSlug = "", slug = "" } = useParams<{
    idOrSlug: string;
    slug: string;
  }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || !idOrSlug) return;
      setLoading(true);
      try {
        let p;
        if (isObjectId(idOrSlug)) {
          p = await getProductById(idOrSlug);
          // لو عنده slug نحول لعنوان مقروء مرّة واحدة
          if (!cancelled && p?.slug) {
            navigate(
              `/store/${encodeURIComponent(slug)}/product/${encodeURIComponent(
                p.slug
              )}`,
              { replace: true }
            );
            return;
          }
        } else {
          p = await getPublicProductBySlug(slug, idOrSlug);
        }
        if (!cancelled) setProduct(p);
      } catch{
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, idOrSlug, navigate]);

  const { addItem } = useCart();
  const { items } = useCart();
  const cartCount = items.reduce((t, i) => t + i.quantity, 0);
  const [openCart, setOpenCart] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(
    {}
  );
  const isDemo =
    slug === "demo" || new URLSearchParams(location.search).has("demo");
  const { handleError } = useErrorHandler();

  const [sessionId] = useState<string>(() => getSessionId());
  const localCustomer = getLocalCustomer() as CustomerInfo;
  const { merchant, storefront, categories } = useStoreData(
    slug,
    isDemo,
    handleError
  );

  // عند جلب المنتج، جهّز سمات افتراضية
  useEffect(() => {
    if (!product) return;
    const init: Record<string, string> = {};
    const attrs = (product as ProductResponse).attributes as
      | Record<string, string[]>
      | undefined;
    if (attrs) {
      Object.entries(attrs).forEach(([k, vals]) => {
        if (Array.isArray(vals) && vals[0]) init[k] = String(vals[0]);
      });
    }
    setSelectedAttrs(init);
  }, [product]);

  if (loading) return <ProductSkeleton />;
  if (!product) return null;

  const trail = renderCategoryTrail(product);
  const currency = (product as ProductResponse).currency || "SAR";
  const canBuy = product.status === "active";

  const handleAddToCart = () => {
    const productWithAttributes = {
      ...product,
      selectedAttributes: selectedAttrs,
    } as ProductResponse;
    addItem(productWithAttributes, quantity);
  };

  return (
    <Box>
      {merchant && (
        <StoreNavbar
          merchant={merchant}
          storefront={storefront ?? ({} as Storefront)}
        />
      )}

      <Box
        sx={{
          maxWidth: "lg",
          mx: "auto",
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 1, sm: 2, md: 4 },
          bgcolor: "#fff",
        }}
      >
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              mb: { xs: 1, sm: 2 },
              p: { xs: 1, sm: 1.5 },
            }}
          >
            <ArrowBack
              sx={{ mr: 1, fontSize: { xs: "1.2rem", sm: "1.5rem" } }}
            />
            <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              العودة
            </Typography>
          </IconButton>
        </Box>
        <FloatingCartButton
          count={cartCount}
          onClick={() => {
            console.log("Cart button clicked, setting openCart to true");
            console.log("Current merchant:", merchant);
            console.log("Current openCart state:", openCart);
            setOpenCart(true);
          }}
        />

        {trail && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: { xs: 1, sm: 1.5 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            {trail}
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 4, sm: 5, md: 6 },
          }}
        >
          <Gallery
            images={product.images}
            status={product.status}
            lowQuantity={product.lowQuantity}
            name={product.name}
          />

          {/* التفاصيل النصية */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                mb: { xs: 1.5, sm: 2 },
                fontSize: { xs: "1.4rem", sm: "1.6rem", md: "2.2rem" },
                lineHeight: { xs: 1.3, sm: 1.4, md: 1.2 },
              }}
            >
              {product.name}
            </Typography>

            <PriceSection
              price={product.price}
              offer={product.offer}
              currency={currency}
            />

            <Typography
              sx={{
                mb: { xs: 3, sm: 4 },
                color: "text.secondary",
                lineHeight: 1.6,
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              {product.description || "لا يوجد وصف متوفر لهذا المنتج."}
            </Typography>

            <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

            <AttributesSection
              attributes={product.attributes}
              selected={selectedAttrs}
              onSelect={(k, v) => setSelectedAttrs((s) => ({ ...s, [k]: v }))}
            />

            <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

            <QuantityPicker
              value={quantity}
              onChange={setQuantity}
              max={product.quantity || 999}
            />

            <ActionBar onAddToCart={handleAddToCart} canBuy={canBuy} />

            <Divider sx={{ mb: { xs: 2, sm: 3 } }} />
          </Box>
        </Box>
        {merchant && (
          <CartDialog
            open={openCart}
            onClose={() => {
              console.log("Closing cart dialog");
              setOpenCart(false);
            }}
            merchantId={merchant._id}
            sessionId={sessionId}
            defaultCustomer={localCustomer}
            onOrderSuccess={(orderId) =>
              navigate(`/store/${slug}/order/${orderId}`)
            }
          />
        )}
        <DetailsTabs specs={product.specsBlock || []} />
      </Box>
      {merchant && <Footer merchant={merchant} categories={categories} />}
    </Box>
  );
}
export default function ProductDetailsPageWithCart() {
  return (
    <CartProvider>
      <ProductDetailsPage />
    </CartProvider>
  );
}
