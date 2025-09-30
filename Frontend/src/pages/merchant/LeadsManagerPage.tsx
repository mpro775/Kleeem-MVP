// src/pages/Dashboard/LeadsManagerPage.tsx
import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Container,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useAuth } from "@/context/hooks";
import { useErrorHandler } from "@/shared/errors";
import { useLeadsManager } from "@/features/mechant/leads/hooks";
import EnabledToggleCard from "@/features/mechant/leads/ui/EnabledToggleCard";
import FieldsEditor from "@/features/mechant/leads/ui/FieldsEditor";
import LeadsTable from "@/features/mechant/leads/ui/LeadsTable";

export default function LeadsManagerPage() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const merchantId = user?.merchantId ?? null;

  const {
    loading,
    error,
    leads,
    fields,
    enabled,
    saving,
    setEnabled,
    addField,
    updateField,
    removeField,
    refreshAll,
    saveAll,
  } = useLeadsManager(merchantId || "");

  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    type: "success" | "error";
  }>({ open: false, msg: "", type: "success" });

  if (!merchantId) {
    return (
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <Alert severity="warning">لا يوجد تاجر مسجّل.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f7f8fa",
        py: { xs: 2, md: 4 },
      }}
      dir="rtl"
    >
      <Container maxWidth="lg">
        {error && (
          <Alert sx={{ mb: 2 }} severity="error">
            {error}
          </Alert>
        )}

        {/* العنوان + وصف صغير */}
        <Stack
          direction={isSm ? "column" : "row"}
          alignItems={isSm ? "flex-start" : "center"}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              إدارة إعدادات الـ Leads
            </Typography>
            <Typography variant="body2" color="text.secondary">
              فعّل جمع البيانات وحدّد الحقول التي تريدها، وستظهر النتائج مباشرة
              في القائمة أسفل.
            </Typography>
          </Box>
        </Stack>

        {/* بطاقة التفعيل (ممتدة عرضيًا) */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          <EnabledToggleCard
            enabled={enabled}
            onToggle={async (next) => {
              try {
                setEnabled(next);
                const ok = await saveAll();
                setSnack({
                  open: true,
                  msg: ok ? "تم حفظ حالة التفعيل" : "تعذّر حفظ حالة التفعيل",
                  type: ok ? "success" : "error",
                });
                if (ok) refreshAll();
              } catch (e) {
                handleError(e);
                setSnack({
                  open: true,
                  msg: "حدث خطأ أثناء الحفظ",
                  type: "error",
                });
              }
            }}
          />
        </Paper>

        {/* مُحرر الحقول */}
        {enabled && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              mb: 3,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "#fff",
              position: "relative",
            }}
          >
            <FieldsEditor
              fields={fields}
              saving={saving}
              onAdd={addField}
              onRemove={removeField}
              onChange={updateField}
              onSave={async () => {
                try {
                  const ok = await saveAll();
                  setSnack({
                    open: true,
                    msg: ok ? "تم حفظ التعديلات" : "فشل الحفظ",
                    type: ok ? "success" : "error",
                  });
                  if (ok) refreshAll();
                } catch (e) {
                  handleError(e);
                  setSnack({
                    open: true,
                    msg: "حدث خطأ أثناء الحفظ",
                    type: "error",
                  });
                }
              }}
            />
          </Paper>
        )}

        {/* فاصل بصري */}
        <Divider sx={{ my: 2 }} />

        {/* الجدول: ممتد لملء الشاشة المتبقية */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1, md: 2 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
            قائمة الـ Leads
          </Typography>
          <LeadsTable leads={leads} fields={fields} />
        </Paper>
      </Container>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
