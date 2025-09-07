import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  useTheme,
  Stack,
  Avatar,
  Tooltip,
  Zoom,
  Fade,
  styled,
  linearProgressClasses,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Bolt as BoltIcon,
  AutoAwesome as AutoAwesomeIcon,
  Celebration as CelebrationIcon,
} from "@mui/icons-material";

type SetupStatus = {
  merchantInfo: boolean;
  productsSetup: boolean;
  channelsConnected: string[];
  webchatConfigured: boolean;
  promptConfigured: boolean;
};

interface Props {
  status: SetupStatus;
  onGoToStep: (step: string) => void;
}

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 10,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[200],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 10,
    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "0.8rem",
  padding: theme.spacing(0.5),
  "& .MuiChip-icon": {
    marginLeft: theme.spacing(0.5),
    marginRight: 0,
  },
}));

export function SetupChecklist({ status, onGoToStep }: Props) {
  const theme = useTheme();

  const steps: {
    key: keyof SetupStatus;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }[] = [
    {
      key: "merchantInfo",
      label: "معلومات المتجر الأساسية",
      description: "إكمال بيانات المتجر الأساسية لبدء العمل",
      icon: <BoltIcon fontSize="small" />,
    },
    {
      key: "productsSetup",
      label: "تهيئة المنتجات",
      description: "إضافة المنتجات والخدمات التي تقدمها",
      icon: <BoltIcon fontSize="small" />,
    },
    {
      key: "channelsConnected",
      label: "ربط القنوات",
      description: "ربط قنوات التواصل مع العملاء",
      icon: <BoltIcon fontSize="small" />,
    },
    {
      key: "webchatConfigured",
      label: "تهيئة الويب شات",
      description: "تخصيص شات الويب ليتناسب مع هوية علامتك",
      icon: <BoltIcon fontSize="small" />,
    },
    {
      key: "promptConfigured",
      label: "إعداد البرومبت",
      description: "تهيئة التعليمات الأساسية للذكاء الاصطناعي",
      icon: <BoltIcon fontSize="small" />,
    },
  ];

  const stepStates = steps.map((step) => {
    const done =
      step.key === "channelsConnected"
        ? status.channelsConnected.length > 0
        : Boolean(status[step.key]);
    return { ...step, done };
  });

  const sortedSteps = [
    ...stepStates.filter((s) => !s.done),
    ...stepStates.filter((s) => s.done),
  ];

  const completedCount = stepStates.filter((s) => s.done).length;
  const totalCount = steps.length;
  const remainingCount = totalCount - completedCount;
  const progress = (completedCount / totalCount) * 100;

  const getMotivationMessage = () => {
    if (remainingCount === totalCount) {
      return "لنبدأ الرحلة!";
    }
    if (remainingCount > totalCount / 2) {
      return "استمر، أنت على الطريق الصحيح!";
    }
    if (remainingCount > 0) {
      return "أنت قريب من الانتهاء!";
    }
    return "تهانينا! لقد أكملت كل شيء بنجاح!";
  };

  return (
    <Box
      p={4}
      bgcolor={theme.palette.background.paper}
      borderRadius={4}
      boxShadow={3}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        backgroundImage:
          "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              bgcolor:
                remainingCount === 0
                  ? theme.palette.success.main
                  : theme.palette.primary.main,
              width: 48,
              height: 48,
            }}
          >
            {remainingCount === 0 ? (
              <CelebrationIcon fontSize="medium" />
            ) : (
              <AutoAwesomeIcon fontSize="medium" />
            )}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              {getMotivationMessage()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {remainingCount > 0
                ? `لديك ${remainingCount} خطوة${
                    remainingCount > 1 ? "ات" : ""
                  } متبقية لإكمال التهيئة`
                : "لقد أكملت جميع خطوات التهيئة بنجاح!"}
            </Typography>
          </Box>
        </Stack>

        {remainingCount > 0 ? (
          <StyledChip
            color="warning"
            label={`${remainingCount}/${totalCount}`}
            icon={<BoltIcon fontSize="small" />}
            sx={{
              backgroundColor: theme.palette.warning.light,
              color: theme.palette.warning.contrastText,
              fontSize: "1rem",
              px: 1.5,
              py: 0.5,
            }}
          />
        ) : (
          <StyledChip
            color="success"
            label="مكتمل!"
            icon={<CheckCircleIcon fontSize="small" />}
            sx={{
              backgroundColor: theme.palette.success.light,
              color: theme.palette.success.contrastText,
              fontSize: "1rem",
              px: 1.5,
              py: 0.5,
            }}
          />
        )}
      </Stack>

      <BorderLinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 4 }}
      />

      <Stack spacing={2}>
        {sortedSteps.map((step, idx) => (
          <Fade in={true} key={step.key} timeout={500 + idx * 100}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2.5,
                borderRadius: 2,
                backgroundColor: step.done
                  ? alpha(theme.palette.success.light, 0.1)
                  : alpha(theme.palette.warning.light, 0.08),
                border: `1px solid ${
                  step.done
                    ? alpha(theme.palette.success.main, 0.3)
                    : alpha(theme.palette.warning.main, 0.3)
                }`,
                boxShadow: step.done
                  ? `0 2px 8px ${alpha(theme.palette.success.main, 0.1)}`
                  : `0 2px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: step.done
                    ? `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`
                    : `0 4px 20px ${alpha(theme.palette.warning.main, 0.2)}`,
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: step.done
                      ? alpha(theme.palette.success.main, 0.2)
                      : alpha(theme.palette.warning.main, 0.2),
                    color: step.done
                      ? theme.palette.success.main
                      : theme.palette.warning.main,
                    flexShrink: 0,
                  }}
                >
                  {step.done ? (
                    <CheckCircleIcon fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" />
                  )}
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={step.done ? 600 : 700}
                    color={step.done ? "text.secondary" : "text.primary"}
                    sx={{
                      textDecoration: step.done ? "line-through" : "none",
                      opacity: step.done ? 0.8 : 1,
                    }}
                  >
                    {step.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontSize="0.8rem"
                  >
                    {step.description}
                  </Typography>
                </Box>
              </Stack>

              {!step.done && (
                <Tooltip
                  title="اضغط لإكمال هذه الخطوة"
                  arrow
                  TransitionComponent={Zoom}
                >
                  <Button
                    variant="contained"
                    color="warning"
                    endIcon={<ArrowForwardIosIcon fontSize="small" />}
                    onClick={() => onGoToStep(step.key)}
                    sx={{
                      fontWeight: 700,
                      borderRadius: 2,
                      px: 2.5,
                      py: 1,
                      background: `linear-gradient(45deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                      boxShadow: `0 2px 6px ${alpha(
                        theme.palette.warning.main,
                        0.4
                      )}`,
                      "&:hover": {
                        boxShadow: `0 4px 12px ${alpha(
                          theme.palette.warning.main,
                          0.6
                        )}`,
                      },
                    }}
                  >
                    أكمل الآن
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Fade>
        ))}
      </Stack>

      {remainingCount === 0 && (
        <Fade in={true} timeout={1000}>
          <Box
            mt={4}
            p={3}
            textAlign="center"
            borderRadius={2}
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              border: `1px dashed ${theme.palette.success.main}`,
            }}
          >
            <CelebrationIcon
              fontSize="large"
              color="success"
              sx={{ mb: 1, fontSize: "3rem" }}
            />
            <Typography
              variant="h6"
              fontWeight={700}
              color="success.main"
              gutterBottom
            >
              تهانينا! لقد أكملت التهيئة بنجاح 🎉
            </Typography>
            <Typography variant="body2" color="text.secondary">
              يمكنك الآن البدء في استخدام النظام بالكامل. نتمنى لك تجربة ناجحة!
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
}

// Helper function for alpha colors
function alpha(color: string, opacity: number): string {
  return (
    color +
    Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")
  );
}
