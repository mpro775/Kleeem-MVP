'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  initialQuestion: string;
  initialAnswer?: string;
  onSubmit: (payload: { question: string; answer: string }) => Promise<void>;
};

export default function AddToKnowledgeDialog({
  open, onClose, initialQuestion, initialAnswer, onSubmit,
}: Props) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ question: question.trim(), answer: answer.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>إضافة للمعرفة (FAQ)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="السؤال"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            fullWidth
          />
          <TextField
            label="الإجابة"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            placeholder="اكتب الإجابة التي تريد أن يتعلمها البوت..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || !question.trim() || !answer.trim()}>
          حفظ وتعليم كمُعالج
        </Button>
      </DialogActions>
    </Dialog>
  );
}
