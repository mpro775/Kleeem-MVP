// src/global.d.ts

declare module '*.css';
declare module '*.scss';

declare module 'swiper/css';
declare module 'swiper/css/pagination';
declare module 'swiper/css/navigation';
declare module 'swiper/css/scrollbar';

declare global {
  interface Window {
    MusaidChat?: {
      merchantId: string;
      apiBaseUrl: string;
      mode?: 'bubble' | 'iframe' | 'bar' | 'conversational';
    };
  }
}
