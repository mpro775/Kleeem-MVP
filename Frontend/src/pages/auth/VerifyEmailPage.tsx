// src/pages/auth/VerifyEmailPage.tsx
import { Box, Button, Typography, CircularProgress, Link } from "@mui/material";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useTheme } from "@mui/material/styles";
import AuthLayout from "@/auth/AuthLayout";
import OtpInputBoxes from "@/shared/ui/OtpInputBoxes";
import { useAuth } from "@/context/hooks";
import { resendVerificationAPI, verifyEmailAPI } from "@/auth/api";
import { getAxiosMessage } from "@/shared/lib/errors";
import { backendUserToUser } from "@/shared/utils/auth";

export default function VerifyEmailPage() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialCode = params.get("code") ?? "";
  const { user, setAuth } = useAuth();
  const emailParam = params.get("email");
  const codeParam = params.get("code");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    const run = async () => {
      if (emailParam && codeParam && codeParam.length === 6) {
        try {
          // verifyEmailAPI يرجّع { accessToken, user: BackendUser }
          const { user: backendUser, accessToken } = await verifyEmailAPI(
            emailParam,
            codeParam
          );
          const freshUser = backendUserToUser(backendUser);
          setAuth(
            { ...freshUser, emailVerified: true, firstLogin: true },
            accessToken
          );
          // setAuth يوجّه تلقائيًا للأونبوردنج لما firstLogin=true
        } catch (e) {
          toast.error(getAxiosMessage(e, "تعذر تفعيل الحساب"));
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam, codeParam]);
  const verify = async (verificationCode: string) => {
    try {
      setLoading(true);
      const email =
        user?.email ||
        localStorage.getItem("pendingEmail") ||
        sessionStorage.getItem("pendingEmail") ||
        "";

      const { user: backendUser, accessToken } = await verifyEmailAPI(
        email,
        verificationCode
      );

      const freshUser = backendUserToUser(backendUser);

      // 👈 ثبّت الجلسة فورًا (سيحدّث context + localStorage ويقود التوجيه)
      setAuth(
        { ...freshUser, emailVerified: true, firstLogin: true },
        accessToken,
        { silent: false } // اسمح للتوجيه الذكي يوصلك للأونبوردنج
      );
      toast.success("✔️ تم تفعيل حسابك بنجاح");
      setSuccess(true);
      let counter = 5;
      setCountdown(counter);
      const t = setInterval(() => {
        counter -= 1;
        setCountdown(counter);
        if (counter <= 0) {
          clearInterval(t);
          navigate("/onboarding", { replace: true });
        }
      }, 1000);
    } catch (err) {
      toast.error(getAxiosMessage(err, "حدث خطأ غير متوقع"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode.length === 6) verify(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const handleSubmit = () => {
    if (code.trim().length === 6) verify(code.trim());
    else toast.warn("الرجاء إدخال رمز مكون من 6 أرقام");
  };

  const handleResendCode = async () => {
    if (!user?.email) return toast.error("لا يوجد عنوان بريد مسجّل");
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      await resendVerificationAPI(user.email);
      toast.success("📧 تم إعادة إرسال كود التفعيل إلى بريدك");
      setResendCooldown(60);
      const t = setInterval(
        () =>
          setResendCooldown((s) => {
            if (s <= 1) {
              clearInterval(t);
              return 0;
            }
            return s - 1;
          }),
        1000
      );
    } catch (err) {
      toast.error(getAxiosMessage(err, "❌ فشل في إعادة إرسال الكود"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={
        <Typography
          variant="h4"
          fontWeight="bold"
          color={theme.palette.primary.dark}
        >
          تفعيل الحساب
        </Typography>
      }
      subtitle={
        <Typography variant="body1" color="text.secondary">
          أدخل رمز التفعيل المكون من 6 أرقام المرسَل إلى بريدك
        </Typography>
      }
    >
      {!success ? (
        <>
          <OtpInputBoxes
            value={code}
            onChange={(v) => setCode(v.slice(0, 6))}
            disabled={loading}
            autoFocus
            onComplete={(v) => {
              setCode(v);
              verify(v);
            }}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{
              fontWeight: "bold",
              py: 1.4,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              boxShadow: "0 3px 12px 0 rgba(80,46,145,0.13)",
              mt: 3,
            }}
            disabled={loading || code.trim().length !== 6}
            onClick={handleSubmit}
          >
            {loading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "تفعيل الحساب"
            )}
          </Button>

          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 2 }}
          >
            <Link
              component="button"
              onClick={handleResendCode}
              disabled={loading}
              sx={{
                color: theme.palette.primary.dark,
                fontWeight: "bold",
                fontSize: 15,
              }}
            >
              {resendCooldown
                ? `إعادة الإرسال خلال ${resendCooldown}s`
                : "إعادة إرسال الكود"}
            </Link>
            <span style={{ color: "#A498CB" }}>|</span>
            <Link
              component="button"
              onClick={() => navigate("/login")}
              sx={{
                color: theme.palette.primary.dark,
                fontWeight: "bold",
                fontSize: 15,
              }}
            >
              تسجيل الدخول
            </Link>
          </Box>
          <Typography
            variant="body2"
            sx={{ mt: 3, color: "#8589A0", fontSize: 13 }}
          >
            لم تستلم الكود؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)
          </Typography>
        </>
      ) : (
        <Box sx={{ my: 3, textAlign: "center" }}>
          <CheckCircleOutlineIcon
            color="success"
            sx={{ fontSize: 60, mb: 2 }}
          />
          <Typography variant="h6" sx={{ color: "success.main", mb: 1 }}>
            تم تفعيل حسابك بنجاح!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            سيتم تحويلك تلقائيًا خلال {countdown} ثانية
          </Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/onboarding")}
            sx={{ mt: 3, fontWeight: "bold", py: 1.4, borderRadius: 2 }}
          >
            الانتقال الآن
          </Button>
        </Box>
      )}
    </AuthLayout>
  );
}
