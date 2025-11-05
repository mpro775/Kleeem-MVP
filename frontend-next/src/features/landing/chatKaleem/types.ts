export type ChatRole = 'user' | 'bot';

export type ChatMessage = {
  id: string;
  from: ChatRole;
  text: string;
  // index المرجعي لرسالة البوت في الـ backend إن وُجد (لاستخدامه في التقييم)
  rateIdx?: number;
  // عناصر قائمة اختيارية (للردود الغنية)
  listItems?: string[];
  // سؤال تأكيدي اختياري
  question?: string;
};