'use client';

import { Box } from '@mui/material';
import ChatWorkspace from '@/features/merchant/conversations/components/ChatWorkspace';

export default function ConversationsPage() {
  // In a real app, you'd get merchantId from auth context
  const merchantId = 'temp-merchant-id'; // TODO: Get from auth

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', p: 0, m: 0 }}>
      <ChatWorkspace merchantId={merchantId} />
    </Box>
  );
}
