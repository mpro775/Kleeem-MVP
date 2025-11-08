declare global {
  interface ImportMetaEnv {
    readonly VITE_DEMO_MERCHANT_SLUG_OR_ID?: string;
    readonly VITE_PUBLIC_WIDGET_HOST?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};

