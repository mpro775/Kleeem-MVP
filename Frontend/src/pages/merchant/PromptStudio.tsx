// src/pages/dashboard/PromptStudioPage.tsx
import { useState } from "react";
import {
  Box,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Slide,
  Fab,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ChatIcon from "@mui/icons-material/Chat";
import { styled } from "@mui/system";
import { FormProvider, useForm } from "react-hook-form";

import { useAuth } from "@/context/hooks";
import { usePromptStudio } from "@/features/mechant/prompt-studio/hooks";
import type { QuickConfig } from "@/features/mechant/prompt-studio/types";

// UI panes
import { PromptToolbar } from "@/features/mechant/prompt-studio/ui/PromptToolbar";
import { LivePreviewPane } from "@/features/mechant/prompt-studio/ui/LivePreviewPane";
import { AdvancedTemplatePane } from "@/features/mechant/prompt-studio/ui/AdvancedTemplatePane";
import { ChatSimulator } from "@/features/mechant/prompt-studio/ui/ChatSimulator";
import { QuickSetupPane } from "@/features/mechant/prompt-studio/ui/QuickSetupPane";

const StudioContainer = styled(Box)(({ theme }) => ({
  height: "100dvh",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
  paddingBottom: "env(safe-area-inset-bottom)", // للآيفون
}));

const LoadingContainer = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100dvh",
  minHeight: "100vh",
});

const ContentGrid = styled(Box, {
  shouldForwardProp: (prop) => prop !== "activeTab",
})<{ activeTab: "quick" | "advanced" }>(({ theme, activeTab }) => ({
  display: "grid",
  gridTemplateColumns:
    activeTab === "quick"
      ? "minmax(0,1fr) minmax(0,1.4fr)"
      : "minmax(0,1.3fr) minmax(0,1fr)",
  gridAutoRows: "1fr",
  flexGrow: 1,
  gap: theme.spacing(3),
  padding: theme.spacing(3),
  overflow: "hidden",
  [theme.breakpoints.down("lg")]: {
    gridTemplateColumns: "minmax(0,1fr)", // عمود واحد على الشاشات الصغيرة
    gridAutoRows: "auto",
  },
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(2),
    gap: theme.spacing(2),
  },
}));

// حركة للدايلوج
const Transition = Slide;

