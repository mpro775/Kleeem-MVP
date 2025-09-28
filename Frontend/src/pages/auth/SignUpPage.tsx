// src/pages/auth/SignUpPage.tsx
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TfiEye } from "react-icons/tfi";
import { RiEyeCloseLine } from "react-icons/ri";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import AuthLayout from "@/auth/AuthLayout";
import GradientIcon from "@/shared/ui/GradientIcon";
import { signUpAPI } from "@/auth/api";
import { useErrorHandler, applyServerFieldErrors } from "@/shared/errors";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { BackendUser, User } from "@/context/types";
import { backendUserToUser } from "@/shared/utils/auth";

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
  const theme = useTheme();
  const { setAuth } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const rawRedirect = params.get("redirect");

  const [visible, setVisible] = React.useState<
    Record<Path<SignUpData>, boolean>
  >({
    password: false,
    confirmPassword: false,
  } as Record<Path<SignUpData>, boolean>);
  const [loading, setLoading] = React.useState(false);
  const toggleVisible = (f: Path<SignUpData>) =>
    setVisible((v) => ({ ...v, [f]: !v[f] }));

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpData>({
    resolver: zodResolver(SignUpSchema),
  });

  const onSubmit = async ({
    name,
    email,
    password,
    confirmPassword,
  }: SignUpData) => {
    try {
      setLoading(true);
      const res = await signUpAPI(name, email, password, confirmPassword);
      // res: { accessToken?: string; user?: User }  ← نتعامل مع الحالتين

      const backendUser = (res as { user: BackendUser })?.user;
      const token = (res as { accessToken: string })?.accessToken;
      const emailVerified = !!backendUser?.emailVerified;

      if (!token || !emailVerified) {
        const pendingUser: User = backendUser
          ? backendUserToUser(backendUser)
          : {
              id: "", // لو السيرفر أعاد user.id استخدمه؛ غير ذلك اتركه مؤقتاً
              name,
              email,
              role: "MERCHANT",
              merchantId: null,
              firstLogin: true,
              emailVerified: false,
            };

        // خزّن البريد للمساعدة
        sessionStorage.setItem("pendingEmail", email);
        localStorage.setItem("pendingEmail", email);

        // ✅ أهم خطوة: غذِّ الـ Context والـ localStorage بصمت
        setAuth(pendingUser, token ?? "", { silent: true });

        // إلى صفحة التفعيل
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
          replace: true,
        });
        return;
      }

      // خلاف ذلك: حساب متحقق → دع AuthContext يقود التوجيه الذكي
      setAuth(backendUserToUser(backendUser), token); // لا تستدعِ navigate هنا
    } catch (err: unknown) {
      if (err instanceof Error && "fields" in err) {
        applyServerFieldErrors(
          (err as { fields: Record<string, string[]> }).fields,
          setError
        );
      } else {
        handleError(err);
      }
    } finally {
      setLoading(false);
    }
  };
  const loginHref = rawRedirect
    ? `/login?redirect=${encodeURIComponent(rawRedirect)}`
    : "/login";
  return (
    <AuthLayout
      title={
        <Typography
          variant="h4"
          fontWeight="bold"
          color={theme.palette.primary.dark}
        >
          إنشاء حساب جديد
        </Typography>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary">
          ابدأ رحلتك مع كليم وتمتع بتجربة ذكية وفريدة
        </Typography>
      }
    >
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
          لديك حساب بالفعل؟{" "}
          <Link
            component={RouterLink}
            to={loginHref}
            underline="hover"
            color="primary"
          >
            تسجيل الدخول
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}
