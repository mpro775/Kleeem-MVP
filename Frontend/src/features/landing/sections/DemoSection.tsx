// src/components/landing/DemoSection.tsx
import { useEffect, useRef, useState } from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";

import {
  ChatHeader,
  ChatBubble,
  LiveChat,
  DEMO_MESSAGES,
  KLEEM_COLORS,
} from "@/features/landing/chatKaleem";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useChatAnimation } from "@/features/landing/chatKaleem/hooks/useChatAnimation"; // تأكد من أن المسار صحيح

gsap.registerPlugin(ScrollTrigger);

export default function DemoSection() {
  const [isChatLive, setIsChatLive] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const demoMessagesRef = useRef<HTMLDivElement>(null);
  const liveChatRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useChatAnimation(isChatLive, {
    ctaRef: ctaRef as React.RefObject<HTMLElement>,
    chatWindowRef: chatWindowRef as React.RefObject<HTMLElement>,
    demoMessagesRef: demoMessagesRef as React.RefObject<HTMLElement>,
    liveChatRef: liveChatRef as React.RefObject<HTMLElement>,
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current, {
        opacity: 0,
        y: 100,
        duration: 1,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <Box
      ref={sectionRef}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        py: 10,
        px: 3,
        bgcolor: "#fff",
      }}
    >
      {/* عمود الشات */}
      <Box
        ref={chatWindowRef}
        sx={{
          width: { xs: "100%", sm: 370 },
          maxWidth: "100%",
          order: { xs: 2, md: 1 },
        }}
      >
        <Paper
          elevation={4}
          sx={{
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            bgcolor: "#fafafa",
            minHeight: 520,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChatHeader />
          <Box
            ref={messagesContainerRef}
            sx={{ flexGrow: 1, p: 2, overflowY: "auto", position: "relative" }}
          >
            {/* حاوية الرسائل التجريبية: تبقى في DOM ولكن يتم إخفاؤها بالأنميشن */}
            <Box
              ref={demoMessagesRef}
              sx={{ position: "absolute", top: 16, left: 16, right: 16 }}
            >
              <Chip
                label="اليوم"
                sx={{ display: "block", mx: "auto", mb: 2, bgcolor: "#e0e0e0" }}
              />
              {DEMO_MESSAGES.map((m) => (
                <ChatBubble key={m.id} msg={m} />
              ))}
            </Box>

            {/* حاوية المحادثة الحية: تبقى في DOM ويتم إظهارها بالأنميشن */}
            <Box ref={liveChatRef} sx={{ height: "100%" }}>
              {isChatLive && (
                <LiveChat messagesContainerRef={messagesContainerRef} />
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* عمود الدعوة للعمل: يبقى في DOM ويتم إخفاؤه بالأنميشن */}
      <Box
        ref={ctaRef}
        sx={{
          textAlign: { xs: "center", md: "right" },
          maxWidth: 400,
          order: { xs: 1, md: 2 },
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          fontWeight="bold"
          sx={{ mb: 3 }}
        >
          تحدث مع{" "}
          <Box component="span" sx={{ color: KLEEM_COLORS.primary }}>
            كَلِيم
          </Box>{" "}
          الآن
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => setIsChatLive(true)}
          sx={{
            bgcolor: KLEEM_COLORS.primary,
            borderRadius: "12px",
            px: 5,
            py: 1.5,
            fontSize: "1rem",
            boxShadow: "0 4px 15px rgba(86,63,166,.3)",
            "&:hover": { bgcolor: KLEEM_COLORS.primaryHover },
          }}
        >
          ابدأ المحادثة الآن
        </Button>
      </Box>
    </Box>
  );
}
