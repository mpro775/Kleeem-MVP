'use client';

import { Box, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import Image from 'next/image';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  message = 'لا يوجد رسائل',
  icon,
}: EmptyStateProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      mt={8}
      sx={{ minHeight: '40vh' }}
    >
      {icon || (
        <ChatIcon
          sx={{
            fontSize: 80,
            color: 'text.secondary',
            opacity: 0.5,
            mb: 2,
          }}
        />
      )}
      <Typography
        variant="h6"
        color="text.secondary"
        fontWeight={600}
        sx={{ mt: 2 }}
      >
        {message}
      </Typography>
    </Box>
  );
}

