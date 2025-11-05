'use client';

// src/features/support/components/RecentTickets.tsx
import { useState, useEffect } from "react";
import { Stack, Typography } from "@mui/material";
import dayjs from "dayjs";

export const RecentTickets = ({ merchantId }: { merchantId: string }) => {
  const [items, setItems] = useState<
    { ticketNumber: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    if (!merchantId) return;
    const key = `kaleem:lastTickets:${merchantId}`;
    try {
      setItems(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      setItems([]);
    }
  }, [merchantId]);

  if (!items.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        لا توجد تذاكر حديثة.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {items.map((it) => (
        <Stack
          key={it.ticketNumber}
          direction="row"
          justifyContent="space-between"
        >
          <Typography fontFamily="monospace">{it.ticketNumber}</Typography>
          <Typography variant="body2" color="text.secondary">
            {dayjs(it.createdAt).format("YYYY/MM/DD")}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
};
