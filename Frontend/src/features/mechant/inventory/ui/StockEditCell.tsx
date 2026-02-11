// src/features/mechant/inventory/ui/StockEditCell.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

interface StockEditCellProps {
  value: number;
  isUnlimited?: boolean;
  disabled?: boolean;
  onSave: (newValue: number) => Promise<void>;
}

export function StockEditCell({
  value,
  isUnlimited = false,
  disabled = false,
  onSave,
}: StockEditCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // تحديث القيمة المحلية عند تغيير القيمة الخارجية
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = useCallback(
    async (newValue: number) => {
      if (newValue === value || isSaving) return;

      setIsSaving(true);
      try {
        await onSave(newValue);
      } catch (error) {
        // إرجاع القيمة القديمة في حالة الخطأ
        setLocalValue(value);
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
    },
    [value, isSaving, onSave],
  );

  const debouncedSave = useCallback(
    (newValue: number) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave(newValue);
      }, 800);
    },
    [handleSave],
  );

  const handleBlur = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (localValue !== value) {
      handleSave(localValue);
    } else {
      setIsEditing(false);
    }
  }, [localValue, value, handleSave]);

  const handleIncrement = useCallback(() => {
    const newValue = localValue + 1;
    setLocalValue(newValue);
    debouncedSave(newValue);
  }, [localValue, debouncedSave]);

  const handleDecrement = useCallback(() => {
    if (localValue <= 0) return;
    const newValue = localValue - 1;
    setLocalValue(newValue);
    debouncedSave(newValue);
  }, [localValue, debouncedSave]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (isNaN(newValue) || newValue < 0) return;
    setLocalValue(newValue);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setLocalValue(value);
        setIsEditing(false);
      }
    },
    [handleBlur, value],
  );

  // إذا كان المخزون غير محدود
  if (isUnlimited) {
    return (
      <Tooltip title="مخزون غير محدود">
        <Box sx={{ color: 'info.main', fontWeight: 'bold' }}>∞</Box>
      </Tooltip>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <IconButton
        size="small"
        onClick={handleDecrement}
        disabled={disabled || isSaving || localValue <= 0}
        sx={{ padding: 0.5 }}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>

      <TextField
        inputRef={inputRef}
        type="number"
        value={localValue}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSaving}
        size="small"
        inputProps={{
          min: 0,
          style: {
            textAlign: 'center',
            width: 50,
            padding: '4px 8px',
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
          },
        }}
      />

      <IconButton
        size="small"
        onClick={handleIncrement}
        disabled={disabled || isSaving}
        sx={{ padding: 0.5 }}
      >
        <AddIcon fontSize="small" />
      </IconButton>

      {isSaving && <CircularProgress size={16} sx={{ ml: 0.5 }} />}
    </Box>
  );
}

export default StockEditCell;
