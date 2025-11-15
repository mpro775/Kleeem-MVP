// src/pages/auth/ResetPasswordPage.tsx
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordAPI, validatePasswordResetTokenAPI } from "@/auth/api";
import AuthLayout from "@/auth/AuthLayout";
import { CircularProgress, TextField } from "@mui/material";
import { Typography, Button } from "@mui/material";
import { Box } from "@mui/system";

const Schema = z
  .object({
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .refine((v) => !/\s/.test(v), "لا يسمح بالمسافات")
      .refine(
        (v) => !/[<>"'`\\]/.test(v),
        "ممنوع استخدام الرموز < > \" ' ` \\"
      ),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "كلمتا المرور غير متطابقتين",
  });
type Form = z.infer<typeof Schema>;

export default function ResetPasswordPage() {
  const [sp] = useSearchParams();
  const email = (sp.get("email") || "").toLowerCase();
  const token = sp.get("token") || "";
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const ok = await validatePasswordResetTokenAPI(email, token);
        if (!ignore) {
          setValid(ok);
          setChecking(false);
        }
      } catch {
        setValid(false);
        setChecking(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [email, token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Form>({ resolver: zodResolver(Schema) });

  const onSubmit = async ({ password, confirm }: Form) => {
    try {
      await resetPasswordAPI(email, token, password, confirm);
      navigate("/login?reset=success", { replace: true });
    } catch {
      // لو رجّعت 400 برسالة "منتهٍ" أو "غير صالح"، اعرض رسالة:
      setError("confirm", { message: "رابط إعادة التعيين غير صالح أو منتهي." });
    }
  };

  if (checking)
    return (
      <AuthLayout title="التحقق...">
        <CircularProgress />
      </AuthLayout>
    );
  if (!valid)
    return (
      <AuthLayout title="رابط غير صالح">
        <Typography color="error.main">الرابط غير صالح أو منتهي.</Typography>
      </AuthLayout>
    );

  return (
    <AuthLayout title="تعيين كلمة مرور جديدة">
      <Box component="form" onSubmit={handleSubmit(onSubmit)} dir="rtl">
        <TextField
          {...register("password")}
          label="كلمة المرور الجديدة"
          type="password"
          error={!!errors.password}
          helperText={errors.password?.message || ""}
          fullWidth
          sx={{ mb: 3 }}
        />
        <TextField
          {...register("confirm")}
          label="تأكيد كلمة المرور"
          type="password"
          error={!!errors.confirm}
          helperText={errors.confirm?.message || ""}
          fullWidth
          sx={{ mb: 4 }}
        />
        <Button type="submit" variant="contained" fullWidth>
          حفظ
        </Button>
      </Box>
    </AuthLayout>
  );
}
