// src/features/mechant/settings-advanced/components/SecuritySettings.tsx
import { useState } from "react";
import { Paper, Typography, TextField, Button, Grid } from "@mui/material";

interface Props {
  onChangePassword: (passwords: Record<string, string>) => void;
  isSaving: boolean;
}

export const SecuritySettings = ({ onChangePassword, isSaving }: Props) => {
  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  const handleChange = (field: string, value: string) => {
    setPasswords((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = () => {
    onChangePassword({
      currentPassword: passwords.current,
      newPassword: passwords.newPass,
      confirmNewPassword: passwords.confirm,
    });
    // Clear fields on success if onChangePassword returns a promise that resolves
    // For simplicity, we can let the parent hook handle this if needed.
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        الأمان
      </Typography>
      <Grid container spacing={2}>
        <Grid  size={{xs: 12, md: 4}}>
          <TextField
            type="password"
            label="كلمة المرور الحالية"
            value={passwords.current}
            onChange={(e) => handleChange("current", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid  size={{xs: 12, md: 4}}>
          <TextField
            type="password"
            label="كلمة المرور الجديدة"
            value={passwords.newPass}
            onChange={(e) => handleChange("newPass", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid  size={{xs: 12, md: 4}}>
          <TextField
            type="password"
            label="تأكيد كلمة المرور الجديدة"
            value={passwords.confirm}
            onChange={(e) => handleChange("confirm", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid  size={{xs: 12, md: 4}} display="flex" gap={1} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "جارٍ التغيير…" : "تغيير كلمة المرور"}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};
