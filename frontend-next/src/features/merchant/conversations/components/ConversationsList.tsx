'use client';

import {
  Box,
  List,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  CircularProgress,
  ListItemButton,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import ChatIcon from '@mui/icons-material/Chat';
import { useState, useMemo, type FC } from 'react';
import type { ConversationSession } from '../types';

interface Props {
  sessions: ConversationSession[];
  loading: boolean;
  onSelect: (sessionId: string) => void;
  selectedId?: string;
  enableSearch?: boolean;
}

const getChannelColor = (channel: string, theme: any) => {
  switch (channel) {
    case 'whatsapp':
      return '#25D366';
    case 'telegram':
      return '#229ED9';
    case 'webchat':
      return theme.palette.mode === 'dark' ? '#9f8cff' : '#805ad5';
    default:
      return theme.palette.text.disabled;
  }
};

const getChannelLabel = (channel: string) => {
  switch (channel) {
    case 'whatsapp':
      return 'واتساب';
    case 'telegram':
      return 'تيليجرام';
    case 'webchat':
      return 'ويب شات';
    default:
      return 'أخرى';
  }
};

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'whatsapp':
      return <WhatsAppIcon fontSize="small" />;
    case 'telegram':
      return <TelegramIcon fontSize="small" />;
    case 'webchat':
      return <ChatIcon fontSize="small" />;
    default:
      return <ChatIcon fontSize="small" />;
  }
};

const shortenSessionId = (sessionId: string) => {
  if (!sessionId) return '';
  if (sessionId.length <= 12) return sessionId;
  return `${sessionId.substring(0, 8)}…${sessionId.substring(
    sessionId.length - 4
  )}`;
};

const getConversationName = (
  sessionId: string,
  channel: string,
  customerName?: string
) => {
  const channelLabel = getChannelLabel(channel);
  if (customerName && customerName.trim()) return customerName.trim();
  if (sessionId.includes('customer') || sessionId.includes('user'))
    return `عميل ${channelLabel}`;
  return `${channelLabel} - ${shortenSessionId(sessionId)}`;
};

