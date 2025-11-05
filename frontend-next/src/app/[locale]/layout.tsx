import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import ThemeProvider from '@/providers/ThemeProvider';
import ReactQueryProvider from '@/providers/ReactQueryProvider';
import NotificationProvider from '@/providers/NotificationProvider';
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/lib/auth';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as typeof locales[number])) {
    notFound();
  }

  // Providing all messages to the client
  const messages = await getMessages();

  // Get current user from server-side (from cookies)
  const user = await getCurrentUser();

  return (
    <NextIntlClientProvider messages={messages}>
      <ReactQueryProvider>
        <ThemeProvider locale={locale}>
          <NotificationProvider>
            <AuthProvider initialUser={user}>
              <CartProvider>{children}</CartProvider>
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ReactQueryProvider>
    </NextIntlClientProvider>
  );
}

