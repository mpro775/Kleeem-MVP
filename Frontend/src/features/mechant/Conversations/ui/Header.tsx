// src/features/mechant/Conversations/ui/Header.tsx
import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Tooltip,
  Avatar,
  Divider,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import ChatIcon from "@mui/icons-material/Chat";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ShieldMoonRoundedIcon from "@mui/icons-material/ShieldMoonRounded";
import { alpha } from "@mui/material/styles";
import type { ChannelType } from "@/features/mechant/Conversations/type";

const getChannelIcon = (channel?: ChannelType) => {
  switch (channel) {
    case "whatsapp":
      return <WhatsAppIcon fontSize="small" />;
    case "telegram":
      return <TelegramIcon fontSize="small" />;
    case "webchat":
      return <ChatIcon fontSize="small" />;
    default:
      return <ChatIcon fontSize="small" />;
  }
};

const getChannelColor = (theme: any, channel?: ChannelType) => {
  switch (channel) {
    case "whatsapp":
      return "#25D366";
    case "telegram":
      return "#229ED9";
    case "webchat":
      return theme.palette.mode === "dark" ? "#9f8cff" : "#805ad5";
    default:
      return theme.palette.text.disabled;
  }
};

const getChannelLabel = (channel?: ChannelType) => {
  switch (channel) {
    case "whatsapp":
      return "واتساب";
    case "telegram":
      return "تيليجرام";
    case "webchat":
      return "ويب شات";
    default:
      return "قناة";
  }
};

// ✂️ تقصير المعرف
const shortenSessionId = (sessionId?: string) => {
  if (!sessionId) return "";
  if (sessionId.length <= 12) return sessionId;
  return `${sessionId.substring(0, 8)}…${sessionId.substring(
    sessionId.length - 4
  )}`;
};

// 🧠 اسم محادثة ذكي
const getConversationName = (sessionId?: string) => {
  const channelLabel = "";
  if (!sessionId) return "اختر محادثة";
  if (sessionId.includes("customer") || sessionId.includes("user")) {
    return `عميل ${channelLabel}`;
  }
  return `${shortenSessionId(sessionId)}`;
};

type HeaderProps = {
  selectedSession?: string;
  handover?: boolean;
  onToggleHandover: (v: boolean) => void;
  onBack?: () => void;
  channel?: ChannelType;
  showSessionId?: boolean; // ← جديد

  rightActions?: React.ReactNode; // إن أردت إضافة أزرار جانبية لاحقًا
};

