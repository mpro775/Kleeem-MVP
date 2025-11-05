'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import type { Instruction } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  instruction: Instruction | null;
}

export const InstructionEditDialog = ({
  open,
  onClose,
  onSave,
  instruction,
}: Props) => {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(instruction ? instruction.instruction : "");
  }, [instruction, open]);

  const handleSave = () => {
    if (!text.trim()) {
      alert("حقل التوجيه لا يمكن أن يكون فارغًا.");
      return;
    }
    onSave(text.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {instruction ? "تعديل توجيه" : "إضافة توجيه جديد"}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب توجيهًا واضحًا ومختصرًا..."
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};
