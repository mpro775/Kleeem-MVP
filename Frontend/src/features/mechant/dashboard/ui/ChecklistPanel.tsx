// src/features/mechant/dashboard/ui/ChecklistPanel.tsx
import {
  Paper,
  Typography,
  Stack,
  Box,
  Chip,
  CircularProgress,
  useTheme,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { ChecklistGroup } from "@/features/mechant/dashboard/type";

export default function ChecklistPanel({
  checklist = [],
  onSkip,
  loading,
}: {
  checklist: ChecklistGroup[];
  onSkip?: (itemKey: string) => void;
  loading?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const safeChecklist = Array.isArray(checklist) ? checklist : [];
  const allItems = safeChecklist.flatMap((g) => g.items || []);
  const completed = allItems.filter(
    (i) => i?.isComplete || i?.isSkipped
  ).length;
  const total = allItems.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;



  if (loading) return null;
  if (total === 0) {
    return (
      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          قائمة التحقق لإكمال تفعيل المتجر
        </Typography>
        <Typography variant="body2" color="text.secondary">
          لا توجد مهام متاحة حالياً.
        </Typography>
      </Paper>
    );
  }

  // 🎉 حالة النجاح
  if (percent === 100) {
    return (
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          mb: 3,
          background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
          color: "white",
        }}
      >
        <Typography variant="h6" fontWeight={800}>
          🎉 تم إكمال جميع المهام!
        </Typography>
        <Typography variant="body2">
          متجرك جاهز بالكامل! تم إكمال جميع خطوات التفعيل.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
        {/* رأس اللوحة */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CircularProgress
            variant="determinate"
            value={percent}
            size={48}
            thickness={5}
            sx={{ color: percent === 100 ? "success.main" : "primary.main" }}
          />
          <Typography variant="h6" fontWeight={800} flex={1}>
            قائمة التحقق
          </Typography>
          <Chip label={`${completed}/${total}`} color="primary" size="small" />
        </Box>

        {isMobile ? (
          // 📱 نسخة الهاتف — Accordion مبسط
          <Stack spacing={1}>
            {safeChecklist.map((group, groupIdx) => (
              <Accordion 
                key={group.key || groupIdx} 
                defaultExpanded={groupIdx === 0}
                sx={{
                  '& .MuiAccordionSummary-root': {
                    minHeight: 48,
                    padding: '0 8px',
                  },
                  '& .MuiAccordionSummary-content': {
                    margin: '8px 0',
                  },
                  '& .MuiAccordionDetails-root': {
                    padding: '8px 16px 16px',
                  },
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-expandIconWrapper': {
                      fontSize: '1.2rem',
                    },
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    fontWeight={700}
                    sx={{ fontSize: '0.9rem' }}
                  >
                    {group.title}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    {group.items?.map((item) => {
                      const isComplete = item?.isComplete || item?.isSkipped;
                      return (
                        <Box
                          key={item.key}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: isComplete ? 'action.hover' : 'transparent',
                            opacity: isComplete ? 0.7 : 1,
                          }}
                        >
                          {isComplete ? (
                            <CheckCircleIcon color="success" sx={{ fontSize: '1.2rem' }} />
                          ) : (
                            <RadioButtonUncheckedIcon color="warning" sx={{ fontSize: '1.2rem' }} />
                          )}
                          <Typography 
                            flex={1}
                            sx={{ 
                              fontSize: '0.85rem',
                              fontWeight: isComplete ? 400 : 500,
                            }}
                          >
                            {item.title}
                          </Typography>
                          {!isComplete && item?.skippable && (
                            <Button
                              onClick={() => onSkip?.(item.key)}
                              size="small"
                              color="info"
                              startIcon={<SkipNextIcon />}
                              sx={{
                                fontSize: '0.75rem',
                                px: 1,
                                py: 0.5,
                                minWidth: 'auto',
                              }}
                            >
                              تخطي
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        ) : (
          // 💻 نسخة الديسكتوب — Accordion كامل
          <Stack spacing={2}>
            {safeChecklist.map((group, idx) => (
              <Accordion key={group.key || idx} defaultExpanded={idx === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {group.title}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    {group.items?.map((item) => {
                      const isComplete = item?.isComplete || item?.isSkipped;
                      return (
                        <Box
                          key={item.key}
                          display="flex"
                          alignItems="center"
                          gap={2}
                        >
                          {isComplete ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <RadioButtonUncheckedIcon color="warning" />
                          )}
                          <Typography flex={1}>{item.title}</Typography>
                          {!isComplete && item?.skippable && (
                            <Button
                              onClick={() => onSkip?.(item.key)}
                              size="small"
                              color="info"
                              startIcon={<SkipNextIcon />}
                            >
                              تخطي
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </Paper>


    </>
  );
}
