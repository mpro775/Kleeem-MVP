import type { ChatMessage } from "./types";

export const KLEEM_COLORS = {
    primary: '#563fa6',
    primaryHover: '#4a3594',
    userBubble: '#f0f0f0',
  };
  
  // رسائل ديمو أولية (تعرض عندما لا يكون الشات حيًا)
  export const DEMO_MESSAGES: ChatMessage[] = [
    { id: 'm1', from: 'user', text: 'السلام عليكم. هل عندكم عطر رجالي مناسب للصيف؟' },
    {
      id: 'm2', from: 'bot', text: 'وعليكم السلام! نعم بالتأكيد. أنصحك بـ:',
      listItems: ['عطر Summer Breeze', 'عطر Ocean Oud'],
      question: 'هل تود الطلب الآن؟',
    },
    { id: 'm3', from: 'user', text: 'كم سعر عطر Summer Breeze' },
    { id: 'm4', from: 'bot', text: '...', rateIdx: 9999 }, // placeholder لعرض التحميل
  ];