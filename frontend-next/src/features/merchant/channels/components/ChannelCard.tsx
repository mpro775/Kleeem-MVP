'use client';

import { Box, Typography, Switch, Button, Stack, Chip, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';

interface ChannelCardProps {
  icon: ReactNode;
  title: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  onDetails: () => void;
  statusColor?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function ChannelCard({
  icon,
  title,
  enabled,
  onToggle,
  onDetails,
  statusColor,
  isLoading,
  disabled,
  onClick,
}: ChannelCardProps) {
  return (
    <Box
      role={!disabled ? 'button' : undefined}
      tabIndex={!disabled ? 0 : -1}
      onClick={disabled ? undefined : onClick}
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        p: 3,
        textAlign: 'center',
        minHeight: 200,
        position: 'relative',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        '&:hover': {
          boxShadow: disabled ? 0 : 4,
          borderColor: disabled ? 'divider' : 'primary.main',
        },
      }}
    >
      {disabled && (
        <Chip
          label="قريباً"
          color="warning"
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 700 }}
        />
      )}
      
      <Stack alignItems="center" spacing={2}>
        <Box sx={{ fontSize: 48, color: statusColor || 'primary.main' }}>
          {isLoading ? <CircularProgress size={48} /> : icon}
        </Box>
        
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        
        <Switch
          checked={enabled}
          onChange={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle(e.target.checked);
          }}
          disabled={isLoading || disabled}
        />
        
        <Button
          variant="text"
          size="small"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onDetails();
          }}
        >
          تفاصيل
        </Button>
      </Stack>
    </Box>
  );
}

