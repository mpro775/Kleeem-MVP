// src/vector/collections.ts
export const Collections = {
  Products: 'products',
  Offers: 'offers',
  FAQs: 'faqs',
  Documents: 'documents',
  Web: 'web_knowledge',
  BotFAQs: 'bot_faqs',
} as const;

export const Namespaces = {
  Product: 'd94a5f5a-2bfc-4c2d-9f10-1234567890ab',
  FAQ: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  Web: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
} as const;
