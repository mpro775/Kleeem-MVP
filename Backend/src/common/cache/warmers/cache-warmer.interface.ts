export interface CacheWarmer {
  /** اسم للتتبع في اللوج */
  readonly name: string;
  /** تنفيذ التسخين */
  warm(): Promise<void>;
}
