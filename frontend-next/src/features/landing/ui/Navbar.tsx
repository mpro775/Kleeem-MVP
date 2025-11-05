'use client';

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
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useParams } from 'next/navigation';

type NavLink = { label: string; href?: string; id?: string };

const NAV_LINKS: NavLink[] = [
  { label: "الرئيسية", href: "/", id: "hero" },
  { label: "كيف يعمل", href: "#how-it-works", id: "how-it-works" },
  { label: "المميزات", href: "#features", id: "features" },
  { label: "التكاملات", href: "#integrations", id: "integrations" },
];

const DASHBOARD_PATH = "/dashboard";

function useAuthState() {
  const ls = typeof window !== "undefined" ? window.localStorage : null;
  const isAuthed =
    !!ls?.getItem("accessToken") ||
    !!ls?.getItem("token");
  return { isAuthed };
}

// Hook للحصول على الـ locale الحالي
function useLocale(): string {
  const params = useParams();
  return (params?.locale as string) || 'ar';
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
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { isAuthed } = useAuthState();
  const locale = useLocale();

  const [open, setOpen] = React.useState(false);
  const toggle = (v: boolean) => () => setOpen(v);

  const [activeHash, setActiveHash] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveHash(window.location.hash);
      const handleHashChange = () => setActiveHash(window.location.hash);
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  // دالة للتنقل مع دعم الـ locale
  const go = (href?: string) => () => {
    if (!href) return;
    if (href.startsWith("#")) {
      // للروابط داخل الصفحة (hash links)
      const currentPath = `/${locale}`;
      if (pathname !== currentPath) {
        router.push(currentPath + href);
        setTimeout(() => scrollToHash(href), 0);
      } else {
        scrollToHash(href);
      }
      setOpen(false);
      return;
    }
    // للروابط العادية، إضافة الـ locale
    const fullPath = href === "/" ? `/${locale}` : `/${locale}${href}`;
    router.push(fullPath);
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
            onClick={() => router.push(`/${locale}`)}
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
            <Image
              src="/assets/logo.png"
              alt="Kleem"
              width={isMdUp ? 44 : 40}
              height={isMdUp ? 44 : 40}
              style={{
                width: "auto",
                height: isMdUp ? 44 : 40,
                objectFit: "contain",
              }}
              priority
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
                (l.href === "/" && (pathname === `/${locale}` || pathname === "/")) ||
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
                onClick={() => router.push(`/${locale}${DASHBOARD_PATH}`)}
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
                onClick={() => router.push(`/${locale}/signup`)}
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
              onClick={() => router.push(`/${locale}/contact`)}
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
                <Image
                  src="/assets/logo.png"
                  alt="Kleem"
                  width={28}
                  height={28}
                  style={{
                    width: "auto",
                    height: 28,
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
                    router.push(`/${locale}${DASHBOARD_PATH}`);
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
                    router.push(`/${locale}/signup`);
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
                  router.push(`/${locale}/contact`);
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
