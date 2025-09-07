import { Box, Typography, Switch, Button, Stack, Chip } from "@mui/material";
import type { ReactNode } from "react";

type ChannelCardProps = {
  icon: ReactNode;
  title: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  onGuide: () => void;
  statusColor?: string;
  isLoading?: boolean;
  onCardClick?: () => void;
  disabled?: boolean;
};

export default function ChannelCard({
  icon,
  title,
  enabled,
  onToggle,
  onGuide,
  statusColor,
  isLoading,
  onCardClick,
  disabled,
}: ChannelCardProps) {
  return (
    <Box
      role={!disabled ? "button" : undefined}
      tabIndex={!disabled ? 0 : -1}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onCardClick?.();
        }
      }}
      onClick={disabled ? undefined : onCardClick}
      sx={{
        borderRadius: 5,
        background: "#fff",
        boxShadow: "0 2px 8px #00000014",
        p: { xs: 3, md: 4 },
        textAlign: "center",
        minWidth: 220,
        minHeight: 180,
        position: "relative",
        transition: "box-shadow .2s",
        opacity: disabled ? 0.6 : 1,
        "&:hover": disabled
          ? { boxShadow: "0 2px 8px #00000014", cursor: "not-allowed" }
          : { boxShadow: "0 4px 16px #00000022", cursor: "pointer" },
      }}
    >
      {disabled && (
        <Chip
          label="قريباً"
          color="warning"
          size="small"
          sx={{ position: "absolute", top: 12, left: 12, fontWeight: 700 }}
        />
      )}
      <Stack alignItems="center" spacing={2}>
        <Box sx={{ fontSize: 44, color: statusColor || "primary.main" }}>{icon}</Box>
        <Typography variant="h6" fontWeight={700} sx={{ textAlign: 'center' }}>
          {title}
        </Typography>
        <Switch
          checked={enabled}
          onChange={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle(e.target.checked);
          }}
          disabled={isLoading || !!disabled}
        />
        <Button
          variant="text"
          size="small"
          disabled={!!disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onGuide();
          }}
        >
تفاصيل        </Button>
      </Stack>
    </Box>
  );
}
