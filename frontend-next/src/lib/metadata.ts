import { Metadata } from 'next';

export const defaultMetadata: Metadata = {
  title: 'كليم - مساعد متاجر ذكي بالعربية',
  description:
    'كليم هو مساعد ذكاء اصطناعي عربي متخصص في إدارة المتاجر الإلكترونية. يتكامل مع Salla وZid وShopify وWooCommerce',
  keywords: [
    'كليم',
    'مساعد متاجر',
    'ذكاء اصطناعي',
    'AI chatbot',
    'تجارة إلكترونية',
    'Salla',
    'Zid',
    'Shopify',
    'WooCommerce',
  ],
  authors: [{ name: 'كليم - Kleem' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    url: 'https://kaleem-ai.com',
    siteName: 'كليم',
    title: 'كليم - مساعد متاجر ذكي بالعربية',
    description:
      'مساعد ذكاء اصطناعي عربي متخصص في إدارة المتاجر الإلكترونية',
    images: [
      {
        url: 'https://kaleem-ai.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'كليم - مساعد متاجر ذكي',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@kleem_ai',
    creator: '@kleem_ai',
    title: 'كليم - مساعد متاجر ذكي بالعربية',
    description:
      'بوت ذكاء اصطناعي عربي لإدارة المتاجر الإلكترونية',
    images: ['https://kaleem-ai.com/twitter-card.jpg'],
  },
};

export function generatePageMetadata(
  title: string,
  description: string,
  path = ''
): Metadata {
  return {
    title: `${title} - كليم`,
    description,
    openGraph: {
      ...defaultMetadata.openGraph,
      title,
      description,
      url: `https://kaleem-ai.com${path}`,
    },
    twitter: {
      ...defaultMetadata.twitter,
      title,
      description,
    },
  };
}

