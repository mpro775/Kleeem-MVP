import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useState, useRef, useEffect } from "react";

interface Message {
  from: "user" | "bot";
  text: string;
}

type Props = {
  merchantId: string;                 // ضروري
  // endpoint اللي يرجّع botReply (اختَر واحد):
  // 1) بروكسيك: /api/tools/prompt-test (لو عاملناه)
  // 2) أو Webhook n8n التجريبي اللي يرد JSON { botReply }
  promptTestUrl: string;
  // باك-إند “ردّ التستنج” (اختياري لكن مُستحسن للتخزين/الـWS):
  testBotReplyBase?: string;          // افتراضي: https://api.kaleem-ai.com/api/webhooks
};

export function ChatSimulator({
  merchantId,
  promptTestUrl,
  testBotReplyBase = "https://api.kaleem-ai.com/api/webhooks",
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const scrollToBottom = () => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  };
  useEffect(scrollToBottom, [messages]);

  const send = async () => {
    const userText = input.trim();
    if (!userText || loading) return;
  
    const sessionId = `dash-${Date.now()}`;
    const channel = "dashboard-test"; // خليك متسق معه في الباك
  
    setMessages((m) => [...m, { from: "user", text: userText }]);
    setInput("");
    setLoading(true);
  
    try {
      // (A) أرسل رسالة "العميل" لمسار الوِبهـوك الحقيقي
      await fetch(`${testBotReplyBase}/incoming/${merchantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // حقول دنيا يُمرّرها normalizeIncomingMessage
          merchantId,               // احتياطًا
          sessionId,
          channel,                  // لازم يتطابق مع اللي تستخدمه بالرَّاوتِنج
          text: userText,
          from: { id: "dashboard-sim", name: "Dashboard Tester" }, // اختياري
          // message: { text: userText } // لو حاب تدعم فورمات قنوات ثانية
          metadata: { source: "dashboard-simulator" },
        }),
      });
  
      // (B) جيب ردّ الذكاء من مسار التستنج (اختياري للمحاكاة)
      const res = await fetch(promptTestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, text: userText, sessionId, channel }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { botReply?: string } = await res.json();
      const reply = data.botReply ?? "—";
  
      // (C) اعرض الرد محليًا
      setMessages((m) => [...m, { from: "bot", text: reply }]);
  
      // (D) (اختياري) بلّغ الباك إند برد تجريبي (عشان يخزن ويبث WS)
      await fetch(`${testBotReplyBase}/${merchantId}/test-bot-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: reply, channel }),
      });
    } catch (e) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "تعذّر إجراء الاختبار الآن. تأكد من المسارات." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Typography variant="h6" sx={{ p: 1, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
        محاكاة المحادثة
      </Typography>

      {/* الرسائل */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 1, minWidth: 0 }}>
        <List ref={listRef}>
          {messages.map((m, i) => (
            <ListItem key={i} sx={{ justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
              <Box
                sx={{
                  bgcolor: m.from === "user" ? "primary.main" : "grey.200",
                  color: m.from === "user" ? "white" : "black",
                  borderRadius: 2,
                  p: 1,
                  maxWidth: "80%",
                }}
              >
                <ListItemText primary={m.text} />
              </Box>
            </ListItem>
          ))}
          {messages.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
              ابدأ بكتابة رسالة لإجراء المحاكاة...
            </Typography>
          )}
        </List>
      </Box>

      {/* الإدخال */}
      <Box sx={{ display: "flex", p: 1, borderTop: "1px solid rgba(0,0,0,0.12)" }}>
        <TextField
          fullWidth
          placeholder={loading ? "جارٍ الإرسال..." : "اكتب رسالة..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          size="small"
          disabled={loading}
        />
        <IconButton color="primary" onClick={send} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
}
