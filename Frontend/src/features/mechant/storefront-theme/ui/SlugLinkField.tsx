// src/features/storefront-theme/ui/SlugLinkField.tsx
import { Stack, TextField } from "@mui/material";

type Props = {
  slug?: string;
  storeUrl?: string;
  domain?: string;
  onSlugChange?: (v: string) => void;
  readOnly?: boolean; // ✅ جديد
};
export function SlugLinkField({ slug, onSlugChange, storeUrl, domain, readOnly }: Props) {


  return (
    <Stack spacing={2}>
    <TextField
      label="السلاج الموحّد"
      value={slug ?? ""}
      onChange={readOnly ? undefined : (e) => onSlugChange?.(e.target.value)}
      InputProps={{ readOnly: !!readOnly }}
      helperText={readOnly ? "يتم تعديل السلاج من: الإعدادات > معلومات المتجر" : "أدخل حروف إنجليزية وأرقام وشرطة -" }
    />
    <TextField label="رابط المتجر" value={storeUrl ?? "—"} InputProps={{ readOnly: true }} />
    {domain && <TextField label="الدومين (اختياري)" value={domain} InputProps={{ readOnly: true }} />}
  </Stack>
  );
}
