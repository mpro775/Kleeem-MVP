// src/features/mechant/analytics/components/tabs/KnowledgeTab.tsx
import { Suspense, lazy } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import { KpiCard } from "../KpiCard";
import type { Faq, TopKeyword } from "../../types";

const KeywordsChart = lazy(
  () => import("@/features/mechant/dashboard/ui/KeywordsChart")
);

interface KnowledgeTabProps {
  faqsData?: Faq[];
  missingOpenCount?: number;
  topKeywordsData?: TopKeyword[];
}

export const KnowledgeTab = ({
  faqsData = [],
  missingOpenCount = 0,
  topKeywordsData = [],
}: KnowledgeTabProps) => {
  return (
    <Grid container spacing={2}>
      <Grid  size={{xs: 12, md: 4}}>
        <Stack spacing={2}>
          <KpiCard title="عدد الأسئلة الشائعة (FAQ)" value={faqsData.length} />
          <KpiCard title="إجابات مفقودة (مفتوحة)" value={missingOpenCount} />
          <Button variant="outlined" href="/dashboard/instructions">
            إدارة التوجيهات
          </Button>
          <Button variant="outlined" href="/dashboard/missing-responses">
            إدارة الإجابات المفقودة
          </Button>
        </Stack>
      </Grid>
      <Grid  size={{xs: 12, md: 8}}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            height: "100%",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            الكلمات المفتاحية الأعلى استخدامًا
          </Typography>
          <Box sx={{ width: "100%", height: { xs: 220, md: 300 } }}>
            <Suspense
              fallback={
                <Box
                  sx={{ display: "grid", placeItems: "center", height: "100%" }}
                >
                  <CircularProgress />
                </Box>
              }
            >
              <KeywordsChart keywords={topKeywordsData} />
            </Suspense>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
