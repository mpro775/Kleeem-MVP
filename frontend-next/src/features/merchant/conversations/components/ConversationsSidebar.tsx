'use client';

import {
  Box,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import ChatIcon from '@mui/icons-material/Chat';
import type { ChannelType } from '../types';
import type { FC, JSX } from 'react';

type ChannelUnion = '' | ChannelType;

const channels: Array<{
  label: string;
  value: ChannelUnion;
  color?: string;
  icon: JSX.Element;
}> = [
  { label: 'الكل', value: '', icon: <ChatIcon fontSize="small" /> },
  {
    label: 'واتساب',
    value: 'whatsapp',
    color: '#25D366',
    icon: <WhatsAppIcon fontSize="small" />,
  },
  {
    label: 'تيليجرام',
    value: 'telegram',
    color: '#229ED9',
    icon: <TelegramIcon fontSize="small" />,
  },
  {
    label: 'ويب شات',
    value: 'webchat',
    color: '#805ad5',
    icon: <ChatIcon fontSize="small" />,
  },
];

interface Props {
  selectedChannel: ChannelUnion;
  setChannel: (c: ChannelUnion) => void;
  counts?: Partial<Record<ChannelUnion, number>>;
  sticky?: boolean;
}

const ConversationsSidebar: FC<Props> = ({
  selectedChannel,
  setChannel,
  counts,
  sticky = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        position: sticky ? 'sticky' : 'relative',
        top: 0,
        zIndex: (t) => t.zIndex.appBar,
        px: 1,
        pt: 1,
        pb: 0.5,
        backdropFilter: 'blur(10px)',
        background: `linear-gradient(180deg,
          ${alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.35 : 0.7
          )} 0%,
          ${alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.25 : 0.5
          )} 100%
        )`,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
      }}
    >
      <Tabs
        value={selectedChannel}
        onChange={(_, v) => setChannel(v)}
        variant="scrollable"
        orientation="horizontal"
        allowScrollButtonsMobile
        scrollButtons={isMobile ? 'auto' : false}
        aria-label="تصفية المحادثات حسب القناة"
        sx={{
          minHeight: 44,
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${alpha(
              theme.palette.primary.main,
              0.95
            )}, ${alpha(
              theme.palette.secondary?.main || theme.palette.primary.light,
              0.95
            )})`,
          },
        }}
      >
        {channels.map((ch) => {
          const color = ch.color || theme.palette.text.secondary;
          const count = counts?.[ch.value];
          const label = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {ch.icon}
              <span>{ch.label}</span>
              {typeof count === 'number' && (
                <Badge
                  color="primary"
                  badgeContent={count > 99 ? '99+' : count}
                  sx={{
                    '& .MuiBadge-badge': {
                      right: -10,
                      top: -10,
                      fontWeight: 800,
                      height: 18,
                      minWidth: 18,
                      px: 0.5,
                    },
                  }}
                />
              )}
            </Box>
          );

          return (
            <Tooltip key={ch.value || 'all'} title={ch.label}>
              <Tab
                value={ch.value}
                label={label}
                disableRipple
                sx={{
                  minHeight: 44,
                  mr: 0.5,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 1.25,
                  color,
                  '&.Mui-selected': {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#111',
                    backgroundColor: alpha(color, 0.12),
                    boxShadow: `0 6px 16px ${alpha(color, 0.22)}`,
                    border: `1px solid ${alpha(color, 0.35)}`,
                  },
                  '&:hover': {
                    backgroundColor: alpha(color, 0.08),
                  },
                }}
                aria-label={`فلتر ${ch.label}`}
              />
            </Tooltip>
          );
        })}
      </Tabs>
    </Box>
  );
};

export default ConversationsSidebar;

