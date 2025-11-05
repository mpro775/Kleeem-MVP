'use client';

import {
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  IconButton,
  Button,
  Typography,
  Box,
  Tooltip,
  Badge,
  LinearProgress,
  Fade,
  styled,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CodeIcon from "@mui/icons-material/Code";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material"; // إذا تحب حل 2

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.grey[900]
      : theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  minWidth: 120,
  fontWeight: 500,
  "&.Mui-selected": { color: theme.palette.primary.main },
  // ↓ على الشاشات الصغيرة خفّض العرض والحشوات
  [theme.breakpoints.down("sm")]: {
    minWidth: 0,
    paddingInline: 8,
    fontSize: 13,
  },
}));

interface PromptToolbarProps {
  activeTab: "quick" | "advanced";
  onTabChange: (tab: "quick" | "advanced") => void;
  onRefresh: () => void;
  onSave: () => void;
  isSaving: boolean;
  lastUpdated?: Date | null;
}

export function PromptToolbar({
  activeTab,
  onTabChange,
  onRefresh,
  onSave,
  isSaving,
  lastUpdated,
}: PromptToolbarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdated = () =>
    lastUpdated
      ? format(lastUpdated, "HH:mm - dd MMM yyyy", { locale: ar })
      : "لم يتم التحديث بعد";

  return (
    <StyledAppBar position="sticky" elevation={0}>
      <Fade in={isSaving} unmountOnExit>
        <LinearProgress
          color="primary"
          sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }}
        />
      </Fade>

      <Toolbar
        sx={{
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          minHeight: { xs: 64, md: 72 },
        }}
      >
        {/* 1) العنوان - خلي ترتيبه أوّل سطر دائمًا */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            order: { xs: 1, md: 1 },
          }}
        >
          <AutoFixHighIcon color="primary" sx={{ mr: 1.5 }} />
          <Typography variant="h6" noWrap>
            استوديو البرومبت
          </Typography>
        </Box>

        {/* 2) الأزرار (يمين) - على الجوال خلّها قبل التابات لتأخذ سطرها */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            order: { xs: 2, md: 3 },
          }}
        >
          {!isMdDown && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mr: 2 }}
              noWrap
            >
              آخر تحديث: {formatLastUpdated()}
            </Typography>
          )}

          <Tooltip title="تحديث المعاينة">
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={isRefreshing || isSaving}
                sx={{ mr: 1 }}
              >
                <Badge color="primary" variant="dot" invisible={!isRefreshing}>
                  <RefreshIcon />
                </Badge>
              </IconButton>
            </span>
          </Tooltip>

          {/* على الشاشات الصغيرة: زر أصغر نصه مختصر */}
          <Button
            startIcon={<SaveIcon />}
            variant="contained"
            onClick={onSave}
            disabled={isSaving}
            sx={{
              minWidth: { xs: 48, md: 120 },
              px: { xs: 1, md: 2 },
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
          >
            {isMdDown
              ? isSaving
                ? "حفظ..."
                : "حفظ"
              : isSaving
              ? "جاري الحفظ..."
              : "حفظ التغييرات"}
          </Button>
        </Box>

        {/* 3) التبويبات - خَلِّها تأخذ صف كامل على الجوال */}
        <Box
          sx={{
            order: { xs: 3, md: 2 },
            flex: { xs: "1 0 100%", md: "0 1 auto" },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            justifyContent: { xs: "stretch", md: "center" },
            mt: { xs: 0.5, md: 0 },
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => onTabChange(v)}
            variant={isSmDown ? "fullWidth" : "scrollable"}
            allowScrollButtonsMobile
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            <StyledTab
              value="quick"
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AutoFixHighIcon fontSize="small" sx={{ mr: 1 }} />
                  <span>الإعداد السريع</span>
                </Box>
              }
            />
            <StyledTab
              value="advanced"
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CodeIcon fontSize="small" sx={{ mr: 1 }} />
                  <span>القالب المتقدم</span>
                </Box>
              }
            />
          </Tabs>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
}
