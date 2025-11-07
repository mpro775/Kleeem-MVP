'use client';

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface CountdownTimerProps {
  endDate: string | Date;
  onExpire?: () => void;
}

export function CountdownTimer({ endDate, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('انتهى');
        setExpired(true);
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days} يوم ${hours} ساعة`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} ساعة ${minutes} دقيقة`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes} دقيقة ${seconds} ثانية`);
      } else {
        setTimeLeft(`${seconds} ثانية`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        color: expired ? 'error.main' : 'warning.main',
        fontWeight: 'bold',
      }}
    >
      <AccessTimeIcon fontSize="small" />
      <Typography variant="body2" sx={{ fontWeight: 'inherit' }}>
        {timeLeft}
      </Typography>
    </Box>
  );
}

