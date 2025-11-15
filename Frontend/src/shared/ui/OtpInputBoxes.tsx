import { useRef, useEffect } from "react";
import { Box, TextField } from "@mui/material";

interface OtpInputBoxesProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  length?: number;
  autoFocus?: boolean;
  onComplete?: (val: string) => void;
}

export default function OtpInputBoxes({
  value,
  onChange,
  disabled = false,
  length = 6,
  autoFocus = true,
  onComplete,
}: OtpInputBoxesProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // فوكس تلقائي على أول خانة
  useEffect(() => {
    if (!disabled && autoFocus) {
      inputsRef.current[0]?.focus();
      inputsRef.current[0]?.select();
    }
  }, [disabled, autoFocus]);

  // تنقل للفوكس
  const focusAt = (idx: number) => {
    if (idx < 0 || idx >= length) return;
    const el = inputsRef.current[idx];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const cleanDigits = (s: string) => (s || "").replace(/\D/g, "");

  const setCharAt = (s: string, idx: number, ch: string) => {
    const arr = s.split("");
    arr[idx] = ch;
    return arr.join("");
  };

  const handleChange = (idx: number, raw: string) => {
    if (disabled) return;
    const digit = cleanDigits(raw).slice(-1); // آخر رقم فقط
    let next = value.padEnd(length, ""); // ضمّن الطول
    next = setCharAt(next, idx, digit);

    // قص للطول النهائي
    next = next.slice(0, length);
    onChange(next);

    if (digit) {
      // تحرّك للتي بعدها
      focusAt(idx + 1);
      // لو اكتمل، نفّذ onComplete
      if (
        next.length === length &&
        next.split("").every(Boolean) &&
        onComplete
      ) {
        // نضمن أن onChange خلّص تحديث الحالة
        setTimeout(() => onComplete(next), 0);
      }
    }
  };

  const handleKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (disabled) return;
    const key = e.key;

    if (key === "Backspace") {
      e.preventDefault();
      if (value[idx]) {
        // امسح الحالي
        const next = setCharAt(value.padEnd(length, ""), idx, "");
        onChange(next);
      } else {
        // ارجع للخلف وامسح
        const prev = idx - 1;
        if (prev >= 0) {
          const next = setCharAt(value.padEnd(length, ""), prev, "");
          onChange(next);
          focusAt(prev);
        }
      }
      return;
    }

    if (key === "ArrowLeft") {
      e.preventDefault();
      focusAt(idx - 1);
      return;
    }
    if (key === "ArrowRight") {
      e.preventDefault();
      focusAt(idx + 1);
      return;
    }

    if (key === "Enter" && onComplete) {
      const filled = value.slice(0, length);
      if (filled.length === length && filled.split("").every(Boolean)) {
        onComplete(filled);
      }
    }
  };

  const handlePaste = (
    idx: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    if (disabled) return;
    e.preventDefault();
    const pasted = cleanDigits(e.clipboardData.getData("text")).slice(
      0,
      length
    );
    if (!pasted) return;

    const next = value.padEnd(length, "").split("");
    let cursor = idx;

    for (let i = 0; i < pasted.length && cursor < length; i++, cursor++) {
      next[cursor] = pasted[i];
    }
    const joined = next.join("");
    onChange(joined);

    if (joined.split("").every(Boolean)) {
      onComplete?.(joined);
      focusAt(length - 1);
    } else {
      // ركّز على أول خانة فاضية بعد اللصق
      const firstEmpty = next.findIndex((c) => !c);
      focusAt(firstEmpty === -1 ? length - 1 : firstEmpty);
    }
  };

  return (
    <Box dir="ltr" sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
      {Array.from({ length }).map((_, i) => (
        <TextField
          key={i}
          value={value[i] || ""}
          inputRef={(el) => (inputsRef.current[i] = el)}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) =>
            handleKeyDown(i, e as React.KeyboardEvent<HTMLInputElement>)
          }
          onPaste={(e) =>
            handlePaste(i, e as React.ClipboardEvent<HTMLInputElement>)
          }
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          inputProps={{
            maxLength: 1,
            inputMode: "numeric",
            pattern: "[0-9]*",
            style: {
              textAlign: "center",
              fontSize: "2rem",
              fontWeight: "bold",
              width: 48,
              height: 56,
              borderRadius: 10,
              background: "#fff",
              boxShadow: "0 2px 8px rgba(80,46,145,0.10)",
            },
            "aria-label": `Digit ${i + 1}`,
          }}
          sx={{
            mx: 0.6,
            ".MuiOutlinedInput-notchedOutline": {
              borderColor: "#A498CB",
              borderWidth: 2,
            },
          }}
        />
      ))}
    </Box>
  );
}