const fmtTime = (d?: string | number | Date) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    return new Intl.DateTimeFormat('ar', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
  }
};

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<mark style="background:rgba(255,215,0,.35);padding:0 2px;border-radius:4px">${text.slice(
      idx,
      idx + q.length
    )}</mark>` +
    text.slice(idx + q.length)
  );
}

const ConversationsList: FC<Props> = ({
  sessions,
  loading,
  onSelect,
  selectedId,
  enableSearch = false,
}) => {
  const theme = useTheme();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q.trim()) return sessions;
    const s = q.trim().toLowerCase();
    return sessions.filter((x: any) => {
      const lastText = Array.isArray(x.messages)
        ? x.messages[x.messages.length - 1]?.text
        : '';
      return (
        x.sessionId?.toLowerCase().includes(s) ||
        x.customerName?.toLowerCase?.()?.includes?.(s) ||
        lastText?.toLowerCase?.()?.includes?.(s)
      );
    });
  }, [sessions, q]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  if (!sessions.length)
    return (
      <Typography
        align="center"
        color="text.secondary"
        sx={{ mt: 5, px: 2, fontWeight: 600 }}
      >
        لا توجد محادثات حتى الآن
      </Typography>
    );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha('#0b0b0f', 0.85)}, ${alpha(
                '#0a0a0c',
                0.85
              )})`
            : `linear-gradient(180deg, ${alpha('#fafafa', 0.9)}, ${alpha(
                '#f7f7fb',
                0.9
              )})`,
      }}
    >
      {enableSearch && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            p: 1,
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
            borderBottom: `1px solid ${alpha(
              theme.palette.primary.main,
              0.15
            )}`,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="بحث في المحادثات…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      )}

      <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 && (
          <Typography align="center" color="text.secondary" sx={{ my: 3 }}>
            لا توجد نتائج مطابقة
          </Typography>
        )}

        <List disablePadding>
          {filtered.map((s: any, i) => {
            const msgs = Array.isArray(s.messages) ? s.messages : [];
            const lastMsg = msgs.length
              ? msgs[msgs.length - 1]?.text ?? '…'
              : '…';
            const time = fmtTime(s.updatedAt);
            const chColor = getChannelColor(s.channel, theme);
            const selected = selectedId === s.sessionId;

            const name = getConversationName(
              s.sessionId,
              s.channel,
              s.customerName
            );
            const unread: number | undefined = s.unread;
            const pinned: boolean | undefined = s.pinned;
            const typing: boolean | undefined = s.typing;

            return (
              <Box key={s.sessionId}>
                {i > 0 && (
                  <Divider
                    sx={{
                      my: 0.25,
                      opacity: 0.5,
                      borderColor: alpha(theme.palette.divider, 0.6),
                    }}
                  />
                )}
                <ListItemButton
                  selected={selected}
                  onClick={() => onSelect(s.sessionId)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.25,
                    alignItems: 'flex-start',
                    px: 1,
                    py: 0.75,
                    transition: 'transform .15s ease, box-shadow .15s ease',
                    backgroundColor: selected
                      ? alpha(chColor, 0.1)
                      : 'transparent',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: `0 8px 20px ${alpha(chColor, 0.18)}`,
                      backgroundColor: selected
                        ? alpha(chColor, 0.12)
                        : alpha(theme.palette.primary.main, 0.04),
                    },
                    '&.Mui-selected': {
                      boxShadow: `0 8px 22px ${alpha(chColor, 0.22)}`,
                      border: `1px solid ${alpha(chColor, 0.35)}`,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: chColor,
                        color: '#fff',
                        width: 40,
                        height: 40,
                        border: `2px solid ${alpha(
                          theme.palette.background.paper,
                          0.9
                        )}`,
                        boxShadow: `0 6px 16px ${alpha(chColor, 0.28)}`,
                      }}
                      aria-label={getChannelLabel(s.channel)}
                    >
                      {getChannelIcon(s.channel)}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                        sx={{ minWidth: 0 }}
                      >
                        <Box
                          sx={{
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {pinned && (
                            <Tooltip title="مثبّت">
                              <PushPinRoundedIcon
                                sx={{
                                  fontSize: 18,
                                  color: alpha(theme.palette.warning.main, 0.9),
                                }}
                              />
                            </Tooltip>
                          )}
                          <Typography
                            component="span"
                            fontWeight={selected ? 800 : 700}
                            noWrap
                            sx={{
                              maxWidth: '65%',
                              '& mark': {
                                background: 'rgba(255,215,0,.35)',
                                borderRadius: '4px',
                                padding: '0 2px',
                              },
                            }}
                            dangerouslySetInnerHTML={{
                              __html: highlight(name, q.trim()),
                            }}
                          />
                          <Chip
                            size="small"
                            label={getChannelLabel(s.channel)}
                            sx={{
                              ml: 0.5,
                              fontWeight: 700,
                              height: 20,
                              borderColor: alpha(chColor, 0.5),
                              color: chColor,
                              backgroundColor: alpha(chColor, 0.08),
                            }}
                            variant="outlined"
                          />
                        </Box>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: 'nowrap', ml: 1 }}
                        >
                          {time}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.25,
                          minWidth: 0,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            color: 'text.secondary',
                            fontSize: '.86rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            '& mark': {
                              background: 'rgba(255,215,0,.35)',
                              borderRadius: '4px',
                              padding: '0 2px',
                            },
                          }}
                          dangerouslySetInnerHTML={{
                            __html: typing
                              ? `<span style="color:${alpha(
                                  theme.palette.success.main,
                                  0.9
                                )};font-weight:700">يكتب الآن…</span>`
                              : highlight(lastMsg || '—', q.trim()),
                          }}
                        />
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}
                        >
                          {shortenSessionId(s.sessionId)}
                        </Typography>

                        {Number(unread) > 0 && (
                          <Chip
                            size="small"
                            label={unread && unread > 99 ? '99+' : unread}
                            color="primary"
                            sx={{
                              height: 20,
                              fontWeight: 800,
                              '& .MuiChip-label': { px: 0.8 },
                            }}
                          />
                        )}
                      </Box>
                    }
                    slotProps={{
                      primary: { component: 'div' },
                      secondary: { component: 'div' },
                    }}
                  />
                </ListItemButton>
              </Box>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default ConversationsList;

