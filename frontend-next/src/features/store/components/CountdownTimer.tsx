'use client';

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { AccessTime } from '@mui/icons-material';

interface CountdownTimerProps {
  endDate: string | Date;
  showIcon?: boolean;
}

export function CountdownTimer({
  endDate,
  showIcon = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setExpired(true);
        setTimeLeft('انتهى العرض');
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
        setTimeLeft(
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`
        );
      } else {
        setTimeLeft(
          `${minutes}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={0.5}
      sx={{
        color: expired ? 'text.disabled' : 'error.main',
        fontWeight: 'bold',
        fontSize: '0.9rem',
      }}
    >
      {showIcon && <AccessTime fontSize="small" />}
      <Typography variant="body2" component="span">
        {timeLeft}
      </Typography>
    </Box>
  );
}

