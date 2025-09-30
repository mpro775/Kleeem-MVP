// src/features/support/components/SupportSidebar.tsx
import { Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/context/hooks';
import { ContactMethodCard } from './ContactMethodCard';
import { RecentTickets } from './RecentTickets';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
// ... import other icons

// يمكن وضع مكون QuickGuides هنا أو في ملفه الخاص
const QuickGuides = () => (
    <Stack spacing={1.5}>
        <Typography fontWeight={700}>أدلة سريعة</Typography>
        {/* ... محتوى الأدلة السريعة ... */}
    </Stack>
);

export const SupportSidebar = () => {
  const { user } = useAuth();
  const merchantId = user?.merchantId ?? "";

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>قنوات سريعة</Typography>
        <Stack spacing={1.5}>
          <ContactMethodCard icon={<WhatsAppIcon color="success" />} title="واتساب" subtitle="رد سريع" href="https://wa.me/..." />
          <ContactMethodCard icon={<TelegramIcon color="primary" />} title="تيليجرام" subtitle="قناة بديلة" href="https://t.me/..." />
        </Stack>
      </Paper>
      
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <QuickGuides />
      </Paper>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>آخر تذاكرك</Typography>
        <RecentTickets merchantId={merchantId} />
      </Paper>
    </Stack>
  );
};