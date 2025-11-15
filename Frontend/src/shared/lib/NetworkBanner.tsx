// src/components/common/NetworkBanner.tsx
import { Alert } from '@mui/material';
import { useEffect, useState } from 'react';

export function NetworkBanner() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return <Alert severity="warning">لا يوجد اتصال بالإنترنت</Alert>;
}
