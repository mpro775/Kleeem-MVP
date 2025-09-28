import { Box, Paper, Typography, Tabs, Tab, Chip } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useErrorHandler } from "@/shared/errors";
import LinksTab from "@/features/mechant/knowledge/ui/LinksTab";
import FaqsTab from "@/features/mechant/knowledge/ui/FaqsTab";
import { useState } from "react";

export default function KnowledgePage() {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const merchantId = user?.merchantId;
  const [tab, setTab] = useState(0);

  if (!merchantId) return <div>تأكد من تسجيل الدخول كتاجر.</div>;

  return (
    <Box
      sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f9fafb", minHeight: "100dvh" }}
    >
      <Typography
        variant={{ xs: "h5", md: "h4" } as any}
        gutterBottom
        fontWeight={800}
      >
        إدارة مصادر المعرفة
      </Typography>

      <Paper
        sx={{
          mb: 3,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "#fff",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="الأسئلة الشائعة" />
          <Tab label="روابط المواقع" />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>الملفات</span>
                <Chip label="قريباً" color="warning" size="small" />
              </Box>
            }
            disabled
          />
        </Tabs>
      </Paper>

      {tab === 0 && <FaqsTab merchantId={merchantId} />}
      {tab === 1 && <LinksTab merchantId={merchantId} />}
      {tab === 2 && (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            opacity: 0.6,
            bgcolor: "#fff",
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" gutterBottom>
            🚧 الملفات قريباً 🚧
          </Typography>
          <Typography variant="body1">
            هذه الميزة قيد التطوير وستكون متاحة قريباً
          </Typography>
        </Box>
      )}
    </Box>
  );
}
