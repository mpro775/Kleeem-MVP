// src/widgets/chat/ChatWorkspace.tsx
import { useEffect, useMemo, useState } from "react";
import {

  Box,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,

} from "@mui/material";
import { useErrorHandler } from "@/shared/errors";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

import {
  useConversations,
  useSessionDetails,
  useMessages,
} from "@/features/mechant/Conversations/model/queries";
import {
  useHandover,
  useRate,
  useSendAgentMessage,
} from "@/features/mechant/Conversations/model/mutations";
import type {
  ChatMessage as UiChatMessage,
  ChatMessage as EntityChatMessage,
  ChannelType,
} from "@/features/mechant/Conversations/type";
import { useChatSocket } from "@/shared/hooks/useChatWebSocket";

import Header from "@/features/mechant/Conversations/ui/Header";
import Sidebar from "@/features/mechant/Conversations/ui/ConversationsSidebar";
import SessionsList from "@/features/mechant/Conversations/ui/ConversationsList";
import ChatWindow from "@/features/mechant/Conversations/ui/ChatWindow";
import ChatInput from "@/features/mechant/Conversations/ui/ChatInput";
import FeedbackDialog from "@/features/mechant/Conversations/ui/FeedbackDialog";
import { alpha } from "@mui/material/styles";

type MobileView = "list" | "chat";

function dedupeAppend(list: UiChatMessage[], msg: UiChatMessage) {
  const id = msg._id;
  if (id && list.some((m) => m._id === id)) return list;
  return [...list, msg];
}

