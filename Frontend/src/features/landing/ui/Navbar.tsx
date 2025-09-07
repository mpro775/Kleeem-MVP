// src/components/landing/Navbar.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
  Link as MLink,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import type { User } from "@/context/AuthContext";

let useAuthSafe:
  | undefined
  | (() => { user: User | null; token: string | null });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useAuthSafe = require("@/context/AuthContext").useAuth;
} catch {}

type NavLink = { label: string; href?: string; id?: string };

const NAV_LINKS: NavLink[] = [
  { label: "الرئيسية", href: "/", id: "hero" },
  { label: "كيف يعمل", href: "#how-it-works", id: "how-it-works" },
  { label: "المميزات", href: "#features", id: "features" },
  { label: "التكاملات", href: "#integrations", id: "integrations" },
];

const DASHBOARD_PATH = "/dashboard";

function useAuthState() {
  let userFromContext: User | null = null;
  let tokenFromContext: string | null = null;
  try {
    if (typeof useAuthSafe === "function") {
      const auth = useAuthSafe();
      userFromContext = auth?.user ?? null;
      tokenFromContext = auth?.token ?? null;
    }
  } catch {}
  const ls = typeof window !== "undefined" ? window.localStorage : null;
  const isAuthed =
    !!userFromContext ||
    !!tokenFromContext ||
    !!ls?.getItem("accessToken") ||
    !!ls?.getItem("token");
  return { isAuthed };
}

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  if (el) {
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { isAuthed } = useAuthState();

  const [open, setOpen] = React.useState(false);
  const toggle = (v: boolean) => () => setOpen(v);

  const activeHash =
    typeof window !== "undefined" && location.hash ? location.hash : "";

  const go = (href?: string) => () => {
    if (!href) return;
    if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate("/" + href);
        setTimeout(() => scrollToHash(href), 0);
      } else {
        scrollToHash(href);
      }
      setOpen(false);
      return;
    }
    navigate(href);
    setOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed" // ✅ ثابت أعلى الصفحة
        dir="rtl"
        sx={{
          top: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.appBar,
          bgcolor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          boxShadow: "none",
          px: { xs: 2, md: 6 },
        }}
      >
        {/* زر تخطي للمحتوى */}
        <MLink
          href="#main-content"
          sx={{
            position: "absolute",
            right: -9999,
            "&:focus": {
              right: 16,
              top: 8,
              zIndex: 2000,
              p: 1,
              bgcolor: "background.paper",
              border: (t) => `1px solid ${t.palette.divider}`,
              borderRadius: 1,
            },
          }}
        >
          تخطِّ إلى المحتوى
        </MLink>

        <Toolbar
          sx={{
            position: "relative", // ✅ نستخدم تموضع نسبي لتوسيط الشعار
            display: "flex",
            justifyContent: "space-between",
            p: "0 !important",
            minHeight: { xs: 64, md: 72 },
          }}
        >
          {/* زر الهامبرجر (يثبت على الطرف) */}
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              onClick={toggle(true)}
              aria-label="فتح القائمة"
              sx={{
                position: "absolute",
                right: 8, // في RTL واجهة عربية: الزر بطرف اليمين
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* الشعار — متمركز على الجوال، طبيعي على الديسكتوب */}
          <Box
            onClick={() => navigate("/")}
            aria-label="العودة للرئيسية"
            sx={{
              position: { xs: "absolute", md: "static" },
              left: { xs: "50%", md: "auto" },
              transform: { xs: "translateX(-50%)", md: "none" },
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
            }}
          >
            <img
              src={logo}
              alt="Kleem"
              style={{
                // ✅ حجم طبيعي ومرن للموبايل
                height: isMdUp ? 44 : 40,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Box>

          {/* روابط الديسكتوب */}
          <Box
            component="nav"
            aria-label="التنقل الرئيسي"
            sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}
          >
            {NAV_LINKS.map((l) => {
              const isActive =
                (l.href === "/" && location.pathname === "/") ||
                (l.href?.startsWith("#") && activeHash === l.href);
              return (
                <Button
                  key={l.label}
                  onClick={go(l.href)}
                  aria-current={isActive ? "page" : undefined}
                  variant={isActive ? "contained" : "text"}
                  sx={{
                    color: isActive ? "common.white" : "#563fa6",
                    background: isActive
                      ? `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                      : "transparent",
                    borderRadius: 2,
                    boxShadow: "none",
                    fontWeight: 700,
                    px: 1.5,
                    "&:hover": {
                      background: isActive ? undefined : "rgba(86,63,166,.06)",
                    },
                  }}
                >
                  {l.label}
                </Button>
              );
            })}
          </Box>

          {/* CTAs ديسكتوب */}
          <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1.2 }}>
            {isAuthed ? (
              <Button
                variant="contained"
                onClick={() => navigate(DASHBOARD_PATH)}
                sx={{
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  px: 3,
                  fontWeight: 800,
                  borderRadius: 2,
                  boxShadow: "none",
                }}
              >
                لوحة التحكم
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => navigate("/signup")}
                sx={{
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  px: 3,
                  fontWeight: 800,
                  borderRadius: 2,
                  boxShadow: "none",
                }}
              >
                اطلب الخدمة
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate("/contact")}
              sx={{
                color: "#563fa6",
                border: "1px solid #563fa6",
                px: 2.5,
                fontWeight: 800,
                borderRadius: 2,
                backgroundImage: "none",
                "&:hover": { backgroundColor: "rgba(86,63,166,.06)" },
              }}
            >
              تواصل معنا
            </Button>
          </Box>
        </Toolbar>

        {/* Drawer Mobile */}
        <Drawer
          anchor="right"
          open={open}
          onClose={toggle(false)}
          ModalProps={{ keepMounted: true }}
        >
          <Box sx={{ width: 320, p: 2 }} role="presentation">
            {/* رأس الدرج */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <img
                  src={logo}
                  alt="Kleem"
                  style={{
                    height: 28, // ✅ الشعار بحجمه الطبيعي داخل الدرج
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
                <Typography fontWeight={900}>كليم</Typography>
              </Box>
              <IconButton aria-label="إغلاق" onClick={toggle(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider />

            {/* روابط — وسط */}
            <List
              component="nav"
              aria-label="قائمة الروابط"
              sx={{ textAlign: "center" }} // ✅ توسيط النصوص
            >
              {NAV_LINKS.map((l) => (
                <ListItemButton key={l.label} onClick={go(l.href)}>
                  <ListItemText
                    primaryTypographyProps={{ align: "center" }}
                    primary={l.label}
                  />
                </ListItemButton>
              ))}
            </List>

            {/* CTAs — نفس ألوان الديسكتوب ومُوسّطة */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.2,
                mt: 1,
                alignItems: "center", // ✅ توسيط العناصر
              }}
            >
              {isAuthed ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    navigate(DASHBOARD_PATH);
                    setOpen(false);
                  }}
                  sx={{
                    background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    fontWeight: 800,
                    borderRadius: 2,
                    boxShadow: "none",
                  }}
                >
                  لوحة التحكم
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    navigate("/signup");
                    setOpen(false);
                  }}
                  sx={{
                    background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    fontWeight: 800,
                    borderRadius: 2,
                    boxShadow: "none",
                  }}
                >
                  اطلب الخدمة
                </Button>
              )}

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  navigate("/contact");
                  setOpen(false);
                }}
                sx={{
                  color: "#563fa6",
                  border: "1px solid #563fa6",
                  borderRadius: 2,
                  backgroundImage: "none",
                  "&:hover": { backgroundColor: "rgba(86,63,166,.06)" },
                }}
              >
                تواصل معنا
              </Button>
            </Box>
          </Box>
        </Drawer>
      </AppBar>

      {/* ✅ Spacer لتفادي قفزة المحتوى بسبب position: fixed */}
      <Box sx={{ height: { xs: 64, md: 72 } }} />
    </>
  );
}
