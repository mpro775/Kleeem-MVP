// src/features/landing/chatKaleem/hooks/useLiveChat.ts
import { useState, useEffect, useCallback, type RefObject } from 'react';
import { chatService } from '../chatService';
import type { ChatMessage } from '../types';
import { sendKleemMessage } from '@/features/kaleem/api';
import { getKleemSessionId } from '@/features/kaleem/helper';

export const useLiveChat = (containerRef: RefObject<HTMLDivElement>) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'hello', from: 'bot', text: '👋 مرحباً! أنا كليم. كيف يمكنني مساعدتك؟' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // إدارة الاتصال
  useEffect(() => {
    chatService.connect();
    
    chatService.onMessage(newMessage => {
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false); // أوقف "يكتب الآن" عند وصول الرد
    });
    
    chatService.onTyping(status => {
      setIsTyping(status);
    });

    return () => {
      chatService.disconnect();
    };
  }, []);

  // إدارة التمرير للأسفل
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, containerRef]);

  const handleSend = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), from: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // إرسال الرسالة عبر HTTP كما في الكود الأصلي
      await sendKleemMessage(text, { sessionId: getKleemSessionId() });
      // السيرفر سيرسل الرد عبر WebSocket وسيتم التقاطه بواسطة onMessage
    } catch  {
      const errorMsg: ChatMessage = { id: crypto.randomUUID(), from: 'bot', text: 'عفوًا، حدث خطأ. يرجى المحاولة لاحقًا.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // يمكنك إضافة handleRate هنا بنفس الطريقة
  
  return { messages, isTyping, isLoading, handleSend };
};