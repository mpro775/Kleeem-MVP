// src/pages/auth/LoginPage.tsx
import { useState } from "react";
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
import { FaEnvelope, FaLock } from "react-icons/fa";
import { RiEyeCloseLine } from "react-icons/ri";
import { TfiEye } from "react-icons/tfi";
import { useAuth } from "@/context/AuthContext";
import { loginAPI } from "@/auth/api";
import { backendUserToUser } from "@/shared/utils/auth";
import AuthLayout from "@/auth/AuthLayout";
import GradientIcon from "@/shared/ui/GradientIcon";
import { useErrorHandler, applyServerFieldErrors } from "@/shared/errors";
import { useForm } from "react-hook-form";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const forbidsHtml = (v: string) => !/<[^>]*>/.test(v) && !/[<>]/.test(v);
const sanitize = (v: string) => v.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("بريد إلكتروني غير صحيح")
    .refine(forbidsHtml, "ممنوع إدخال وسوم HTML"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    // إن رغبت بمنع المسافات والرموز الخطرة:
    .refine((v) => !/\s/.test(v), "كلمة المرور لا يجب أن تحتوي مسافات")
    .refine((v) => !/[<>"'`\\]/.test(v), "ممنوع استخدام الرموز < > \" ' ` \\"),
});

type LoginFormData = z.infer<typeof LoginSchema>;
export default function LoginPage() {
  const theme = useTheme();
  const { login } = useAuth();
  const { handleError } = useErrorHandler();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const rawRedirect = params.get("redirect");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      setLoading(true);
      const { accessToken, user: backendUser } = await loginAPI(data.email, data.password);
      const user = backendUserToUser(backendUser);
      login(user, accessToken);
    } catch (err: unknown) {
      // إذا كان الخطأ يحتوي على أخطاء حقول، قم بتطبيقها
      if (err instanceof Error && "fields" in err) {
        applyServerFieldErrors(
          (err as { fields: Record<string, string[]> }).fields,
          setError
        );
      } else {
        // عرض رسالة خطأ عامة
        handleError(err);
      }
    } finally {
      setLoading(false);
    }
  };
  const signUpHref = rawRedirect
    ? `/signup?redirect=${encodeURIComponent(rawRedirect)}`
    : "/signup";
  return (
    <AuthLayout
      title={
        <Typography
          variant="h4"
          fontWeight="bold"
          color={theme.palette.primary.dark}
        >
          تسجيل الدخول
        </Typography>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary">
          سجّل دخولك وابدأ تجربة كليم الذكية!
        </Typography>
      }
    >
      <Box
        component="form"
        onSubmit={handleSubmit(handleLogin)}
        autoComplete="off"
        dir="rtl"
      >
        <TextField
          {...register("email", {
            required: "البريد الإلكتروني مطلوب",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "بريد إلكتروني غير صحيح",
            },
          })}
          label="البريد الإلكتروني"
          fullWidth
          sx={{ mb: 3 }}
          error={!!errors.email}
          onChange={(e) => {
            const v = sanitize(e.target.value);
            e.target.value = v;
          }}
          helperText={errors.email?.message || ""}
          inputProps={{
            inputMode: "email",
            autoCapitalize: "none",
            maxLength: 254,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" aria-hidden>
                <GradientIcon
                  Icon={FaEnvelope}
                  size={22}
                  startColor={theme.palette.primary.dark}
                  endColor={theme.palette.primary.main}
                />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          {...register("password", {
            required: "كلمة المرور مطلوبة",
            minLength: {
              value: 6,
              message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
            },
          })}
          onChange={(e) => {
            // لا نعدّل كلمة المرور (حتى لا نفسدها)، لكن إن رغبت بإزالة الوسوم فقط:
            const v = e.target.value
              .replace(/<[^>]*>/g, "")
              .replace(/[<>]/g, "");
            e.target.value = v;
          }}
          inputProps={{ maxLength: 128 }}
          label="كلمة المرور"
          type={showPassword ? "text" : "password"}
          fullWidth
          sx={{ mb: 4 }}
          error={!!errors.password}
          helperText={errors.password?.message || ""}
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" aria-hidden>
                <GradientIcon
                  Icon={FaLock}
                  size={22}
                  startColor={theme.palette.primary.dark}
                  endColor={theme.palette.primary.main}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((p) => !p)}
                  edge="end"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
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
          }}
        />

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
            "تسجيل الدخول"
          )}
        </Button>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 2, color: "text.secondary" }}
        >
          <Link
            component={RouterLink}
            to="/forgot-password"
            underline="hover"
            color="primary"
          >
            نسيت كلمة المرور؟
          </Link>
        </Typography>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 2, color: "text.secondary" }}
        >
          ليس لديك حساب؟{" "}
          <Link
            component={RouterLink}
            to={signUpHref}
            underline="hover"
            color="primary"
          >
            أنشئ حسابًا الآن
          </Link>{" "}
        </Typography>
      </Box>
    </AuthLayout>
  );
}
