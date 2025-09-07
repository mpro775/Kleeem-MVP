export const CONTACT_TOPIC_VALUES = [
  'sales',
  'support',
  'billing',
  'partnership',
] as const;
export type ContactTopic = (typeof CONTACT_TOPIC_VALUES)[number];

export const TICKET_STATUS_VALUES = [
  'open',
  'pending',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];
