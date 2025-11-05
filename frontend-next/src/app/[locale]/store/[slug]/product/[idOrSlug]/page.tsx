'use client';

import { use } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  Divider,
  Rating,
} from '@mui/material';
import { ShoppingCart, LocalShipping, VerifiedUser } from '@mui/icons-material';
import Image from 'next/image';

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string; idOrSlug: string }>;
}) {
  const { slug, locale, idOrSlug } = use(params);

  // Mock product data
  const product = {
    id: idOrSlug,
    name: 'منتج رائع',
    price: 299,
    comparePrice: 399,
    description: 'وصف تفصيلي للمنتج. هذا المنتج رائع ومميز ويستحق الشراء.',
    images: ['/assets/hero-image.png'],
    rating: 4.5,
    reviews: 124,
    stock: 15,
    sku: 'PROD-001',
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
          }}
        >
          {/* Product Images */}
          <Box>
            <Paper sx={{ position: 'relative', paddingTop: '100%' }}>
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </Paper>
          </Box>

          {/* Product Info */}
          <Box>
            <Chip label="متوفر" color="success" size="small" sx={{ mb: 2 }} />
            <Typography variant="h3" fontWeight={800} gutterBottom>
              {product.name}
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Rating value={product.rating} precision={0.5} readOnly />
              <Typography variant="body2" color="text.secondary">
                ({product.reviews} تقييم)
              </Typography>
            </Box>

            <Box display="flex" alignItems="baseline" gap={2} mb={3}>
              <Typography variant="h3" color="primary" fontWeight={800}>
                {product.price} ر.س
              </Typography>
              {product.comparePrice && (
                <Typography
                  variant="h5"
                  sx={{ textDecoration: 'line-through' }}
                  color="text.secondary"
                >
                  {product.comparePrice} ر.س
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body1" paragraph>
              {product.description}
            </Typography>

            <Box display="flex" gap={1} mb={3}>
              <Chip icon={<LocalShipping />} label="توصيل مجاني" />
              <Chip icon={<VerifiedUser />} label="ضمان سنة" />
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<ShoppingCart />}
              sx={{ py: 2 }}
            >
              أضف للسلة
            </Button>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography variant="body2" color="text.secondary">
                رمز المنتج: {product.sku}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                المخزون: {product.stock} قطعة
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

