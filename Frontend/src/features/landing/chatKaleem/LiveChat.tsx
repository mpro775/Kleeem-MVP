// src/features/landing/chatKaleem/LiveChat.tsx
import { Box } from "@mui/material";
import ChatInput from "./ui/ChatInput";
import ChatBubble from "./ui/ChatBubble";
import { useLiveChat } from "./hooks/useLiveChat";

interface LiveChatProps {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
}

const TypingIndicator = () => (
  // يمكنك تحسين شكل مؤشر "يكتب الآن" هنا
  <ChatBubble msg={{ id: "typing", from: "bot", text: "..." }} />
);

export default function LiveChat({ messagesContainerRef }: LiveChatProps) {
  const { messages, isTyping, isLoading, handleSend } =
    useLiveChat(messagesContainerRef);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* منطقة الرسائل ستتوسع تلقائيًا */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            // يمكنك إضافة منطق أزرار التقييم هنا
          />
        ))}
        {isTyping && <TypingIndicator />}
      </Box>

      {/* حقل الإدخال في الأسفل */}
      <ChatInput onSend={handleSend} disabled={isLoading} autoFocusOnMount />
    </Box>
  );
}
