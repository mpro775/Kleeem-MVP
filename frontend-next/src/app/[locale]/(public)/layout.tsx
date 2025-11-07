'use client';

import { Footer, Navbar } from '@/features/landing';
import { Box } from '@mui/material';


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

