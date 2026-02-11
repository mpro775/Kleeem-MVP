// src/features/mechant/settings-advanced/components/ProfileSettings.tsx
import { Paper, Typography, TextField, Button, Grid } from "@mui/material";
import type { UserProfile } from "../types";

interface Props {
  profile: UserProfile;
  onProfileChange: (field: keyof UserProfile, value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const ProfileSettings = ({ profile, onProfileChange, onSave, isSaving }: Props) => (
  <Paper sx={{ p: { xs: 2, md: 3 } }}>
    <Typography variant="h6" sx={{ mb: 2 }}>معلوماتي</Typography>
    <Grid container spacing={2}>
      <Grid  size={{xs: 12, md: 4}}>
        <TextField
          label="الاسم الكامل"
          value={profile.name}
          onChange={(e) => onProfileChange('name', e.target.value)}
          fullWidth
        />
      </Grid>
      <Grid  size={{xs: 12, md: 4}}>
         <TextField
          label="رقم الهاتف"
          value={profile.phone ?? ""}
          onChange={(e) => onProfileChange('phone', e.target.value)}
          fullWidth
        />
      </Grid>
      <Grid  size={{xs: 12, md: 4}}>
        <TextField label="البريد الإلكتروني" value={profile.email} fullWidth disabled />
      </Grid>
      <Grid  size={{xs: 12, md: 4}} display="flex" justifyContent="flex-end">
        <Button variant="contained" onClick={onSave} disabled={isSaving}>
          {isSaving ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </Grid>
    </Grid>
  </Paper>
);