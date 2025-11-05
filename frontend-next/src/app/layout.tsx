import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'كليم - مساعد متاجر ذكي بالعربية',
  description:
    'كليم هو مساعد ذكاء اصطناعي عربي متخصص في إدارة المتاجر الإلكترونية',
  keywords: [
    'كليم',
    'مساعد متاجر',
    'ذكاء اصطناعي',
    'AI chatbot',
    'تجارة إلكترونية',
  ],
  authors: [{ name: 'كليم - Kleem' }],
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="ar" dir="rtl">
      <head>
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Cairo Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
