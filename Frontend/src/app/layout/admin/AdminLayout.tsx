// src/pages/admin/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Outlet,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Divider,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Breadcrumbs,
  Stack,
  Badge,
  CssBaseline,
} from "@mui/material";
import { styled, useTheme, alpha, type Theme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ForumIcon from "@mui/icons-material/Forum";
import TuneIcon from "@mui/icons-material/Tune";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import SettingsIcon from "@mui/icons-material/Settings";
import HomeIcon from "@mui/icons-material/Home";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import HelpIcon from "@mui/icons-material/Help";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";


/**
 * =============================
 * Layout constants
 * =============================
 */
const NAV_WIDTH = 280;
const NAV_MINI = 76;
const APPBAR_HEIGHT = 72; // keep in sync with Toolbar minHeight

/**
 * =============================
 * Navigation items (RTL labels)
 * =============================
 */
interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/admin",
    label: "لوحة التحكم",
    icon: <DashboardIcon />,
    description: "نظرة عامة",
  },
  {
    to: "/admin/kleem/prompts",
    label: "البرومبتات",
    icon: <TextSnippetIcon />,
    description: "قوالب المحادثة",
  },
  {
    to: "/admin/kleem/knowledge-base",
    label: "قاعدة المعرفة",
    icon: <MenuBookIcon />,
    description: "مكتبة المعلومات",
  },
  {
    to: "/admin/kleem/conversations",
    label: "المحادثات",
    icon: <ForumIcon />,
    description: "إدارة الجلسات",
  },
  {
    to: "/admin/kleem/chat-settings",
    label: "إعدادات المحادثة",
    icon: <TuneIcon />,
    description: "تخصيص الواجهة",
  },
  {
    to: "/admin/kleem/ratings",
    label: "التقييمات",
    icon: <ThumbUpIcon />,
    description: "مراجعة رضا العملاء",
  },
  {
    to: "/admin/kleem/analytics",
    label: "التحليلات",
    icon: <QueryStatsIcon />,
    description: "تقارير مفصلة",
  },
  {
    to: "/admin/kleem/missing-responses",
    label: "الإجابات المفقودة",
    icon: <HelpIcon />,
    description: "أسئلة تحتاج لإجابات",
    badge: 5,
  },
  {
    to: "/admin/kleem/settings",
    label: "الإعدادات",
    icon: <SettingsIcon />,
    description: "إعدادات عامة",
  },
];

/**
 * =============================
 * Styled building blocks
 * =============================
 */
const DrawerShell = styled("div", {
  shouldForwardProp: (p) => p !== "open",
})<{ open: boolean }>(({ theme, open }) => ({
  width: open ? NAV_WIDTH : NAV_MINI,
  transition: theme.transitions.create(["width", "box-shadow"], {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.standard,
  }),
  boxSizing: "border-box",
  overflowX: "hidden",
  borderLeft: `1px solid ${theme.palette.divider}`,
  height: "100%",
  background:
    theme.palette.mode === "dark"
      ? alpha(theme.palette.background.paper, 0.92)
      : theme.palette.background.paper,
  backdropFilter: "blur(10px)",
  position: "fixed",
  right: 0,
  top: APPBAR_HEIGHT,
  bottom: 0,
  zIndex: theme.zIndex.appBar - 1,
}));

const TopBar = styled(AppBar, {
  shouldForwardProp: (prop) =>
    !["isMobile", "miniOpen"].includes(prop as string),
})<{ isMobile: boolean; miniOpen: boolean }>(
  ({ theme, isMobile, miniOpen }) => ({
    background:
      theme.palette.mode === "dark"
        ? alpha(theme.palette.background.paper, 0.92)
        : alpha(theme.palette.background.paper, 0.96),
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
    boxShadow: `0 1px 12px ${alpha(theme.palette.common.black, 0.12)}`,
    paddingRight: isMobile ? 0 : miniOpen ? `${NAV_MINI}px` : `${NAV_WIDTH}px`,
    transition: theme.transitions.create(["padding-right", "background"], {
      duration: theme.transitions.duration.standard,
    }),
    height: APPBAR_HEIGHT,
  })
);

const ToolbarOffset = styled("div")(() => ({
  height: APPBAR_HEIGHT,
  minHeight: APPBAR_HEIGHT,
}));

const NavItemButton = styled(ListItemButton, {
  shouldForwardProp: (p) => p !== "active" && p !== "expanded",
})<{ active?: boolean; expanded?: boolean }>(({ theme, active }) => ({
  borderRadius: theme.spacing(1.5),
  margin: theme.spacing(0.5, 1),
  padding: theme.spacing(1.5, 2),
  transition: theme.transitions.create(["background-color", "transform"], {
    duration: theme.transitions.duration.shorter,
  }),
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    transform: "translateX(-2px)",
  },
  ...(active && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
    fontWeight: 600,
    position: "relative",
    "&::before": {
      content: '""',
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: theme.palette.primary.main,
      borderRadius: "3px 0 0 3px",
    },
  }),
}));

