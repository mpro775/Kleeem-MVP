// src/components/dashboard/Topbar.tsx
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Tooltip,
  Badge,
  InputBase,
  Divider,
  ListItemIcon,
  ListItemText,
  useTheme,
  Paper,
  List,
  ListItem,
  Chip,
  Grow,
  Button,
  Drawer,
} from "@mui/material";
import { useRef, useEffect, useMemo, useState, type ReactNode } from "react";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SearchIcon from "@mui/icons-material/Search";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

// إشعارات حية
import { useAdminNotifications } from "@/shared/hooks/useAdminNotifications";
import type { AdminNotification, ChatNotification, SystemNotification } from "@/shared/types/notification";

const Topbar = ({
  onOpenSidebar,
  isMobile,
  extra,
}: {
  onOpenSidebar: () => void;
  isMobile: boolean;
  extra?: ReactNode;
}) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // قائمة المستخدم
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // بحث
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);

  // إشعارات
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false); // للجوال
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  // آخر وقت مشاهدة الإشعارات
  const [lastSeenTs, setLastSeenTs] = useState<number>(() => {
    const saved = localStorage.getItem("notif_last_seen_ts");
    return saved ? Number(saved) : 0;
  });
  const isChat = (n: AdminNotification): n is ChatNotification => n.kind === "chat";
  const isSystem = (n: AdminNotification): n is SystemNotification => n.kind === "system";
  // 🔔 صوت تنبيه مع AudioContext واحد
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      // بعض المتصفحات توقف الـ context حتى تفاعل المستخدم
      // نحاول resume بصمت
      ctx.resume?.();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 820;
      gain.gain.value = 0.08;
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, 180);
    } catch {
      // لا شيء
    }
  };

  // ✅ مصدر واحد للإشعارات
  useAdminNotifications((n) => {
    setNotifications((prev) => [...prev, n]);
  
    if (isChat(n)) {
      toast.info(
        <div>
          <b>رسالة جديدة</b>
          <br />
          <span>{n.message.text}</span>
        </div>
      );
    } else {
      toast.info(
        <div>
          <b>{n.title || "إشعار جديد"}</b>
          {n.body ? (<><br /><span>{n.body}</span></>) : null}
        </div>
      );
    }
  
    playBeep();
  });
  

  // عدم التكرار (لو وصلتك مكررة من السيرفر): نعتمد ts + sessionId + title كمفتاح تقريبي
  const dedupedNotifications = useMemo(() => {
    const map = new Map<string, AdminNotification>();
    notifications.forEach((n) => {
      const key = isChat(n)
        ? `${n.ts}-${n.sessionId}-${n.kind}`
        : `${n.ts}-${n.type}-${n.title ?? ""}-${n.kind}`;
      if (!map.has(key)) map.set(key, n);
    });
    return Array.from(map.values());
  }, [notifications]);
  

  const unreadCount = dedupedNotifications.filter(
    (n) => (n.ts ?? 0) > lastSeenTs
  ).length;

  // فتح/إغلاق الإشعارات (دِسك توب = Menu ، جوال = Drawer)
  const openNotifications = (ev?: React.MouseEvent<HTMLElement>) => {
    if (isMobile) {
      setNotifDrawerOpen(true);
    } else {
      setNotifAnchorEl(ev?.currentTarget as HTMLElement);
    }
    const now = Date.now();
    setLastSeenTs(now);
    localStorage.setItem("notif_last_seen_ts", String(now));
  };
  const closeNotifications = () => {
    if (isMobile) setNotifDrawerOpen(false);
    else setNotifAnchorEl(null);
  };

  // إغلاق قائمة الإشعارات عند النقر خارجها (ديسكتوب)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotifAnchorEl(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const severityToColor = (sev?: string) =>
    sev === "success"
      ? "success"
      : sev === "warning"
      ? "warning"
      : sev === "error"
      ? "error"
      : "info";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: "0 4px 16px #a69fd822",
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: "64px !important",
          py: 1,
          flexDirection: "row-reverse",
          flexWrap: "wrap",
        }}
      >
        {/* يسار: بحث + إشعارات + إعدادات */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {extra}

          {/* البحث: Paper للديسكتوب + Drawer للجوال */}
          <Paper
            component="form"
            sx={{
              p: "2px 8px",
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              width: { sm: 140, md: 220 },
              boxShadow: "none",
              border: "1px solid #ede7f6",
              background: "#fafaff",
              mr: 1,
            }}
            onSubmit={(e) => e.preventDefault()}
          >
            <InputBase
              sx={{ ml: 1, flex: 1, fontSize: 14 }}
              placeholder="بحث..."
              inputProps={{ "aria-label": "بحث" }}
            />
            <IconButton type="submit" sx={{ p: "4px" }} aria-label="بحث">
              <SearchIcon color="primary" />
            </IconButton>
          </Paper>

          <IconButton
            sx={{ display: { xs: "flex", sm: "none" }, mr: 1 }}
            color="primary"
            onClick={() => setSearchDrawerOpen(true)}
          >
            <SearchIcon />
          </IconButton>

          <Drawer
            anchor="top"
            open={searchDrawerOpen}
            onClose={() => setSearchDrawerOpen(false)}
            PaperProps={{ sx: { p: 2, pt: 4 } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <InputBase
                sx={{
                  ml: 2,
                  flex: 1,
                  fontSize: 16,
                  border: "1px solid #ede7f6",
                  px: 2,
                  py: 1,
                }}
                placeholder="بحث..."
                autoFocus
              />
              <IconButton onClick={() => setSearchDrawerOpen(false)}>
                <SearchIcon color="primary" />
              </IconButton>
            </Box>
          </Drawer>

          {/* الجرس: متاح على كل المقاسات */}
          <Box ref={notificationsRef}>
            <Tooltip title="الإشعارات">
              <IconButton
                color="primary"
                onClick={openNotifications}
                aria-label={`فتح الإشعارات (${unreadCount} غير مقروء)`}
                sx={{
                  background:
                    notifAnchorEl || notifDrawerOpen
                      ? "rgba(76, 0, 120, 0.08)"
                      : "transparent",
                  mx: 0.5,
                  position: "relative",
                  fontSize: { xs: 18, sm: 22 },
                }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* دِسك توب: Menu */}
            <Menu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl) && !isMobile}
              onClose={closeNotifications}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              PaperProps={{
                sx: {
                  width: 340,
                  boxShadow: theme.shadows[10],
                  maxHeight: 460,
                  overflow: "auto",
                  mt: 1,
                  direction: "rtl",
                },
              }}
            >
              <Box
                sx={{
                  p: 2,
                  pb: 1,
                  background: theme.palette.primary.main,
                  color: "#fff",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  الإشعارات ({unreadCount} جديدة)
                </Typography>
              </Box>

              <List sx={{ py: 0 }}>
                {dedupedNotifications
                  .slice(-12)
                  .reverse()
                  .map((n, i) => (
                    <Grow
                      in={true}
                      timeout={Math.min(i * 100, 600)}
                      key={`${n.ts}-${i}`}
                    >
                      <Box>
                        <ListItem
                          sx={{
                            py: 1.5,
                            alignItems: "flex-start",
                            background:
                              (n.ts ?? 0) > lastSeenTs ? "#ede7f6" : "inherit",
                            borderLeft:
                              (n.ts ?? 0) > lastSeenTs
                                ? `3px solid ${theme.palette.primary.main}`
                                : "none",
                          }}
                        >
                          {n.kind === "chat" ? (
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography fontWeight="bold">
                                    رسالة جديدة
                                  </Typography>
                                  {n.channel && (
                                    <Chip label={n.channel} size="small" />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography sx={{ mt: 0.5 }}>
                                    {n.message?.text}
                                  </Typography>
                                  {n.sessionId && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      color="text.secondary"
                                    >
                                      جلسة: {n.sessionId}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          ) : (
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography fontWeight="bold">
                                    {n.title || "إشعار"}
                                  </Typography>
                                  {n.type && (
                                    <Chip
                                      label={n.type}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                  <Chip
                                    label={n.severity ?? "info"}
                                    size="small"
                                    color={severityToColor(n.severity) as any}
                                  />
                                </Box>
                              }
                              secondary={
                                n.body ? (
                                  <Typography
                                    sx={{ mt: 0.5 }}
                                    color="text.secondary"
                                  >
                                    {n.body}
                                  </Typography>
                                ) : null
                              }
                            />
                          )}
                        </ListItem>
                        {i < dedupedNotifications.length - 1 && <Divider />}
                      </Box>
                    </Grow>
                  ))}
              </List>

              <Box sx={{ p: 1.5, textAlign: "center" }}>
                <Button
                  variant="text"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                  onClick={() => {
                    closeNotifications();
                    navigate("/dashboard/notifications"); // إن جهزت صفحة لاحقًا
                  }}
                >
                  عرض جميع الإشعارات
                </Button>
              </Box>
            </Menu>

            {/* جوال: Drawer سفلي */}
            <Drawer
              anchor="bottom"
              open={isMobile && notifDrawerOpen}
              onClose={closeNotifications}
              PaperProps={{ sx: { p: 0, maxHeight: "70vh" } }}
            >
              <Box
                sx={{
                  p: 2,
                  pb: 1,
                  background: theme.palette.primary.main,
                  color: "#fff",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  الإشعارات ({unreadCount} جديدة)
                </Typography>
              </Box>
              <List sx={{ py: 0 }}>
                {dedupedNotifications
                  .slice(-12)
                  .reverse()
                  .map((n, i) => (
                    <Box key={`${n.ts}-${i}`}>
                      <ListItem sx={{ py: 1.5, alignItems: "flex-start" }}>
                        {n.kind === "chat" ? (
                          <ListItemText
                            primary={
                              <Typography fontWeight="bold">
                                رسالة جديدة
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography sx={{ mt: 0.5 }}>
                                  {n.message?.text}
                                </Typography>
                                {n.sessionId && (
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                  >
                                    جلسة: {n.sessionId}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        ) : (
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography fontWeight="bold">
                                  {n.title || "إشعار"}
                                </Typography>
                                {n.type && (
                                  <Chip
                                    label={n.type}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                <Chip
                                  label={n.severity ?? "info"}
                                  size="small"
                                  color={severityToColor(n.severity) as any}
                                />
                              </Box>
                            }
                            secondary={
                              n.body ? (
                                <Typography sx={{ mt: 0.5 }}>
                                  {n.body}
                                </Typography>
                              ) : null
                            }
                          />
                        )}
                      </ListItem>
                      {i < dedupedNotifications.length - 1 && <Divider />}
                    </Box>
                  ))}
              </List>

              <Box sx={{ p: 1.5, textAlign: "center" }}>
                <Button
                  variant="text"
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                  onClick={() => {
                    closeNotifications();
                    navigate("/dashboard/notifications");
                  }}
                >
                  عرض جميع الإشعارات
                </Button>
              </Box>
            </Drawer>
          </Box>

          {/* قائمة إعدادات المستخدم */}
          <Tooltip title="الإعدادات">
            <IconButton
              onClick={handleMenu}
              sx={{
                background: anchorEl ? "#ede7f6" : "transparent",
                "&:hover": { background: "#f3e8ff" },
                fontSize: { xs: 18, sm: 22 },
              }}
              aria-haspopup="menu"
              aria-controls="user-menu"
              aria-expanded={Boolean(anchorEl)}
            >
              <SettingsIcon color="primary" />
              {!isMobile && <ExpandMoreIcon color="primary" fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            PaperProps={{
              sx: {
                width: 230,
                borderRadius: 2,
                boxShadow: theme.shadows[10],
                mt: 1,
                direction: "rtl",
              },
            }}
          >
            <MenuItem
              onClick={() => {
                handleClose();
                navigate("/dashboard/profile");
              }}
            >
              <ListItemIcon>
                <PersonIcon color="primary" />
              </ListItemIcon>
              <ListItemText>ملفي الشخصي</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose();
                navigate("/dashboard/settings");
              }}
            >
              <ListItemIcon>
                <SettingsIcon color="primary" />
              </ListItemIcon>
              <ListItemText>إعداداتي</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose();
                navigate("/dashboard/change-password");
              }}
            >
              <ListItemIcon>
                <LockIcon color="primary" />
              </ListItemIcon>
              <ListItemText>تغيير كلمة المرور</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose();
                navigate("/dashboard/support");
              }}
            >
              <ListItemIcon>
                <SupportAgentIcon color="primary" />
              </ListItemIcon>
              <ListItemText>الدعم الفني</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleClose();
                logout();
              }}
              sx={{ color: theme.palette.error.main }}
            >
              <ListItemIcon sx={{ color: theme.palette.error.main }}>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText>تسجيل الخروج</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        {/* يمين: شعار واسم المتجر */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
          <Avatar
            src={user?.storeLogoUrl}
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 44,
              height: 44,
              mr: 1,
            }}
          >
            <StorefrontIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", fontSize: { xs: 15, sm: 18 } }}
            >
              {user?.storeName || "متجرك"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: 9, sm: 12 } }}
            >
              لوحة تحكم التاجر
            </Typography>
          </Box>
        </Box>

        {isMobile && (
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={onOpenSidebar}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
