import { Box, Paper, Stack, Typography, Divider } from '@mui/material';
import RoomIcon from '@mui/icons-material/Room';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import EmailIcon from '@mui/icons-material/Email';
import { useTheme } from '@mui/material/styles';
import type { ContactConfig } from '../types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc); dayjs.extend(timezone);
const DEFAULT_TZ = 'Asia/Aden';

function getOpenNowLabel(cfg: ContactConfig) {
  const now = dayjs().tz(DEFAULT_TZ);
  const day = now.day(); // 0..6 (الأحد=0)
  const rule = cfg.workHours?.[day];
  if (!rule || rule.off) return { isOpen: false, label: 'مغلق الآن' };
  const from = dayjs.tz(`${now.format('YYYY-MM-DD')} ${rule.from}`, DEFAULT_TZ);
  const to = dayjs.tz(`${now.format('YYYY-MM-DD')} ${rule.to}`, DEFAULT_TZ);
  const isOpen = now.isAfter(from) && now.isBefore(to);
  return { isOpen, label: isOpen ? `مفتوح الآن · يغلق ${to.format('hh:mm A')}` : `مغلق الآن · يفتح ${from.format('hh:mm A')}` };
}

export default function ContactInfo({ config }: { config: ContactConfig }) {
  const theme = useTheme();
  const { isOpen, label } = getOpenNowLabel(config);

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={800}>معلومات التواصل</Typography>
        {config.address && (
          <Stack direction="row" spacing={1.5}><RoomIcon /><Typography color="text.secondary">{config.address}</Typography></Stack>
        )}
        {config.phone && (
          <Stack direction="row" spacing={1.5}><PhoneInTalkIcon /><Typography color="text.secondary">{config.phone}</Typography></Stack>
        )}
        {config.email && (
          <Stack direction="row" spacing={1.5}><EmailIcon /><Typography color="text.secondary">{config.email}</Typography></Stack>
        )}
        <Divider />
        <Typography fontWeight={700}>أوقات العمل</Typography>
        <Typography variant="body2" color={isOpen ? 'success.main' : 'text.secondary'}>{label}</Typography>
        {config.mapEmbedUrl && (
          <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden' }}>
            <iframe title="map" src={config.mapEmbedUrl} width="100%" height="220" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </Box>
        )}
      </Stack>
    </Paper>
  );
}