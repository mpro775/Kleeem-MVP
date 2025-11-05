// ChatBubble.tsx
import { memo, type ReactNode } from 'react';
import { Avatar, Box, Paper, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTheme } from '@mui/material/styles';
import type { ChatMessage } from '../types';

// Helper function to format text with line breaks
const autoLineBreaks = (text: string): string => {
  if (!text) return '';
  // Keep existing line breaks and return the text as-is for pre-wrap rendering
  return text;
};

export type ChatBubbleProps = {
  msg: ChatMessage;
  actions?: ReactNode;           // ✅ مكان نمرّر فيه أزرار التقييم
};

const ChatBubble = memo(({ msg, actions }: ChatBubbleProps) => {
  const theme = useTheme();
  const isUser = msg.from === 'user';
  const isBot  = msg.from === 'bot';

  const bubbleBg = isUser ? theme.palette.primary.dark : theme.palette.background.paper;
  const bubbleFg = isUser ? theme.palette.primary.contrastText : theme.palette.text.primary;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row', // ✅ قلبنا ترتيب الأفاتار/الفقاعة حسب المرسل
        alignItems: 'flex-end',
        gap: 1,
        mb: 1.5,
      }}
    >
      {isBot && (
        <Avatar
          sx={{ bgcolor: theme.palette.primary.dark, color: '#fff', width: 32, height: 32 }}
        >
          <SmartToyIcon />
        </Avatar>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            // ✅ “ذيل” الفقاعة: للمستخدم يمين (bottom-left صغير)، وللبوت يسار (bottom-right صغير)
            borderRadius: isUser ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
            bgcolor: bubbleBg,
            color: bubbleFg,
            lineHeight: 1.7,
          }}
        >
          {/* ✅ اجبر النص على توريث اللون من الفقاعة */}
          <Typography
            variant="body2"
            color="inherit"
            dir="rtl"
            sx={{ whiteSpace: 'pre-wrap', textAlign: 'left', lineHeight: 1.9 }}
          >
            {autoLineBreaks(msg.text)}
          </Typography>

          {msg.listItems && (
            <Box component="ul" sx={{ pl: 2.5, mt: 1, mb: 0 }}>
              {msg.listItems.map((item, i) => (
                <Typography component="li" key={i} variant="body2" color="inherit">
                  {item}
                </Typography>
              ))}
            </Box>
          )}

          {msg.question && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CheckCircleIcon sx={{ color: '#32CD32', fontSize: 16, ml: 0.5 }} />
              <Typography variant="body2" color="inherit">{msg.question}</Typography>
            </Box>
          )}
        </Paper>

        {/* ✅ أزرار التقييم داخل الفقاعة وبمحاذاة صحيحة */}
        {actions && (
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, direction: 'rtl' /* ثبّت ترتيب 👍 👎 */ }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
});

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;
