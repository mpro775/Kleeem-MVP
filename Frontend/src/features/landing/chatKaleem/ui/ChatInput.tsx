import { Box, IconButton, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MoodIcon from '@mui/icons-material/Mood';
import { useTheme } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  autoFocusOnMount?: boolean;
};

export default function ChatInput({ disabled, onSend, autoFocusOnMount }: Props) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocusOnMount) inputRef.current?.focus();
  }, [autoFocusOnMount]);

  const handleSend = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderTop: '1px solid #f0f0f0' }}>
      <IconButton
        aria-label="إرسال"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        sx={{
          ml: 1,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          '&:hover': { bgcolor: theme.palette.primary.dark },
        }}
      >
        <SendIcon />
      </IconButton>

      <TextField
        fullWidth
        size="small"
        placeholder="اكتب سؤالك..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && handleSend()}
        disabled={disabled}
        inputProps={{ style: { textAlign: 'right' } , 'aria-label': 'حقل إدخال الرسالة' }}
        sx={{ bgcolor: '#f6f6f6', borderRadius: 2, mx: 1 }}
        inputRef={inputRef}
      />

      <MoodIcon sx={{ color: 'text.secondary' }} />
    </Box>
  );
}