/**
 * =============================
 * Component
 * =============================
 */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down("md"));
  const isTablet = useMediaQuery((t: Theme) => t.breakpoints.down("lg"));

  // Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [miniOpen, setMiniOpen] = useState<boolean>(() => !isTablet);

  // User & notifications menus
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifEl, setNotifEl] = useState<null | HTMLElement>(null);
  const userOpen = Boolean(anchorEl);
  const notifOpen = Boolean(notifEl);

  // Store mini state on viewport changes
  useEffect(() => {
    if (isTablet) setMiniOpen(false);
  }, [isTablet]);

  // Active matcher
  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const map: Record<string, string> = {
      admin: "لوحة التحكم",
      kleem: "كليم",
      prompts: "البرومبتات",
      "knowledge-base": "قاعدة المعرفة",
      conversations: "المحادثات",
      "chat-settings": "إعدادات المحادثة",
      analytics: "التحليلات",
      settings: "الإعدادات",
      ratings: "التقييمات",
      "missing-responses": "الإجابات المفقودة",
    };
    const links: { to: string; label: string }[] = [];
    parts.reduce((acc, curr) => {
      const to = `${acc}/${curr}`;
      links.push({ to, label: map[curr] || curr });
      return to;
    }, "");
    return links;
  }, [pathname]);

  // Handlers
  const toggleMobile = () => setMobileOpen((p) => !p);
  const toggleMini = () => setMiniOpen((p) => !p);

  // Mock logout
  const handleLogout = () => navigate("/auth/login");

  // Navigation list
  const NavList = (
    <List sx={{ p: 1, pt: 2 }}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.to);
        const content = (
          <NavItemButton
            key={item.to}
            active={active}
            onClick={() => navigate(item.to)}
            aria-current={active ? "page" : undefined}
          >
            <ListItemIcon
              sx={{
                minWidth: miniOpen ? 40 : 28,
                justifyContent: "center",
                color: active ? "primary.main" : "inherit",
              }}
            >
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error" variant="dot">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            {miniOpen && (
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: active ? 600 : 500 }}
                  >
                    {item.label}
                  </Typography>
                }
                secondary={
                  item.description ? (
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {item.description}
                    </Typography>
                  ) : undefined
                }
                sx={{ m: 0 }}
              />
            )}
          </NavItemButton>
        );

        if (!miniOpen) {
          return (
            <Tooltip
              key={item.to}
              title={`${item.label}${
                item.description ? ` — ${item.description}` : ""
              }`}
              placement="left"
              arrow
            >
              <Box>{content}</Box>
            </Tooltip>
          );
        }
        return content;
      })}
    </List>
  );

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
      dir="rtl"
    >
      <CssBaseline />

      {/* App Bar */}
      <TopBar
        position="fixed"
        color="inherit"
        elevation={0}
        isMobile={isMobile}
        miniOpen={miniOpen}
      >
        <Toolbar
          sx={{
            gap: 2,
            justifyContent: "space-between",
            minHeight: APPBAR_HEIGHT,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            {/* Mobile menu */}
            {isMobile && (
              <IconButton
                onClick={toggleMobile}
                aria-label="فتح القائمة"
                sx={{ borderRadius: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Brand */}
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconButton
                onClick={() => navigate("/")}
                aria-label="الرئيسية"
                sx={{ borderRadius: 2 }}
              >
                <HomeIcon />
              </IconButton>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  لوحة تحكم كليم
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: { xs: "none", md: "block" },
                  }}
                >
                  إدارة متقدمة للنظام
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            {/* Notifications */}
            <Tooltip title="الإشعارات">
              <IconButton
                onClick={(e) => setNotifEl(e.currentTarget)}
                sx={{ borderRadius: 2 }}
                aria-haspopup="menu"
                aria-expanded={notifOpen ? "true" : undefined}
              >
                <Badge badgeContent={3} color="error" variant="dot">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User menu */}
            <Tooltip title="حسابي">
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ borderRadius: 2 }}
                aria-haspopup="menu"
                aria-expanded={userOpen ? "true" : undefined}
              >
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "primary.main",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  كم
                </Avatar>
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>

        {/* User menu */}
        <Menu
          anchorEl={anchorEl}
          open={userOpen}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: 2,
              minWidth: 220,
              border: `1px solid ${theme.palette.divider}`,
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box
            sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              مرحباً كليم
            </Typography>
            <Typography variant="caption" color="text.secondary">
              admin@kleem.ai
            </Typography>
          </Box>
          <MenuItem
            onClick={() => setAnchorEl(null)}
            sx={{ py: 1.5, gap: 1.25 }}
          >
            <AccountCircleIcon fontSize="small" /> الملف الشخصي
          </MenuItem>
          <MenuItem
            onClick={() => setAnchorEl(null)}
            sx={{ py: 1.5, gap: 1.25 }}
          >
            <SettingsIcon fontSize="small" /> إعدادات الحساب
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            sx={{ py: 1.5, gap: 1.25, color: "error.main" }}
          >
            <LogoutIcon fontSize="small" /> تسجيل الخروج
          </MenuItem>
        </Menu>

        {/* Notifications menu */}
        <Menu
          anchorEl={notifEl}
          open={notifOpen}
          onClose={() => setNotifEl(null)}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: 2,
              minWidth: 320,
              maxWidth: 400,
              border: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <Box
            sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              الإشعارات
            </Typography>
          </Box>
          <MenuItem sx={{ py: 2, alignItems: "flex-start" }}>
            <Stack spacing={0.5} sx={{ width: "100%" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                إجابة جديدة مطلوبة
              </Typography>
              <Typography variant="caption" color="text.secondary">
                يوجد 5 أسئلة تحتاج لإجابات
              </Typography>
              <Typography variant="caption" color="primary.main">
                منذ 5 دقائق
              </Typography>
            </Stack>
          </MenuItem>
        </Menu>
      </TopBar>

      {/* Side navigation */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={toggleMobile}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: NAV_WIDTH } }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography fontWeight={800}>القائمة</Typography>
            <IconButton onClick={toggleMobile}>
              {theme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </Toolbar>
          <Divider />
          {NavList}
        </Drawer>
      ) : (
        <DrawerShell open={miniOpen}>
          <Toolbar
            sx={{
              height: APPBAR_HEIGHT,
              position: "fixed",
              right: 0,
              width: miniOpen ? NAV_WIDTH : NAV_MINI,
              zIndex: 1,
              bgcolor: "background.paper",
              borderBottom: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                justifyContent: miniOpen ? "space-between" : "center",
              }}
            >
              {miniOpen && <Typography fontWeight={800}>التنقل</Typography>}
              <IconButton
                size="small"
                onClick={toggleMini}
                aria-label={miniOpen ? "طي القائمة" : "توسيع القائمة"}
              >
                {/* In RTL, ChevronRight visually points to collapse */}
                {miniOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Box>
          </Toolbar>
          <ToolbarOffset />
          {NavList}
        </DrawerShell>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          pt: 3,
          pr: isMobile
            ? 2
            : miniOpen
            ? `${NAV_MINI + 16}px`
            : `${NAV_WIDTH + 16}px`,
          transition: (t) =>
            t.transitions.create(["padding-right"], {
              duration: t.transitions.duration.standard,
            }),
          minWidth: 0,
        }}
      >
        {/* Breadcrumbs */}
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs
            separator={
              <ChevronLeftIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            }
            aria-label="مؤشر الصفحات"
            sx={{ "& .MuiBreadcrumbs-ol": { flexWrap: "wrap" } }}
          >
            <Typography
              component={RouterLink}
              to="/admin"
              color="primary"
              sx={{ textDecoration: "none", fontWeight: 600 }}
            >
              لوحة التحكم
            </Typography>
            {crumbs.slice(1).map((c, idx, arr) => (
              <Typography
                key={c.to}
                component={RouterLink}
                to={c.to}
                sx={{
                  textDecoration: "none",
                  color:
                    idx === arr.length - 1 ? "text.primary" : "text.secondary",
                  fontWeight: idx === arr.length - 1 ? 700 : 500,
                  fontSize: "0.9rem",
                  "&:hover": {
                    color:
                      idx === arr.length - 1 ? "text.primary" : "primary.main",
                  },
                }}
              >
                {c.label}
              </Typography>
            ))}
          </Breadcrumbs>
        </Box>

        <Outlet />
      </Box>
    </Box>
  );
}

/**
 * 📌 RTL Setup (wrap your app root):
 *
 * import { CacheProvider } from '@emotion/react';
 * import createCache from '@emotion/cache';
 * import rtlPlugin from 'stylis-plugin-rtl';
 *
 * const cacheRtl = createCache({ key: 'mui-rtl', stylisPlugins: [rtlPlugin] });
 *
 * <CacheProvider value={cacheRtl}>
 *   <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
 *     <CssBaseline />
 *     <AdminLayout />
 *   </ThemeProvider>
 * </CacheProvider>
 */
