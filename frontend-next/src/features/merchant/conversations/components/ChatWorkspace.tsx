'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import {
  useConversations,
  useSessionDetails,
  useMessages,
} from '../queries';
import {
  useHandover,
  useRate,
  useSendAgentMessage,
} from '../mutations';
import type { ChatMessage, ChannelType } from '../types';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import Header from './Header';
import Sidebar from './ConversationsSidebar';
import SessionsList from './ConversationsList';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import FeedbackDialog from './FeedbackDialog';

type MobileView = 'list' | 'chat';

function dedupeAppend(list: ChatMessage[], msg: ChatMessage) {
  if (msg._id && list.some((m) => m._id === msg._id)) return list;
  return [...list, msg];
}

export default function ChatWorkspace({ merchantId }: { merchantId: string }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedChannel, setChannel] = useLocalStorage<'' | ChannelType>(
    'conv_selected_channel',
    ''
  );
  const [selectedSession, setSelectedSession] = useLocalStorage<
    string | undefined
  >('conv_selected_session', undefined);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  const { mutateAsync: rate, isPending: ratingLoading } = useRate();
  const { data: sessions, isLoading: loadingSessions } = useConversations(
    merchantId,
    selectedChannel || undefined
  );
  const { data: sessionDetails } = useSessionDetails(selectedSession);
  const { data: initialMessages, isLoading: loadingMessages } =
    useMessages(selectedSession);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  useEffect(() => {
    setMessages(initialMessages ?? []);
  }, [initialMessages]);

  const toUiMessage = (m: any): ChatMessage => ({
    _id: m._id,
    role: m.role === 'system' ? 'bot' : (m.role as ChatMessage['role']),
    text: m.text,
    timestamp: m.timestamp,
    rating: typeof m.rating === 'number' ? m.rating : null,
    feedback: m.feedback ?? null,
    metadata: m.metadata,
  });

  // WebSocket connection for real-time messages
  useWebSocket(selectedSession || '', {
    onMessage: (msg: any) => {
      setMessages((prev) => dedupeAppend(prev, toUiMessage(msg)));
    },
    enabled: !!selectedSession,
  });

  const { mutateAsync: toggleHandover } = useHandover(selectedSession);
  const handover = sessionDetails?.handoverToAgent ?? false;
  const canAgentReply = !!handover;

  const activeChannel = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return undefined;
    return sessions.find((s) => s.sessionId === selectedSession)?.channel;
  }, [sessions, selectedSession]);

  const { mutateAsync: sendMsg } = useSendAgentMessage(
    merchantId,
    selectedSession,
    activeChannel
  );

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<ChatMessage | null>(null);

  const handleRate = async (msg: ChatMessage, rating: number) => {
    try {
      if (rating === 0) {
        if (!selectedSession) {
          console.error('اختر جلسة أولاً');
          return;
        }
        if (!msg._id) {
          console.error('انتظر مزامنة الرسالة من الخادم.');
          return;
        }
        setFeedbackMsg(msg);
        setFeedbackOpen(true);
        return;
      }
      if (!selectedSession || !msg._id) return;
      await rate({ sessionId: selectedSession, messageId: msg._id, rating });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? { ...m, rating: rating as 0 | 1 | -1 } : m
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitFeedback = async (feedback: string) => {
    if (!feedbackMsg || !selectedSession || !feedbackMsg._id) {
      console.error('لا يمكن إرسال الملاحظة.');
      return;
    }
    try {
      await rate({
        sessionId: selectedSession,
        messageId: feedbackMsg._id,
        rating: 0,
        feedback,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === feedbackMsg._id ? { ...m, rating: 0, feedback } : m
        )
      );
      setFeedbackOpen(false);
      setFeedbackMsg(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (payload: {
    text?: string;
    file?: File | null;
    audio?: Blob | null;
  }) => {
    const { text } = payload;
    if (!text || !selectedSession || !activeChannel) return;

    if (!canAgentReply) {
      console.error(
        'لا يمكن الرد الآن. أوقف البوت من المفتاح العلوي ثم حاول مجددًا.'
      );
      return;
    }

    try {
      await sendMsg(text);
      setMessages((prev) => [
        ...prev,
        {
          _id: undefined,
          role: 'agent',
          text,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const loading = loadingSessions || loadingMessages;

  // Mobile view
  if (isMobile) {
    if (mobileView === 'list') {
      return (
        <Box
          sx={{
            height: '100svh',
            display: 'flex',
            flexDirection: 'column',
            m: 0,
            p: 0,
            bgcolor: theme.palette.background.default,
          }}
        >
          <Tabs
            value={selectedChannel}
            onChange={(_, v) => setChannel(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              m: 0,
              p: 0,
              position: 'sticky',
              top: 0,
              zIndex: 10,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <Tab value="" label="الكل" />
            <Tab value="whatsapp" label="واتساب" />
            <Tab value="telegram" label="تيليجرام" />
            <Tab value="webchat" label="ويب شات" />
          </Tabs>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <SessionsList
              sessions={sessions ?? []}
              loading={loadingSessions}
              selectedId={selectedSession}
              onSelect={(id) => {
                setSelectedSession(id);
                setMobileView('chat');
              }}
              enableSearch
            />
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme.palette.background.default,
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            backdropFilter: 'blur(20px)',
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <Header
            selectedSession={selectedSession}
            handover={handover}
            onToggleHandover={(v) => toggleHandover(v)}
            onBack={() => setMobileView('list')}
            channel={activeChannel}
          />
        </Box>

        {loading ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ChatWindow
                messages={messages}
                loading={loadingMessages}
                onRate={handleRate}
              />
            </Box>

            {!!selectedSession && (
              <Box
                sx={{
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 1200,
                  bgcolor: 'background.paper',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  backdropFilter: 'blur(20px)',
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                  pb: 'env(safe-area-inset-bottom)',
                }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={!handover || !selectedSession}
                  disabledReason={
                    !selectedSession
                      ? 'اختر محادثة أولاً.'
                      : !handover
                      ? 'البوت يعمل الآن. أوقف البوت من المفتاح بالأعلى لبدء الدردشة اليدوية.'
                      : undefined
                  }
                />
              </Box>
            )}
          </Box>
        )}

        <FeedbackDialog
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={handleSubmitFeedback}
          loading={ratingLoading}
        />
      </Box>
    );
  }

  // Desktop view
  return (
    <Box
      display="flex"
      sx={{
        height: '100svh',
        bgcolor:
          theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha('#0b0b0f', 0.9)}, ${alpha(
                '#0a0a0c',
                0.9
              )})`
            : theme.palette.background.default,
      }}
    >
      <Box
        sx={{
          width: 320,
          borderInlineEnd: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <Sidebar selectedChannel={selectedChannel} setChannel={setChannel} />
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <SessionsList
            sessions={sessions ?? []}
            loading={loadingSessions}
            onSelect={setSelectedSession}
            selectedId={selectedSession}
            enableSearch
          />
        </Box>
      </Box>

      <Box display="flex" flexDirection="column" flex={1} minWidth={0}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            backdropFilter: 'blur(20px)',
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <Header
            selectedSession={selectedSession}
            handover={handover}
            onToggleHandover={(v) => toggleHandover(v)}
            channel={activeChannel}
          />
        </Box>

        {loading ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ChatWindow
                messages={messages}
                loading={loadingMessages}
                onRate={handleRate}
              />
            </Box>

            {selectedSession && (
              <Box
                sx={{
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 1200,
                  bgcolor: 'background.paper',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  backdropFilter: 'blur(20px)',
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={!handover || !selectedSession}
                  disabledReason={
                    !selectedSession
                      ? 'اختر محادثة أولاً.'
                      : !handover
                      ? 'البوت يعمل الآن. أوقف البوت من المفتاح بالأعلى لبدء الدردشة اليدوية.'
                      : undefined
                  }
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleSubmitFeedback}
        loading={ratingLoading}
      />
    </Box>
  );
}