export default function PromptStudioPage() {
  const { token, user } = useAuth();
  const merchantId = user?.merchantId || "";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg")); // نعتبر lg وأصغر = موبايل/تابلت

  const [activeTab, setActiveTab] = useState<"quick" | "advanced">("quick");
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);

  // React Hook Form (Quick)
  const quickFormMethods = useForm<QuickConfig>({
    defaultValues: {
      dialect: "خليجي",
      tone: "ودّي",
      customInstructions: [],
      includeClosingPhrase: true,
      closingText: "هل أقدر أساعدك بشي ثاني؟ 😊",
      customerServicePhone: "",
      customerServiceWhatsapp: "",
    },
  });

  const {
    isLoading,
    isSaving,
    lastUpdated,
    previewContent,
    advancedTemplate,
    setAdvancedTemplate,
    handleManualPreview,
    handleSaveQuickConfig,
    handleSaveAdvancedTemplate,
  } = usePromptStudio({
    token,
    merchantId,
    activeTab,
    reset: quickFormMethods.reset,
    watch: quickFormMethods.watch,
  });

  if (isLoading) {
    return (
      <LoadingContainer>
        <CircularProgress size={60} />
      </LoadingContainer>
    );
  }

  // العنوان والآيكون للزر/الدايلوج حسب التبويب
  const mobileActionLabel =
    activeTab === "quick" ? "فتح المعاينة" : "تجربة المحادثة";
  const mobileActionIcon =
    activeTab === "quick" ? <VisibilityIcon /> : <ChatIcon />;

  return (
    <StudioContainer dir="rtl">
      <PromptToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleManualPreview}
        onSave={
          activeTab === "quick"
            ? quickFormMethods.handleSubmit(handleSaveQuickConfig)
            : handleSaveAdvancedTemplate
        }
        isSaving={isSaving}
        lastUpdated={lastUpdated}
      />

      <ContentGrid activeTab={activeTab}>
        {activeTab === "quick" && (
          <>
            {/* العمود الأيسر: الإعداد السريع — يبقى ظاهر دائمًا */}
            <FormProvider {...quickFormMethods}>
              <Box sx={{ minWidth: 0, height: "100%", overflow: "auto" }}>
                <QuickSetupPane />
              </Box>
            </FormProvider>

            {/* العمود الأيمن: المعاينة — نخفيه على الموبايل ونفتحه من دايلوج */}
            {!isMobile && (
              <Box sx={{ minWidth: 0, height: "100%" }}>
                <LivePreviewPane
                  content={previewContent}
                  isLivePreview
                  isLoading={isLoading}
                  onRefresh={handleManualPreview}
                />
              </Box>
            )}
          </>
        )}

        {activeTab === "advanced" && (
          <>
            {/* العمود الأيسر: القالب المتقدم */}
            <Box sx={{ minWidth: 0, height: "100%" }}>
              <AdvancedTemplatePane
                template={advancedTemplate}
                onChange={setAdvancedTemplate}
                onGenerateAI={() =>
                  setAdvancedTemplate(
                    "// تم توليد برومبت جديد بالذكاء الاصطناعي..."
                  )
                }
              />
            </Box>

            {/* العمود الأيمن: محاكاة المحادثة — نخفيها على الموبايل ونفتحها من دايلوج */}
            {!isMobile && (
              <Box sx={{ minWidth: 0, height: "100%" }}>
                <ChatSimulator
                  merchantId={merchantId}
                  promptTestUrl={`${
                    import.meta.env.VITE_PUBLIC_WEB_ORIGIN ||
                    window.location.origin
                  }/api/merchants/${merchantId}/prompt/preview`}
                />
              </Box>
            )}
          </>
        )}
      </ContentGrid>

      {/* زر ثابت للموبايل يفتح الدايالوج */}
      {isMobile && (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setMobileDialogOpen(true)}
          sx={{
            position: "fixed",
            bottom: 16,
            insetInlineEnd: 16,
            zIndex: (t) => t.zIndex.drawer + 2,
            px: 2,
          }}
        >
          {mobileActionIcon}
          <Box component="span" sx={{ mx: 1 }}>
            {mobileActionLabel}
          </Box>
        </Fab>
      )}

      {/* دايلوج الموبايل (فل سكرين) — يعرض LivePreview أو ChatSimulator بحسب التبويب */}
      <Dialog
        fullScreen={isMobile}
        open={mobileDialogOpen}
        onClose={() => setMobileDialogOpen(false)}
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            width: isMobile ? "100%" : 900,
            maxWidth: "95vw",
            height: isMobile ? "100dvh" : "85vh",
            m: 0,
          },
        }}
      >
        <AppBar
          color="default"
          elevation={0}
          sx={{ borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Toolbar>
            <Typography sx={{ flex: 1, fontWeight: 700 }}>
              {activeTab === "quick" ? "المعاينة الحية" : "محاكاة المحادثة"}
            </Typography>
            <IconButton
              edge="end"
              onClick={() => setMobileDialogOpen(false)}
              aria-label="إغلاق"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            p: { xs: 1, md: 2 },
            height: isMobile ? "calc(100dvh - 56px)" : "calc(85vh - 64px)",
          }}
        >
          {activeTab === "quick" ? (
            <Box sx={{ height: "100%" }}>
              <LivePreviewPane
                content={previewContent}
                isLivePreview
                isLoading={isLoading}
                onRefresh={handleManualPreview}
              />
            </Box>
          ) : (
            <Box sx={{ height: "100%" }}>
              <ChatSimulator
                merchantId={merchantId}
                promptTestUrl={`${
                  import.meta.env.VITE_PUBLIC_WEB_ORIGIN ||
                  window.location.origin
                }/api/merchants/${merchantId}/prompt/preview`}
              />
            </Box>
          )}
        </Box>
      </Dialog>
    </StudioContainer>
  );
}
