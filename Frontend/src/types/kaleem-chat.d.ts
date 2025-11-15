// src/types/kaleem-chat.d.ts
export {};

declare global {
  interface Window {
    KaleemChat?: {
      open: () => void;
      close?: () => void;
      toggle?: () => void;

      on?: (
        event: 'ready' | 'open' | 'close' | 'message' | 'error',
        handler: (...args: any[]) => void
      ) => void;
      off?: (event: string, handler: (...args: any[]) => void) => void;

      setMerchant?: (merchantId: string) => void;
      setSession?: (sessionId: string) => void;
      send?: (text: string) => void;
    };
  }
}