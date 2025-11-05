import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ar';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that the incoming `locale` is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Load all translation files
  const [
    common,
    landing,
    auth,
    dashboard,
    products,
    orders,
    conversations,
    knowledge,
    analytics,
    leads,
    channels,
    onboarding,
    admin,
  ] = await Promise.all([
    import(`./messages/${locale}/common.json`),
    import(`./messages/${locale}/landing.json`),
    import(`./messages/${locale}/auth.json`),
    import(`./messages/${locale}/dashboard.json`),
    import(`./messages/${locale}/products.json`),
    import(`./messages/${locale}/orders.json`),
    import(`./messages/${locale}/conversations.json`),
    import(`./messages/${locale}/knowledge.json`),
    import(`./messages/${locale}/analytics.json`),
    import(`./messages/${locale}/leads.json`),
    import(`./messages/${locale}/channels.json`),
    import(`./messages/${locale}/onboarding.json`),
    import(`./messages/${locale}/admin.json`),
  ]);

  const messages = {
    ...common.default,
    landing: landing.default,
    auth: auth.default,
    dashboard: dashboard.default,
    products: products.default,
    orders: orders.default,
    conversations: conversations.default,
    knowledge: knowledge.default,
    analytics: analytics.default,
    leads: leads.default,
    channels: channels.default,
    onboarding: onboarding.default,
    admin: admin.default,
  };

  return {
    locale,
    messages,
    timeZone: 'Asia/Riyadh',
    now: new Date(),
  };
});

