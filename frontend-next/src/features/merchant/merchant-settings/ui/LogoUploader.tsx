'use client';

import { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  Avatar,
  Stack,
  Typography,
  FormHelperText,
} from "@mui/material";

type Props = {
  value?: string; // logoUrl الحالي
  onFileSelected: (file: File | null) => void;
  errorText?: string;
  helperText?: string;
  circle?: boolean;
  size?: number; // px
};

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_MB = 2;

export default function LogoUploader({
  value,
  onFileSelected,
  errorText,
  helperText = "PNG / JPG / WEBP — حتى 2MB",
  circle = true,
  size = 96,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(value);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file && value) setPreview(value);
  }, [value]); // تحديث المعاينة لو تغيّر الـ logoUrl خارجياً

  const pick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPT.includes(f.type)) {
      alert("الملف يجب أن يكون PNG أو JPG أو WEBP");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`الحجم الأقصى ${MAX_SIZE_MB}MB`);
      return;
    }
    setFile(f);
    onFileSelected(f);
  };

  const clear = () => {
    setFile(null);
    onFileSelected(null);
    setPreview(value || undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Stack direction="row" spacing={3} alignItems="center">
      <Box>
        <Avatar
          src={preview}
          variant={circle ? "circular" : "rounded"}
          sx={{ width: size, height: size, bgcolor: "#eceff1", fontSize: 18 }}
        >
          {preview ? null : "Logo"}
        </Avatar>
      </Box>

      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={pick}>
            رفع شعار
          </Button>
          {preview ? (
            <Button variant="outlined" color="error" onClick={clear}>
              إزالة
            </Button>
          ) : null}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {helperText}
        </Typography>
        {errorText ? <FormHelperText error>{errorText}</FormHelperText> : null}
      </Stack>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        hidden
        onChange={onChange}
      />
    </Stack>
  );
}
