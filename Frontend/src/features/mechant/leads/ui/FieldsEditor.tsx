// src/features/leads/ui/FieldsEditor.tsx
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton,
  Button,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import * as React from "react";
import type { LeadField, FieldType } from "../types";

const FIELD_TYPES: FieldType[] = ["name", "email", "phone", "address", "custom"];

// قيَم افتراضية للأنواع المعروفة
const DEFAULTS: Record<
  Exclude<FieldType, "custom">,
  { label: string; placeholder: string }
> = {
  name: { label: "الاسم", placeholder: "اكتب الاسم الكامل" },
  email: { label: "البريد الإلكتروني", placeholder: "example@mail.com" },
  phone: { label: "الجوال", placeholder: "+9665xxxxxxx" },
  address: { label: "العنوان", placeholder: "المدينة، الحي، الشارع..." },
};

export default function FieldsEditor({
  fields,
  onAdd,
  onRemove,
  onChange,
  onSave,
  saving,
}: {
  fields: LeadField[];
  onAdd: () => void;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Partial<LeadField>) => void;
  onSave: () => void | Promise<void>;
  saving: boolean;
}) {
  const [invalidCustom, setInvalidCustom] = React.useState<Set<string>>(new Set());
  const [snackOpen, setSnackOpen] = React.useState(false);

  const validate = React.useCallback(() => {
    const invalid = new Set<string>();
    for (const f of fields) {
      if (f.fieldType === "custom" && (!f.label || !f.label.trim())) {
        invalid.add(f.key);
      }
    }
    setInvalidCustom(invalid);
    if (invalid.size > 0) {
      setSnackOpen(true);
      return false;
    }
    return true;
  }, [fields]);

  const handleSave = async () => {
    if (!validate()) return;
    await onSave();
  };

  const handleTypeChange = (field: LeadField, nextType: FieldType) => {
    const patch: Partial<LeadField> = { fieldType: nextType };

    // لو النوع معروف (وليس custom) عبّئ label و placeholder تلقائيًا
    if (nextType !== "custom") {
      const d = DEFAULTS[nextType as Exclude<FieldType, "custom">];
      patch.label = d.label;
      // لا نكسر placeholder لو المستخدم عدّله يدويًا من قبل
      if (!field.placeholder || field.placeholder.trim() === "") {
        patch.placeholder = d.placeholder;
      }
    }

    onChange(field.key, patch);
  };

  return (
    <>
      {fields.map((field) => {
        const isCustomMissingLabel =
          field.fieldType === "custom" && (!field.label || !field.label.trim());

        return (
          <Box
            key={field.key}
            sx={{
              display: "flex",
              gap: 2,
              mb: 2,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>نوع الحقل</InputLabel>
              <Select
                label="نوع الحقل"
                value={field.fieldType}
                onChange={(e) => handleTypeChange(field, e.target.value as FieldType)}
              >
                {FIELD_TYPES.map((ft) => (
                  <MenuItem key={ft} value={ft}>
                    {ft}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Label"
              value={field.label}
              onChange={(e) => onChange(field.key, { label: e.target.value })}
              sx={{ minWidth: 200 }}
              error={invalidCustom.has(field.key) || isCustomMissingLabel}
              helperText={
                isCustomMissingLabel ? "لابد من إدخال Label للحقل المخصص." : undefined
              }
            />

            <TextField
              label="Placeholder"
              value={field.placeholder}
              onChange={(e) => onChange(field.key, { placeholder: e.target.value })}
              sx={{ minWidth: 220 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={field.required}
                  onChange={(_, v) => onChange(field.key, { required: v })}
                />
              }
              label="إجباري"
            />

            <Tooltip title="حذف الحقل">
              <IconButton color="error" onClick={() => onRemove(field.key)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        );
      })}

      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button startIcon={<AddIcon />} onClick={onAdd}>
          إضافة حقل جديد
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
        </Button>
      </Stack>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" onClose={() => setSnackOpen(false)} sx={{ width: "100%" }}>
          يوجد حقول مخصّصة بدون Label. الرجاء تعبئتها قبل الحفظ.
        </Alert>
      </Snackbar>
    </>
  );
}
