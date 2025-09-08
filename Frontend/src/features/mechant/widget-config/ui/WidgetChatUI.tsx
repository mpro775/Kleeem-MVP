// src/features/mechant/widget-config/ui/WidgetChatUI.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  InputBase,
  Tooltip,
  Avatar,
  Divider,
  Chip,
  CircularProgress,
  Popover,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import InsertEmoticonRoundedIcon from "@mui/icons-material/InsertEmoticonRounded";

import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import {
  fetchWidgetSessionMessages,
  sendMessage,
} from "@/features/mechant/Conversations/api/messages";
import type { ChatMessage, Role } from "@/features/mechant/Conversations/type";
/* 👇 المهم: توحيد اللون + المتغيرات */
import {
  ensureAllowedBrandHex,
  applyBrandCssVars,
} from "@/features/shared/brandPalette";
import Picker, { type EmojiClickData } from "emoji-picker-react";
import { useChatSocket } from "@/shared/hooks/useChatWebSocket";

type WidgetSettings = {
  merchantId: string;
  botName: string;
  welcomeMessage: string;
  brandColor: string; // ← لون موحّد (داكن فقط)
  fontFamily: string;
  headerBgColor?: string; // ← سيتم تجاهله
  bodyBgColor?: string; // ← سيتم تجاهله
  avatarUrl?: string;
  showPoweredBy?: boolean;
  publicSlug?: string;
  widgetSlug?: string;
  embedMode?: "bubble" | "iframe" | "bar" | "conversational";
};

