// src/pages/auth/ForgotPasswordPage.tsx
import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FaEnvelope } from "react-icons/fa";
import { requestPasswordResetAPI } from "@/auth/api";
import AuthLayout from "@/auth/AuthLayout";
import GradientIcon from "@/shared/ui/GradientIcon";
import { useErrorHandler } from "@/shared/errors";
import { useForm } from "react-hook-form";
import { Link as RouterLink } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const forbidsHtml = (v: string) => !/<[^>]*>/.test(v) && !/[<>]/.test(v);
const sanitize = (v: string) => v.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("بريد إلكتروني غير صحيح")
    .refine(forbidsHtml, "ممنوع إدخال وسوم HTML"),
});

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const theme = useTheme();
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      await requestPasswordResetAPI(data.email);
      setSent(true);
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title={
          <Typography
            variant="h4"
            fontWeight="bold"
            color={theme.palette.primary.dark}
          >
            تحقق من بريدك الإلكتروني
          </Typography>
        }
        subtitle={
          <Typography variant="body2" color="text.secondary">
            تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
          </Typography>
        }
      >
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="success.main" sx={{ mb: 3 }}>
            إن كان البريد صحيحًا فستصلك رسالة خلال لحظات.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            لم تصلك الرسالة؟ تحقق من مجلد الرسائل المزعجة أو جرب مرة أخرى.
          </Typography>
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
            color="primary"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        <Typography
          variant="h4"
          fontWeight="bold"
          color={theme.palette.primary.dark}
        >
          استعادة كلمة المرور
        </Typography>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary">
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
        </Typography>
      }
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
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
          sx={{ mb: 4 }}
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
            "أرسل رابط إعادة التعيين"
          )}
        </Button>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 3, color: "text.secondary" }}
        >
          تذكرت كلمة المرور؟{" "}
          <Link
            component={RouterLink}
            to="/login"
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
