// src/pages/MerchantSupportCenterPage.tsx
import { Box, Container, Grid, Snackbar, Alert } from "@mui/material";
import { useErrorHandler } from "@/shared/errors";
import { useSupportForm } from "@/features/mechant/support/hooks/useSupportForm";
import { SupportForm } from "@/features/mechant/support/ui/SupportForm";
import { SupportSidebar } from "@/features/mechant/support/ui/SupportSidebar";

export default function MerchantSupportCenterPage() {
  const { handleError } = useErrorHandler();
  const {
    form,
    files,
    setFiles,
    submitting,
    submissionResponse,
    error,
    onSubmit,
  } = useSupportForm();

  return (
    <Box dir="rtl">
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          <Grid size={{xs: 12, md: 8}}>
            <SupportForm
              form={form}
              onSubmit={onSubmit}
              submitting={submitting}
              error={error}
              submissionResponse={submissionResponse}
              files={files}
              onFilesChange={setFiles}
            />
          </Grid>
          <Grid size={{xs: 12, md: 4}}>
            <SupportSidebar />
          </Grid>
        </Grid>
      </Container>

      {/* رسالة التأكيد بعد الإرسال الناجح */}
      <Snackbar open={!!submissionResponse} autoHideDuration={6000}>
        <Alert severity="success" variant="filled">
          شكراً لك! تم استلام طلبك بنجاح.
        </Alert>
      </Snackbar>
    </Box>
  );
}