function normalizeHex(hex?: string, fallback = "#111827") {
  if (!hex) return fallback;
  const h = hex.trim();
  return h.startsWith("#") ? h : `#${h}`;
}
function hexToRgb(hex: string) {
  const cleaned = normalizeHex(hex).replace("#", "");
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255,
    g = (bigint >> 8) & 255,
    b = bigint & 255;
  return { r, g, b };
}
function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function getContrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111" : "#fff";
}
function getInitials(name?: string) {
  if (!name) return "K";
  const parts = name.split(" ").filter(Boolean);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
}
function formatTime(ts?: string | number | Date) {
  try {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function WidgetChatUI({
  settings,
  layout = "embed", // 👈 جديد
}: {
  settings: WidgetSettings;
  layout?: "embed" | "standalone";
}) {
  // session
  const [sessionId] = useState(
    () =>
      localStorage.getItem(`kaleem_session_${settings.merchantId}`) ||
      (() => {
        const uuid =
          (globalThis.crypto as Crypto)?.randomUUID?.() ??
          Date.now().toString(36) + Math.random().toString(36).slice(2);
        localStorage.setItem(`kaleem_session_${settings.merchantId}`, uuid);
        return uuid;
      })()
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waitingReply, setWaitingReply] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isStandalone = layout === "standalone";
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const emojiOpen = Boolean(emojiAnchor);

  const handleOpenEmoji = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Use ref instead of event target for more stable positioning
    setEmojiAnchor(emojiButtonRef.current || e.currentTarget);
  }, []);

  const handleCloseEmoji = useCallback(() => {
    setEmojiAnchor(null);
  }, []);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
  }, []);
  useChatSocket(
    sessionId,
    (msg: ChatMessage) => {
      setWaitingReply(false);
      setMessages((prev) => [...prev, msg]);
    },
    "customer",
    settings.merchantId
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const slug = settings.publicSlug || settings.widgetSlug;
      if (!slug) return; // لا تحاول النداء بدون slug
      try {
        const msgs = await fetchWidgetSessionMessages(slug, sessionId);
        if (mounted) setMessages(msgs ?? []);
      } catch {
        /* تجاهل بدون إظهار أخطاء الشبكة */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, settings.publicSlug, settings.widgetSlug]);

  useEffect(() => {
    if (bottomRef.current)
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ✅ اللون الموحّد فقط (يُجبر على قائمة مسموحة) + تطبيق CSS vars
  const brandHex = ensureAllowedBrandHex(settings.brandColor);
  useEffect(() => {
    applyBrandCssVars(brandHex);
  }, [brandHex]);

  // Theme vars موحّدة
  const themeVars = useMemo(() => {
    const brand = brandHex; // ← نفس اللون في كل الأجزاء
    const header = brand; // ← رأس الدردشة
    const body = "#FFFFFF"; // ← الخلفية دومًا بيضاء
    const brandSoft = rgba(brand, 0.08);
    const brandBorder = rgba(brand, 0.24);
    const headerText = getContrastText(header);
    return { brand, header, body, brandSoft, brandBorder, headerText };
  }, [brandHex]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const slug = settings.publicSlug || settings.widgetSlug;
    if (!slug || !settings.merchantId) {
      setMessages((m) => [
        ...m,
        {
          role: "bot" as Role,
          text: "إعدادات الدردشة غير مكتملة (المعرف/السلاج غير متوفر).",
          timestamp: new Date().toISOString(),
          error: true,
        } as ChatMessage,
      ]);
      return;
    }

    const out: ChatMessage = {
      role: "customer" as Role,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, out]);
    setInput("");
    setSending(true);
    setWaitingReply(true);

    try {
      await sendMessage({
        slug,
        merchantId: settings.merchantId,
        sessionId,
        channel: "webchat",
        embedMode: settings.embedMode || "bubble",
        messages: [{ role: "customer", text }],
      });
    } catch (e) {
      setWaitingReply(false);
      setMessages((m) => [
        ...m,
        {
          role: "bot" as any,
          text: "تعذر إرسال الرسالة، حاول مرة أخرى.",
          timestamp: new Date().toISOString(),
          error: true,
        } as any,
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Close emoji picker on Escape
    if (e.key === "Escape" && emojiOpen) {
      handleCloseEmoji();
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const d = new Date((m as any).timestamp || Date.now());
      const key = d.toLocaleDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [messages]);

  return (
    <Paper
      elevation={isStandalone ? 6 : 0}
      sx={{
        direction: "rtl",
        borderRadius: isStandalone ? 4 : 3,
        overflow: "hidden",
        border: isStandalone ? "none" : `1px solid ${themeVars.brandBorder}`,
        background: themeVars.body,
        fontFamily: settings.fontFamily || "Tajawal, system-ui, sans-serif",
        display: "flex", // 👈 امتلاء عمودي
        flexDirection: "column",
        flex: 1, // 👈 خذ كامل عرض وعاء ChatPage
        minWidth: 0,
        minHeight: 0, // مهم مع الفليكس
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: { xs: 1.5, md: 2 },
          py: { xs: 1, md: 1.5 },
          background: isStandalone
            ? `linear-gradient(90deg, ${themeVars.header}, ${rgba(
                themeVars.header,
                0.9
              )})`
            : themeVars.header,
          color: themeVars.headerText,
          boxShadow: isStandalone
            ? "inset 0 -1px 0 rgba(255,255,255,.15)"
            : "none",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={settings.avatarUrl}
            sx={{
              width: 36,
              height: 36,
              bgcolor: rgba(themeVars.brand, 0.2),
              color: themeVars.headerText,
              fontWeight: 700,
            }}
          >
            {!settings.avatarUrl && getInitials(settings.botName || "K")}
          </Avatar>
          <FiberManualRecordRoundedIcon
            fontSize="small"
            sx={{
              position: "absolute",
              bottom: -2,
              left: -2,
              color: "#44b700",
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, lineHeight: 1.2 }}
          >
            {settings.botName || "Kaleem Bot"}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            متصل الآن • الرد عادة خلال ثوانٍ
          </Typography>
        </Box>

        <Tooltip title="إجابات ذكية">
          <IconButton size="small" sx={{ color: themeVars.headerText }}>
            <BoltRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box
        ref={listRef}
        sx={{
          position: "relative",
          flex: 1, // 👈 امتلاء المساحة المتبقية
          minHeight: 0, // 👈 ضروري مع overflow
          overflowY: "auto",
          background: "#fff",
          px: { xs: 1, md: 1.5 },
          py: { xs: 1, md: 1.5 },
        }}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <Box sx={{ color: themeVars.brand, textAlign: "center", py: 4 }}>
            <Typography variant="body2">{settings.welcomeMessage}</Typography>
            <Box
              sx={{
                display: "flex",
                gap: 0.75,
                justifyContent: "center",
                mt: 1.25,
              }}
            >
              <Chip
                icon={<FlashOnRoundedIcon />}
                label="ما الجديد؟"
                size="small"
                onClick={() => setInput("ماهي العروض الحالية؟")}
                sx={{
                  bgcolor: themeVars.brandSoft,
                  border: `1px dashed ${themeVars.brandBorder}`,
                }}
              />
              <Chip
                label="تتبع طلبي"
                size="small"
                onClick={() => setInput("أريد تتبع طلبي")}
                sx={{
                  bgcolor: themeVars.brandSoft,
                  border: `1px dashed ${themeVars.brandBorder}`,
                }}
              />
            </Box>
          </Box>
        )}

        {groups.map(([day, msgs]) => (
          <Box key={day} sx={{ mb: 1.25 }}>
            <Divider>
              <Chip
                size="small"
                label={day}
                sx={{
                  bgcolor: themeVars.brandSoft,
                  border: `1px solid ${themeVars.brandBorder}`,
                }}
              />
            </Divider>
            <Box sx={{ mt: 1 }}>
              {msgs.map((msg, idx) => {
                const mine = (msg as any).role === "customer";
                const error = (msg as any).error;
                const bubbleBg = mine ? "#f7f7f8" : themeVars.brand;
                const bubbleColor = mine ? "#111" : "#ffffff"; // 👈 لون أبيض للبوت
                const align = mine ? "flex-end" : "flex-start"; // 👈 عكس الاتجاه للعربية
                const radius = mine
                  ? "16px 16px 16px 4px" // 👈 عكس زوايا المستخدم
                  : "16px 16px 4px 16px"; // 👈 عكس زوايا البوت
                return (
                  <Box
                    key={idx}
                    sx={{ display: "flex", justifyContent: align, mb: 0.75 }}
                  >
                    <Box
                      sx={{
                        maxWidth: "78%",
                        px: 1.25,
                        py: 0.9,
                        borderRadius: radius,
                        bgcolor: error ? rgba("#d32f2f", 0.12) : bubbleBg,
                        color: error ? "#b71c1c" : bubbleColor,
                        border: error
                          ? `1px solid ${rgba("#d32f2f", 0.4)}`
                          : mine
                          ? `1px solid #eee`
                          : `1px solid ${themeVars.brandBorder}`,
                        boxShadow: mine
                          ? "0 1px 1px rgba(0,0,0,0.05)"
                          : "0 2px 12px rgba(0,0,0,0.06)",
                        wordBreak: "break-word",
                        position: "relative",
                      }}
                    >
                      <Typography
                        variant="body2"
                        dir="rtl"
                        color={mine ? themeVars.brand : "white"}
                        textAlign={mine ? "left" : "left"}
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        {(msg as any).text}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          display: "block",
                          mt: 0.5,
                          textAlign: mine ? "left" : "right", // 👈 عكس اتجاه الوقت
                        }}
                      >
                        {formatTime((msg as any).timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}

        {waitingReply && (
          <Box
            sx={{ display: "flex", gap: 0.75, alignItems: "center", mt: 0.5 }}
          >
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: rgba(themeVars.brand, 0.12),
                color: themeVars.brand,
              }}
            >
              …
            </Avatar>
            <Box sx={{ display: "flex", gap: 0.4 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: themeVars.brand,
                  animation: "blink 1s infinite",
                }}
              />
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: themeVars.brand,
                  animation: "blink 1s 0.2s infinite",
                }}
              />
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: themeVars.brand,
                  animation: "blink 1s 0.4s infinite",
                }}
              />
            </Box>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Composer */}
      <Box
        sx={{
          px: { xs: 1, md: 1.5 },
          py: { xs: 1, md: 1.25 },
          borderTop: `1px solid ${themeVars.brandBorder}`,
          bgcolor: isStandalone ? "#f3f5f9" : "#f8f9fb",
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 0.5,
            borderRadius: 999,
            borderColor: themeVars.brandBorder,
            boxShadow: "none",
            bgcolor: "#fff",
          }}
        >
          <Tooltip title="إدراج رموز" placement="top">
            <IconButton
              ref={emojiButtonRef}
              size="small"
              onClick={handleOpenEmoji}
              sx={{
                position: "relative", // Ensure stable positioning
              }}
            >
              <InsertEmoticonRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Popover
            open={emojiOpen}
            anchorEl={emojiAnchor}
            onClose={handleCloseEmoji}
            anchorOrigin={{ vertical: "top", horizontal: "left" }}
            transformOrigin={{ vertical: "bottom", horizontal: "left" }}
            disablePortal={false}
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                border: `1px solid ${themeVars.brandBorder}`,
                overflow: "hidden",
              },
            }}
            disableScrollLock={true}
            disableRestoreFocus={true}
            disableEnforceFocus={true}
            disableAutoFocus={true}
            keepMounted={false}
            slotProps={{
              backdrop: {
                sx: { backgroundColor: "transparent" },
              },
            }}
          >
            <Box
              sx={{
                p: 0,
                maxHeight: "300px",
                overflow: "hidden",
                "& .EmojiMart": {
                  border: "none",
                  borderRadius: 0,
                },
              }}
            >
              <Picker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                height={350}
                width="100%"
                previewConfig={{ showPreview: false }}
                searchDisabled
                skinTonesDisabled
              />
            </Box>
          </Popover>{" "}
          <InputBase
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            dir="rtl"
            placeholder="اكتب رسالتك…"
            sx={{ flex: 1, px: 1, py: 0.5 }}
            inputProps={{ "aria-label": "حقل كتابة الرسالة" }}
          />
          <Tooltip title="إرسال" placement="top">
            <span>
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || sending}
                size="small"
                sx={{
                  bgcolor:
                    input.trim() && !sending ? themeVars.brand : "#e9eaee",
                  color:
                    input.trim() && !sending
                      ? getContrastText(themeVars.brand)
                      : "#9aa0a6",
                  ":hover": {
                    bgcolor:
                      input.trim() && !sending
                        ? rgba(themeVars.brand, 0.85)
                        : "#e0e2e7",
                  },
                }}
              >
                {sending ? (
                  <CircularProgress size={18} />
                ) : (
                  <SendRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Paper>

        {settings.showPoweredBy !== false && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 1,
              color: "#9aa0a6",
            }}
          >
            مُشغَّل بواسطة <strong style={{ color: brandHex }}>Kaleem</strong>
          </Typography>
        )}
      </Box>

      <style>{`@keyframes blink { 0%{opacity:.2} 50%{opacity:1} 100%{opacity:.2} }`}</style>
    </Paper>
  );
}
