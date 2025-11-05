'use client';

import { SnackbarProvider } from 'notistack';

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      autoHideDuration={3500}
    >
      {children}
    </SnackbarProvider>
  );
}

