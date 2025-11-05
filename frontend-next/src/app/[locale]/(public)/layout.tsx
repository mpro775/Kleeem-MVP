'use client';

import { Box } from '@mui/material';
import Navbar from '@/components/features/landing/ui/Navbar';
import Footer from '@/components/features/landing/ui/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Navbar />
      {children}
      <Footer />
    </Box>
  );
}

