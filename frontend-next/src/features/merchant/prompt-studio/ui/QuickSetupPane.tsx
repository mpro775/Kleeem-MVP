'use client';

// src/features/prompt-studio/ui/QuickSetupPane.tsx
import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Divider,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import type { QuickConfig } from "@/features/merchant/prompt-studio/types";

const MAX_INSTRUCTIONS = 5;
const MAX_CHARS = 80;

function clampInstruction(s: string) {
  return (s ?? "").toString().trim().slice(0, MAX_CHARS);
}

function makeWaLink(input: string): string {
  const v = (input ?? "").trim();
  if (!v) return "";
  // إذا كان رابط واتساب صحيح، أعده كما هو
  if (/^https?:\/\/(wa\.me|(?:www\.)?whatsapp\.com)\//i.test(v)) return v;
  // لو أرقام فقط: ابنِ wa.me
  const digits = v.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function QuickSetupPane() {
  const { control, setValue } = useFormContext<QuickConfig>();

  // مشاهدة القيم الحيّة للمعاينة الفورية
  const instructions = useWatch({ control, name: "customInstructions" }) || [];
  const phone = useWatch({ control, name: "customerServicePhone" }) || "";
  const whatsapp = useWatch({ control, name: "customerServiceWhatsapp" }) || "";
  const closingEnabled = !!useWatch({ control, name: "includeClosingPhrase" });
  const closingText = useWatch({ control, name: "closingText" }) || "";

  // إدخال التعليمات (سطر واحد يضاف بالقائمة عند Enter/زر إضافة)
  const [draft, setDraft] = useState("");

  const canAdd =
    draft.trim().length > 0 && (instructions?.length ?? 0) < MAX_INSTRUCTIONS;

  const handleAddInstruction = () => {
    const next = clampInstruction(draft);
    if (!next) return;
    const list = Array.isArray(instructions) ? [...instructions] : [];
    if (list.length >= MAX_INSTRUCTIONS) return;
    list.push(next);
    setValue("customInstructions", list, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setDraft("");
  };

  const handleDeleteInstruction = (index: number) => {
    const list = (instructions as string[]).slice();
    list.splice(index, 1);
    setValue("customInstructions", list, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const waPreview = useMemo(() => makeWaLink(whatsapp), [whatsapp]);

  return (
    <Box>
      {/* اللهجة */}
      <Controller
        name="dialect"
        control={control}
        render={({ field }) => (
          <TextField select label="اللهجة" fullWidth margin="normal" {...field}>
            {["خليجي", "مصري", "شامي"].map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      {/* النغمة */}
      <Controller
        name="tone"
        control={control}
        render={({ field }) => (
          <TextField select label="النغمة" fullWidth margin="normal" {...field}>
            {["ودّي", "رسمي", "طريف"].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      {/* التعليمات المخصّصة: إدخال + قائمة */}
      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          التعليمات المخصّصة
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="اكتب التعليمة ثم اضغط Enter"
            placeholder="مثال: لا نعد عميلًا بحجز منتج غير متاح"
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddInstruction();
              }
            }}
            helperText={`${draft.length}/${MAX_CHARS} — ${instructions.length}/${MAX_INSTRUCTIONS} تعليمات`}
            FormHelperTextProps={{ sx: { color: "text.secondary" } }}
            size="small"
          />
          <Tooltip title="إضافة">
            <span>
              <IconButton
                color="primary"
                onClick={handleAddInstruction}
                disabled={!canAdd}
                sx={{ alignSelf: "center" }}
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <List
          dense
          sx={{
            mt: 1,
            border: (t) => `1px dashed ${t.palette.divider}`,
            borderRadius: 1,
          }}
        >
          {(Array.isArray(instructions) ? instructions : []).map(
            (text, idx) => (
              <ListItem key={`${text}-${idx}`} divider>
                <ListItemText
                  primary={text}
                  secondary={`${text.length}/${MAX_CHARS} حرف`}
                  primaryTypographyProps={{ sx: { whiteSpace: "pre-wrap" } }}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="حذف">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteInstruction(idx)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            )
          )}
          {(!instructions || instructions.length === 0) && (
            <Box sx={{ p: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                لا توجد تعليمات بعد — اكتب التعليمة في الحقل أعلاه واضغط Enter.
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* رقم خدمة العملاء */}
      <Controller
        name="customerServicePhone"
        control={control}
        render={({ field }) => (
          <TextField
            label="رقم هاتف خدمة العملاء"
            placeholder="مثال: 0555555555 (رمز الدولة إن لزم)"
            fullWidth
            margin="normal"
            value={field.value || ""}
            onChange={(e) => field.onChange(e.target.value)}
            helperText="سيستخدمه البوت عند طلب التواصل الهاتفي"
            FormHelperTextProps={{ sx: { color: "text.secondary" } }}
          />
        )}
      />
      {/* معاينة فورية للهاتف */}
      {phone?.trim() && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
          المعاينة: <strong>{phone.trim()}</strong>
        </Typography>
      )}

      {/* رابط واتساب خدمة العملاء */}
      <Controller
        name="customerServiceWhatsapp"
        control={control}
        render={({ field }) => (
          <TextField
            label="رابط/رقم واتساب خدمة العملاء"
            placeholder="مثال: https://wa.me/9665xxxxxxx أو 96655xxxxxxx"
            fullWidth
            margin="normal"
            value={field.value || ""}
            onChange={(e) => field.onChange(e.target.value)}
            helperText="أدخل رابط واتساب مباشرة أو رقمًا لنولّد الرابط تلقائيًا"
            FormHelperTextProps={{ sx: { color: "text.secondary" } }}
          />
        )}
      />
      {/* معاينة فورية لواتساب */}
      {!!waPreview && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
          المعاينة:{" "}
          <a href={waPreview} target="_blank" rel="noreferrer">
            {waPreview}
          </a>
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      {/* الرسالة الختامية */}
      <Controller
        name="includeClosingPhrase"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="إظهار رسالة ختامية؟"
            fullWidth
            margin="normal"
            value={field.value ? "true" : "false"}
            onChange={(e) => field.onChange(e.target.value === "true")}
          >
            <MenuItem value="true">نعم</MenuItem>
            <MenuItem value="false">لا</MenuItem>
          </TextField>
        )}
      />

      <Controller
        name="closingText"
        control={control}
        render={({ field }) => (
          <TextField
            label="الرسالة الختامية"
            placeholder="مثال: هل أقدر أساعدك بشي ثاني؟ 😊"
            fullWidth
            margin="normal"
            value={field.value || ""}
            onChange={(e) => field.onChange(e.target.value)}
            inputProps={{ maxLength: 120 }}
            helperText="تظهر في نهاية المحادثة عند التفعيل (حتى 120 حرفًا)"
            FormHelperTextProps={{ sx: { color: "text.secondary" } }}
          />
        )}
      />

      {/* معاينة فورية للرسالة الختامية */}
      {closingEnabled && closingText?.trim() && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
          المعاينة: <em>{closingText.trim()}</em>
        </Typography>
      )}
    </Box>
  );
}
