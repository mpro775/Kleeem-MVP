"use client";

import React from "react";
import { useForm, Controller, type Path } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TfiEye } from "react-icons/tfi";
import { RiEyeCloseLine } from "react-icons/ri";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import axiosInstance from "@/lib/axios";
import type { User } from "@/lib/auth";

import AuthLayout from "../layout";
import GradientIcon from "@/components/shared/GradientIcon";

const forbidsHtml = (v: string) => !/<[^>]*>/.test(v) && !/[<>]/.test(v);
const sanitizeInput = (v: string) =>
  v.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");

const SignUpSchema = z
  .object({
    name: z
      .string()
      .min(3, "الاسم يجب أن لا يقل عن 3 أحرف")
      .max(80, "الاسم طويل جدًا")
      .transform((s) => s.trim().replace(/\s+/g, " "))
      .refine(forbidsHtml, "ممنوع إدخال وسوم HTML أو رموز < و >")
      .refine(
        (v) => /^[\p{L}\p{M}\p{N} ._''-]+$/u.test(v),
        "استخدم حروف/أرقام ومسافات وبعض الرموز الآمنة فقط"
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("بريد إلكتروني غير صالح")
      .refine(forbidsHtml, "ممنوع إدخال وسوم HTML"),
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .refine((v) => !/\s/.test(v), "كلمة المرور لا يجب أن تحتوي مسافات")
      .refine(
        (v) => !/[<>"'`\\]/.test(v),
        "ممنوع استخدام الرموز < > \" ' ` \\"
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمتا المرور غير متطابقتين",
  });

type SignUpData = z.infer<typeof SignUpSchema>;

type FieldConfig = {
  name: Path<SignUpData>;
  label: string;
  Icon: React.ElementType;
  type?: string;
  isPassword?: boolean;
  showToggle?: boolean;
  autoComplete?: string;
};

const fields: FieldConfig[] = [
  { name: "name", label: "الاسم الكامل", Icon: FaUser, autoComplete: "name" },
  {
    name: "email",
    label: "البريد الإلكتروني",
    Icon: FaEnvelope,
    type: "email",
    autoComplete: "email",
  },
  {
    name: "password",
    label: "كلمة المرور",
    Icon: FaLock,
    isPassword: true,
    showToggle: true,
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "تأكيد كلمة المرور",
    Icon: FaLock,
    isPassword: true,
    showToggle: true,
    autoComplete: "new-password",
  },
];

export default function SignUpPage() {
  const t = useTranslations('auth.signup');
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get("redirect");

  const [visible, setVisible] = React.useState<
    Record<Path<SignUpData>, boolean>
  >({
    password: false,
    confirmPassword: false,
  } as Record<Path<SignUpData>, boolean>);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const toggleVisible = (f: Path<SignUpData>) =>
    setVisible((v) => ({ ...v, [f]: !v[f] }));

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: { errors },
  } = useForm<SignUpData>({
    resolver: zodResolver(SignUpSchema),
  });

  const onSubmit = async ({ name, email, password }: SignUpData) => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.post<{
        user: User;
        accessToken: string;
      }>("/auth/signup", {
        name,
        email,
        password,
      });

      const user = response.data.user;
      const emailVerified = user.emailVerified;

      if (!emailVerified) {
        // خزّن البريد للمساعدة في صفحة التحقق
        sessionStorage.setItem("pendingEmail", email);
        localStorage.setItem("pendingEmail", email);

        // إلى صفحة التفعيل
        router.replace(`/ar/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      // خلاف ذلك: حساب متحقق → الذهاب إلى لوحة التحكم
      const redirectPath = rawRedirect || "/ar/dashboard";
      router.replace(redirectPath);
    } catch (err: unknown) {
      // معالجة الأخطاء من الخادم
      if (err && typeof err === "object") {
        const apiError = err as {
          message?: string;
          fields?: Record<string, string[]>;
        };

        // عرض رسالة الخطأ العامة
        if (apiError.message) {
          setError(apiError.message);
        }

        // تطبيق أخطاء الحقول
        if (apiError.fields) {
          Object.entries(apiError.fields).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              setFormError(field as Path<SignUpData>, {
                type: "server",
                message: messages[0],
              });
            }
          });
        }
      } else {
        setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginHref = rawRedirect
    ? `/ar/login?redirect=${encodeURIComponent(rawRedirect)}`
    : "/ar/login";

  return (
    <AuthLayout
      title={
        <Typography
          variant="h4"
          fontWeight="bold"
          color={theme.palette.primary.dark}
        >
          {t('title')}
        </Typography>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} dir="rtl">

        {fields.map((fld) => (
          <Controller
            key={fld.name}
            name={fld.name}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                label={fld.label}
                type={
                  fld.isPassword
                    ? visible[fld.name]
                      ? "text"
                      : "password"
                    : fld.type || "text"
                }
                autoComplete={fld.autoComplete}
                fullWidth
                margin="normal"
                error={!!errors[fld.name]}
                onChange={(e) => field.onChange(sanitizeInput(e.target.value))}
                helperText={errors[fld.name]?.message as string | undefined}
                inputProps={{
                  maxLength: fld.name === "name" ? 80 : 254,
                  inputMode: fld.name === "email" ? "email" : "text",
                  autoCapitalize: fld.name === "email" ? "none" : "sentences",
                  pattern:
                    fld.name === "name"
                      ? String.raw`^[\p{L}\p{M}\p{N} ._''\-]+$`
                      : undefined,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" aria-hidden>
                      <GradientIcon
                        Icon={fld.Icon}
                        size={22}
                        startColor={theme.palette.primary.dark}
                        endColor={theme.palette.primary.main}
                      />
                    </InputAdornment>
                  ),
                  ...(fld.isPassword &&
                    fld.showToggle !== false && {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              visible[fld.name]
                                ? "إخفاء كلمة المرور"
                                : "إظهار كلمة المرور"
                            }
                            aria-pressed={visible[fld.name] ? true : false}
                            onClick={() => toggleVisible(fld.name)}
                            edge="end"
                            tabIndex={-1}
                          >
                            {visible[fld.name] ? (
                              <GradientIcon
                                Icon={TfiEye}
                                size={18}
                                startColor={theme.palette.primary.dark}
                                endColor={theme.palette.primary.main}
                              />
                            ) : (
                              <GradientIcon
                                Icon={RiEyeCloseLine}
                                size={18}
                                startColor={theme.palette.primary.dark}
                                endColor={theme.palette.primary.main}
                              />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }),
                }}
              />
            )}
          />
        ))}

        <Box sx={{ mt: 3, position: "relative" }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              fontWeight: "bold",
            }}
          >
            {loading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "إنشاء حساب"
            )}
          </Button>
        </Box>

          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 2, color: "text.secondary" }}
          >
            {t('hasAccount')}{' '}
            <Link
              component={NextLink}
              href={loginHref}
              underline="hover"
              color="primary"
            >
              {t('loginLink')}
            </Link>
          </Typography>
      </Box>
    </AuthLayout>
  );
}
