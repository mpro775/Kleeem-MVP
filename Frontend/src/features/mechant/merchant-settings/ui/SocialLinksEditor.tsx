// src/components/merchant/SocialLinksEditor.tsx
import { Box, Stack, TextField, Typography } from "@mui/material";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import YouTubeIcon from "@mui/icons-material/YouTube";
import type { ChangeEvent, JSX } from "react";

type Platforms =
  | "facebook"
  | "twitter"
  | "instagram"
  | "linkedin"
  | "youtube";

const platforms: { key: Platforms; label: string; icon: JSX.Element }[] = [
  { key: "facebook", label: "فيسبوك", icon: <FacebookIcon color="primary" /> },
  { key: "twitter", label: "تويتر", icon: <TwitterIcon color="primary" /> },
  { key: "instagram", label: "انستجرام", icon: <InstagramIcon color="primary" /> },
  { key: "linkedin", label: "لينكدإن", icon: <LinkedInIcon color="primary" /> },
  { key: "youtube", label: "يوتيوب", icon: <YouTubeIcon color="primary" /> },
];

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

interface SocialLinksEditorProps {
  socialLinks: SocialLinks;
  onChange: (newLinks: SocialLinks) => void;
}

export default function SocialLinksEditor({ socialLinks, onChange }: SocialLinksEditorProps) {
  // دالة التغيير الموحدة
  const handleChange = (platform: Platforms) => (e: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...socialLinks,
      [platform]: e.target.value,
    });
  };

  return (
    <Box>
      <Typography fontWeight="bold" mb={2}>روابط السوشيال ميديا</Typography>
      <Stack spacing={2}>
        {platforms.map(({ key, label, icon }) => (
          <TextField
            key={key}
            label={label}
            value={socialLinks[key] ?? ""}
            onChange={handleChange(key)}
            InputProps={{
              startAdornment: icon,
            }}
            fullWidth
            placeholder={`رابط صفحة ${label}`}
            autoComplete="off"
          />
        ))}
      </Stack>
    </Box>
  );
}