export default function ChatWorkspace({ merchantId }: { merchantId: string }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { handleError } = useErrorHandler();
  // حفظ اختيارات المستخدم
  const [selectedChannel, setChannel] = useLocalStorage<"" | ChannelType>(
    "conv_selected_channel",
    "" as "" | ChannelType
  );
  const [selectedSession, setSelectedSession] = useLocalStorage<
    string | undefined
  >("conv_selected_session", undefined);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  

  const { mutateAsync: rate, isPending: ratingLoading } = useRate();
  const { data: sessions, isLoading: loadingSessions } = useConversations(
    merchantId,
    selectedChannel || undefined
  );
  const { data: sessionDetails } = useSessionDetails(selectedSession);
  const { data: initialMessages, isLoading: loadingMessages } =
    useMessages(selectedSession, merchantId);

  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  useEffect(() => {
    setMessages(initialMessages ?? []);
  }, [initialMessages]);

  const toUiMessage = (m: EntityChatMessage): UiChatMessage => {
    // Convert role: handle "system" and "bot" as "bot", others as-is
    let role: UiChatMessage["role"] = "bot";
    if (m.role === "customer" || m.role === "agent") {
      role = m.role;
    }
    
    // Convert rating: handle -1 as null, 0 and 1 as-is
    let rating: 0 | 1 | null = null;
    if (typeof m.rating === "number") {
      if (m.rating === 0 || m.rating === 1) {
        rating = m.rating;
      }
    }
    // الباك إند يرسل أحياناً id عبر WebSocket وليس _id
    const messageId = m._id ?? (m as { id?: string }).id ?? undefined;

    return {
      _id: messageId,
      role,
      text: m.text,
      timestamp: m.timestamp,
      rating,
      feedback: m.feedback ?? null,
    };
  };

  useChatSocket(
    selectedSession,
    (msg) => {
      setMessages((prev) => dedupeAppend(prev, toUiMessage(msg)));
    },
    "agent",
    merchantId
  );

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

  // تقييم + Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<UiChatMessage | null>(null);
  const handleRate = async (msg: UiChatMessage, rating: number) => {
    try {
      if (rating === 0) {
        if (!selectedSession) return handleError("اختر جلسة أولاً");
        if (!msg._id) return handleError("انتظر مزامنة الرسالة من الخادم.");
        setFeedbackMsg(msg);
        setFeedbackOpen(true);
        return;
      }
      if (!selectedSession || !msg._id) return;
      await rate({ sessionId: selectedSession, messageId: msg._id, rating });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? { ...m, rating: rating as 0 | 1 | null } : m
        )
      );
    } catch (e) {
      handleError(e);
    }
  };
  const handleSubmitFeedback = async (feedback: string) => {
    if (!feedbackMsg || !selectedSession || !feedbackMsg._id) {
      handleError("لا يمكن إرسال الملاحظة.");
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
      handleError(e);
    }
  };

  // إرسال
  const handleSend = async (payload: {
    text?: string;
    file?: File | null;
    audio?: Blob | null;
  }) => {
    const { text } = payload;
    if (!text || !selectedSession || !activeChannel) return;

    // ⛔️ امنع الإرسال إذا البوت ما زال يعمل
    if (!canAgentReply) {
      handleError(
        "لا يمكن الرد الآن. أوقف البوت من المفتاح العلوي ثم حاول مجددًا."
      );
      return;
    }

    const tempId = `temp-${Date.now()}`;
    // إضافة الرسالة محلياً فوراً لإظهارها مباشرة
    const tempMessage: UiChatMessage = {
      _id: tempId,
      role: "agent",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await sendMsg(text);
      // بعد نجاح الإرسال، إزالة الرسالة المؤقتة لأنها ستُستبدل بالرسالة الحقيقية من السيرفر
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }, 500);
    } catch (e) {
      handleError(e);
      // إزالة الرسالة المؤقتة في حالة الخطأ
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  };

  const loading = loadingSessions || loadingMessages;


  // ===== الجوال: شاشتان =====
  if (isMobile) {
    if (mobileView === "list") {
      return (
        <Box
          sx={{
            height: "100svh",
            display: "flex",
            flexDirection: "column",
            m: 0,
            p: 0,
            bgcolor: theme.palette.background.default,
          }}
        >
          {/* Tabs القنوات */}
          <Tabs
            value={selectedChannel}
            onChange={(_, v) => setChannel(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              m: 0,
              p: 0,
              position: "sticky",
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

          {/* قائمة الجلسات (هي التي تسكرول) */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <SessionsList
              sessions={sessions ?? []}
              loading={loadingSessions}
              selectedId={selectedSession}
              onSelect={(id) => {
                setSelectedSession(id);
                setMobileView("chat");
              }}
              enableSearch
            />
          </Box>
        </Box>
      );
    }

    // شاشة المحادثة
    return (
      <Box
        sx={{
          height: "100svh",
          display: "flex",
          flexDirection: "column",
          bgcolor: theme.palette.background.default,
        }}
      >
        {/* الهيدر ثابت */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1200,
            bgcolor: "background.paper",
            borderBottom: `1px solid ${theme.palette.divider}`,
            backdropFilter: "blur(20px)",
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <Header
            selectedSession={selectedSession}
            handover={handover}
            onToggleHandover={(v) => toggleHandover(v)}
            onBack={() => setMobileView("list")}
          />
        </Box>

        {/* 👇 هذا القسم هو الذي يتسكroll فقط */}
        {loading ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ChatWindow
                messages={messages}
                loading={loadingMessages}
                onRate={handleRate}
              />
            </Box>

            {/* ChatInput ثابت أسفل الشاشة + safe-area */}
            {!!selectedSession && (
              <Box
                sx={{
                  position: "sticky",
                  bottom: 0,
                  zIndex: 1200,
                  bgcolor: "background.paper",
                  borderTop: `1px solid ${theme.palette.divider}`,
                  backdropFilter: "blur(20px)",
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                  boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
                  pb: "env(safe-area-inset-bottom)",
                }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={!handover || !selectedSession}
                  disabledReason={
                    !selectedSession
                      ? "اختر محادثة أولاً."
                      : !handover
                      ? "البوت يعمل الآن. أوقف البوت من المفتاح بالأعلى لبدء الدردشة اليدوية."
                      : undefined
                  }
                />{" "}
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

  // ===== الديسكتوب =====
  return (
    <Box
      display="flex"
      sx={{
        height: "100svh",
        bgcolor:
          theme.palette.mode === "dark"
            ? `linear-gradient(180deg, ${alpha("#0b0b0f", 0.9)}, ${alpha(
                "#0a0a0c",
                0.9
              )})`
            : theme.palette.background.default,
      }}
    >
      {/* الشريط الجانبي */}
      <Box
        sx={{
          width: 320,
          borderInlineEnd: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
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

      {/* مساحة المحادثة */}
      <Box display="flex" flexDirection="column" flex={1} minWidth={0}>
        {/* الهيدر ثابت */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1200,
            bgcolor: "background.paper",
            borderBottom: `1px solid ${theme.palette.divider}`,
            backdropFilter: "blur(20px)",
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <Header
            selectedSession={selectedSession}
            handover={handover}
            onToggleHandover={(v) => toggleHandover(v)}
          />
        </Box>

        {/* 👇 الحاوية التي تتسكroll فقط هي ChatWindow */}
        {loading ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ChatWindow
                messages={messages}
                loading={loadingMessages}
                onRate={handleRate}
              />
            </Box>

            {/* ChatInput ثابت أسفل مساحة المحادثة */}
            {selectedSession && (
              <Box
                sx={{
                  position: "sticky",
                  bottom: 0,
                  zIndex: 1200,
                  bgcolor: "background.paper",
                  borderTop: `1px solid ${theme.palette.divider}`,
                  backdropFilter: "blur(20px)",
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                  boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
                }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={!handover || !selectedSession}
                  disabledReason={
                    !selectedSession
                      ? "اختر محادثة أولاً."
                      : !handover
                      ? "البوت يعمل الآن. أوقف البوت من المفتاح بالأعلى لبدء الدردشة اليدوية."
                      : undefined
                  }
                />{" "}
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
