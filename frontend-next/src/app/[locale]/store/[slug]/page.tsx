'use client';

import { use } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
} from '@mui/material';
import { ShoppingCart } from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';

// Mock products data
const mockProducts = [
  {
    id: '1',
    name: 'منتج رائع 1',
    price: 299,
    image: '/assets/hero-image.png',
    category: 'إلكترونيات',
  },
  {
    id: '2',
    name: 'منتج رائع 2',
    price: 199,
    image: '/assets/hero-image.png',
    category: 'ملابس',
  },
  {
    id: '3',
    name: 'منتج رائع 3',
    price: 499,
    image: '/assets/hero-image.png',
    category: 'أثاث',
  },
];

export default function StorePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = use(params);

  return (
    <Box sx={{ py: 4 }}>
      <Container>
        {/* Store Header */}
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" fontWeight={800} gutterBottom>
            متجر {slug}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            اكتشف منتجاتنا المميزة
          </Typography>
        </Box>

        {/* Categories */}
        <Box display="flex" gap={1} mb={4} flexWrap="wrap" justifyContent="center">
          <Chip label="الكل" color="primary" />
          <Chip label="إلكترونيات" />
          <Chip label="ملابس" />
          <Chip label="أثاث" />
        </Box>

        {/* Products Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {mockProducts.map((product) => (
            <Card
              key={product.id}
              component={Link}
              href={`/${locale}/store/${slug}/product/${product.id}`}
              sx={{
                textDecoration: 'none',
                transition: 'transform 0.3s',
                '&:hover': { transform: 'translateY(-5px)' },
              }}
            >
              <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <CardContent>
                <Chip label={product.category} size="small" sx={{ mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="h5" color="primary" fontWeight={700}>
                  {product.price} ر.س
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ShoppingCart />}
                  sx={{ mt: 2 }}
                >
                  أضف للسلة
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