export default function Header({
  selectedSession,
  handover,
  onToggleHandover,
  onBack,
  channel,
  rightActions,
}: HeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const name = getConversationName("محادثة");
  const chColor = getChannelColor(theme, channel);

  return (
    <Box
      component="header"
      // ✅ ثابت أعلى الشاشة (Sticky) للموبايل والديسكتوب
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (t) => t.zIndex.appBar + 1,
        // Glassmorphism خلفية زجاجية ديناميكية مع دعم الداكن
        backdropFilter: "blur(10px)",
        background: `linear-gradient(180deg,
          ${alpha(
            theme.palette.background.paper,
            theme.palette.mode === "dark" ? 0.35 : 0.6
          )} 0%,
          ${alpha(
            theme.palette.background.paper,
            theme.palette.mode === "dark" ? 0.25 : 0.45
          )} 100%
        )`,
        // إطار متوهّج ناعم
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.08)}`,
        // حافة علوية مضيئة دقيقة
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderTop: `1px solid ${alpha(theme.palette.primary.light, 0.12)}`,
          pointerEvents: "none",
        },
      }}
    >
      <Box
        // الحاوية الداخلية
        sx={{
          px: isSmallMobile ? 1.25 : 2,
          py: isSmallMobile ? 1 : 1.25,
          display: "grid",
          alignItems: "center",
          gridTemplateColumns: isMobile ? "auto 1fr auto" : "1fr auto",
          gap: 1.25,
          minHeight: 64,
          // خط متدرّج رقيق أسفل الهيدر
        }}
      >
        {/* زر الرجوع للموبايل */}
        {isMobile && onBack ? (
          <Tooltip title="رجوع">
            <IconButton
              aria-label="رجوع"
              onClick={onBack}
              size="small"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                border: `1px solid ${alpha(chColor, 0.25)}`,
                backgroundColor: alpha(chColor, 0.08),
                color: theme.palette.text.secondary,
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: `0 8px 20px ${alpha(chColor, 0.2)}`,
                  color: chColor,
                  backgroundColor: alpha(chColor, 0.14),
                },
              }}
            >
              <ArrowBackIosNewRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}

        {/* عنوان المحادثة + القناة + المعرّف */}
        <Box
          sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 1.25 }}
        >
          {/* شارة القناة دائرية مع توهّج */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Box
              sx={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                background: `radial-gradient(50% 50% at 50% 50%,
                  ${alpha(chColor, 0.35)} 0%,
                  ${alpha(chColor, 0.06)} 60%,
                  transparent 100%)`,
                filter: "blur(6px)",
                zIndex: 0,
              }}
            />
            <Avatar
              sx={{
                width: isSmallMobile ? 34 : 38,
                height: isSmallMobile ? 34 : 38,
                fontSize: "0.95rem",
                bgcolor: chColor,
                color: "#fff",
                border: `2px solid ${alpha(
                  theme.palette.background.paper,
                  0.9
                )}`,
                boxShadow: `0 8px 22px ${alpha(chColor, 0.28)}`,
                position: "relative",
                zIndex: 1,
                transition: "transform 0.2s ease",
                "&:hover": { transform: "scale(1.05)" },
              }}
              aria-label={getChannelLabel(channel)}
            >
              {getChannelIcon(channel)}
            </Avatar>
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="h1"
              noWrap
              sx={{
                fontWeight: 800,
                letterSpacing: ".3px",
                lineHeight: 1.2,
                fontSize: isSmallMobile ? 16 : 18,
                // عنوان متدرّج أنيق مع دعم الداكن
                background: `linear-gradient(90deg,
                  ${theme.palette.text.primary},
                  ${alpha(theme.palette.primary.main, 0.9)}
                )`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {name}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 0.5,
                minWidth: 0,
              }}
            ></Box>
          </Box>
        </Box>

        {/* يمين الهيدر: حالة البوت + أزرار إضافية */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifySelf: "end",
          }}
        >
          {/* حالة البوت/التسليم */}
          {!!selectedSession && (
            <FormControlLabel
              labelPlacement="start"
              sx={{ m: 0 }}
              label={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1.25,
                    border: `1px solid ${alpha(
                      handover
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                      0.35
                    )}`,
                    backgroundColor: alpha(
                      handover
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                      0.1
                    ),
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: handover
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                      boxShadow: `0 0 0 0 ${alpha(
                        handover
                          ? theme.palette.warning.main
                          : theme.palette.success.main,
                        0.8
                      )}`,
                      animation: handover ? "none" : "pulse 1.8s infinite",
                      "@keyframes pulse": {
                        "0%": {
                          boxShadow: `0 0 0 0 ${alpha(
                            theme.palette.success.main,
                            0.5
                          )}`,
                        },
                        "70%": {
                          boxShadow: `0 0 0 10px ${alpha(
                            theme.palette.success.main,
                            0
                          )}`,
                        },
                        "100%": { boxShadow: "0 0 0 0 transparent" },
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: isSmallMobile ? "0.68rem" : "0.76rem",
                      fontWeight: 700,
                      color: handover
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <ShieldMoonRoundedIcon
                      sx={{ fontSize: 16, opacity: 0.8 }}
                      aria-hidden
                    />
                    {handover ? "تم التسليم" : "البوت يعمل"}
                  </Typography>
                </Box>
              }
              control={
                <Switch
                  size="small"
                  color="primary"
                  checked={!!handover}
                  onChange={(_, v) => onToggleHandover(v)}
                  inputProps={{ "aria-label": "تبديل حالة التسليم" }}
                  sx={{
                    mx: 0.5,
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: theme.palette.warning.main,
                      "& + .MuiSwitch-track": {
                        backgroundColor: alpha(
                          theme.palette.warning.main,
                          0.45
                        ),
                      },
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: alpha(theme.palette.success.main, 0.4),
                    },
                  }}
                />
              }
            />
          )}

          {/* Divider نقطي صغير للفصل */}
          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 0.5,
              borderColor: alpha(theme.palette.divider, 0.6),
            }}
          />

          {/* مساحة للأزرار الإضافية (اختياري) */}
          {rightActions ?? (
            <Tooltip title="المزيد">
              <IconButton
                size="small"
                aria-label="خيارات إضافية"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  color: theme.palette.text.secondary,
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  backgroundColor: alpha(theme.palette.background.default, 0.4),
                  "&:hover": {
                    color: theme.palette.primary.main,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 6px 18px ${alpha(
                      theme.palette.primary.main,
                      0.18
                    )}`,
                  },
                }}
              >
                <MoreHorizRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}
