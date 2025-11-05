import { Paper, Box, Typography, Button, Link as MuiLink } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTheme } from '@mui/material/styles';
import React from 'react';

export default function ContactMethodCard({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  const theme = useTheme();
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box aria-hidden>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography fontWeight={700}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
      </Box>
      <Button component={MuiLink} href={href} target="_blank" rel="noopener" variant="contained" endIcon={<OpenInNewIcon />} sx={{ borderRadius: 2 }}>
        تواصل
      </Button>
    </Paper>
  );
}