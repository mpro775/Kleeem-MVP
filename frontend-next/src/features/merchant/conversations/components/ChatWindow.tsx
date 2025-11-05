'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Fab,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import ThumbUpIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownIcon from '@mui/icons-material/ThumbDownAlt';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ChatIcon from '@mui/icons-material/Chat';
import type { ChatMessage } from '../types';
import { linkify, copyToClipboard } from './utils';

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayLabel = (d: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'اليوم';
  if (isSameDay(d, yesterday)) return 'أمس';
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  }).format(d);
};

const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat('ar', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

function groupMessages(messages: ChatMessage[]) {
  const groups: Array<{ role: ChatMessage['role']; items: ChatMessage[] }> = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.role === m.role) last.items.push(m);
    else groups.push({ role: m.role, items: [m] });
  }
  return groups;
}

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onRate?: (msg: ChatMessage, rating: number) => void;
}

const ChatWindow = ({ messages, loading, onRate }: Props) => {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => setAtBottom(entries[0]?.isIntersecting ?? false),
      { root: scrollRef.current, threshold: 1.0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (atBottom && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, atBottom]);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const byDay = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const t = new Date(m.timestamp);
      const key = `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, list]) => ({ key: k, items: list }));
  }, [messages]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  if (!messages.length) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        mt={8}
        sx={{ minHeight: '40vh' }}
      >
        <ChatIcon
          sx={{
            fontSize: 80,
            color: 'text.secondary',
            opacity: 0.5,
            mb: 2,
          }}
        />
        <Typography mt={2} color="text.secondary" fontWeight={600}>
          لا يوجد رسائل
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={scrollRef}
      sx={{
        position: 'relative',
        p: { xs: 1.25, md: 2 },
        height: '100%',
        overflowY: 'auto',
        direction: 'rtl',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha('#0b0b0f', 0.9)}, ${alpha(
                '#0a0a0c',
                0.9
              )})`
            : `linear-gradient(180deg, ${alpha('#fafafa', 0.9)}, ${alpha(
                '#f7f7fb',
                0.9
              )})`,
      }}
    >
      {byDay.map(({ key, items }) => {
        const t = new Date(items[0].timestamp);
        const label = dayLabel(t);
        const grouped = groupMessages(items);
        return (
          <Box key={key} sx={{ mb: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                my: 1.5,
                opacity: 0.85,
              }}
            >
              <Divider sx={{ flex: 1 }} />
              <Chip
                size="small"
                label={label}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                }}
                variant="outlined"
              />
              <Divider sx={{ flex: 1 }} />
            </Box>

            {grouped.map((g, gi) => {
              const mine = g.role === 'customer';
              const bubbleBg = mine
                ? `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.95
                  )}, ${alpha(
                    theme.palette.secondary?.main ||
                      theme.palette.primary.light,
                    0.95
                  )})`
                : alpha(
                    theme.palette.background.paper,
                    theme.palette.mode === 'dark' ? 0.25 : 0.9
                  );
              const bubbleColor = mine ? '#fff' : theme.palette.text.primary;

              return (
                <Box
                  key={gi}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: mine ? 'flex-end' : 'flex-start',
                    gap: 0.5,
                    mb: 1,
                  }}
                >
                  {g.items.map((msg, idx) => {
                    const lastInGroup = idx === g.items.length - 1;
                    const mediaUrl = msg.metadata?.mediaUrl as
                      | string
                      | undefined;
                    const mediaType = msg.metadata?.mediaType as
                      | 'image'
                      | 'audio'
                      | 'pdf'
                      | 'file'
                      | undefined;

                    return (
                      <Box
                        key={msg._id || `${gi}-${idx}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          gap: 1,
                          maxWidth: { xs: '88vw', sm: 520, md: 560 },
                        }}
                      >
                        {!mine && idx === 0 && (
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                              color: theme.palette.primary.main,
                              border: `1px solid ${alpha(
                                theme.palette.primary.main,
                                0.25
                              )}`,
                            }}
                          >
                            🤖
                          </Avatar>
                        )}

                        <Paper
                          elevation={0}
                          onDoubleClick={() => copyToClipboard(msg.text)}
                          sx={{
                            px: 1.25,
                            py: 1,
                            borderRadius: 3,
                            background: bubbleBg,
                            color: bubbleColor,
                            boxShadow: mine
                              ? `0 8px 22px ${alpha(
                                  theme.palette.primary.main,
                                  0.2
                                )}`
                              : `0 4px 14px ${alpha(
                                  theme.palette.common.black,
                                  0.07
                                )}`,
                            border: mine
                              ? `1px solid ${alpha('#fff', 0.15)}`
                              : `1px solid ${alpha(
                                  theme.palette.divider,
                                  0.6
                                )}`,
                            position: 'relative',
                            userSelect: 'text',
                            transition: 'transform .15s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                            },
                            '&::after': lastInGroup
                              ? {
                                  content: '""',
                                  position: 'absolute',
                                  bottom: -2,
                                  [mine ? 'right' : 'left']: -4,
                                  width: 12,
                                  height: 12,
                                  background: bubbleBg,
                                  transform: 'rotate(45deg)',
                                  borderBottom: mine
                                    ? `1px solid ${alpha('#fff', 0.15)}`
                                    : `1px solid ${alpha(
                                        theme.palette.divider,
                                        0.6
                                      )}`,
                                  borderRight: mine
                                    ? `1px solid ${alpha('#fff', 0.15)}`
                                    : `1px solid ${alpha(
                                        theme.palette.divider,
                                        0.6
                                      )}`,
                                  borderRadius: 0.5,
                                }
                              : undefined,
                          }}
                        >
                          {mediaUrl && (
                            <>
                              {mediaType === 'image' ? (
                                <a
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'block' }}
                                >
                                  <Box
                                    component="img"
                                    src={mediaUrl}
                                    alt="صورة"
                                    loading="lazy"
                                    sx={{
                                      maxWidth: '72vw',
                                      maxHeight: 320,
                                      borderRadius: 1.5,
                                      mb: 1,
                                      display: 'block',
                                    }}
                                  />
                                </a>
                              ) : mediaType === 'audio' ? (
                                <Box
                                  component="audio"
                                  controls
                                  src={mediaUrl}
                                  sx={{ width: 240, mb: 1 }}
                                />
                              ) : (
                                <a
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: mine
                                      ? '#fff'
                                      : theme.palette.primary.main,
                                    marginBottom: 8,
                                    display: 'block',
                                    fontWeight: 700,
                                  }}
                                >
                                  📎 تحميل الملف
                                </a>
                              )}
                            </>
                          )}

                          <Typography
                            sx={{
                              wordBreak: 'break-word',
                              '& a': {
                                color: mine
                                  ? '#fff'
                                  : theme.palette.primary.main,
                                textDecoration: 'underline',
                              },
                            }}
                            dangerouslySetInnerHTML={{
                              __html: linkify((msg.text ?? '').toString()),
                            }}
                          />

                          <Box
                            sx={{
                              mt: 0.75,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                opacity: 0.85,
                                fontSize: 11,
                                color: mine
                                  ? alpha('#fff', 0.95)
                                  : 'text.secondary',
                              }}
                            >
                              {timeLabel(new Date(msg.timestamp))}
                            </Typography>

                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.25,
                              }}
                            >
                              <Tooltip title="نسخ">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(msg.text)}
                                  sx={{
                                    color: mine
                                      ? alpha('#fff', 0.85)
                                      : 'text.secondary',
                                    '&:hover': {
                                      color: mine
                                        ? '#fff'
                                        : theme.palette.primary.main,
                                    },
                                  }}
                                >
                                  <ContentCopyRoundedIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>

                              {msg.role === 'bot' && (
                                <>
                                  <Tooltip title="تقييم إيجابي">
                                    <span>
                                      <IconButton
                                        color={
                                          msg.rating === 1
                                            ? 'primary'
                                            : 'default'
                                        }
                                        size="small"
                                        onClick={() => onRate?.(msg, 1)}
                                        disabled={msg.rating === 1}
                                      >
                                        <ThumbUpIcon fontSize="inherit" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title="تقييم سلبي">
                                    <span>
                                      <IconButton
                                        color={
                                          msg.rating === 0 ? 'error' : 'default'
                                        }
                                        size="small"
                                        onClick={() => onRate?.(msg, 0)}
                                        disabled={msg.rating === 0}
                                      >
                                        <ThumbDownIcon fontSize="inherit" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </Box>
                        </Paper>

                        {mine && idx === 0 && (
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: alpha(theme.palette.primary.main, 0.2),
                              color: '#fff',
                            }}
                          >
                            🙋‍♂️
                          </Avatar>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        );
      })}

      <div ref={bottomSentinelRef} />

      {!atBottom && (
        <Fab
          size="small"
          color="primary"
          onClick={jumpToBottom}
          sx={{
            position: 'sticky',
            left: 'calc(100% - 56px)',
            bottom: 8,
            boxShadow: `0 10px 26px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <KeyboardArrowDownRoundedIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ChatWindow;

