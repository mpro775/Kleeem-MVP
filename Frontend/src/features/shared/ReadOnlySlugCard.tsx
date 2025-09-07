import { Box, Paper, Typography, TextField, InputAdornment, IconButton, Tooltip } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

export default function ReadOnlySlugCard({ publicSlug }: { publicSlug?: string }) {
  const origin = import.meta.env.VITE_PUBLIC_WEB_ORIGIN || window.location.origin.replace(/\/+$/, "");
  const chat = publicSlug ? `${origin}/${publicSlug}/chat` : "—";
  const store = publicSlug ? `${origin}/${publicSlug}/store` : "—";

  const copy = (v: string) => navigator.clipboard.writeText(v).catch(()=>{});

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>روابطك العامة</Typography>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        <TextField
          label="السلاج"
          value={publicSlug || ""}
          InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start">/{""}</InputAdornment> }}
        />
        <TextField
          label="رابط الدردشة"
          value={chat}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="نسخ">
                  <IconButton size="small" onClick={() => copy(chat)}><ContentCopyRoundedIcon fontSize="small" /></IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="رابط المتجر"
          value={store}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="نسخ">
                  <IconButton size="small" onClick={() => copy(store)}><ContentCopyRoundedIcon fontSize="small" /></IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
}
