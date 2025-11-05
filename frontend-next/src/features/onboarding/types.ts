export type BusinessType = 'store' | 'restaurant' | 'hotel' | 'pharmacy' | 'university' | 'school';
export type StoreCategory = 'clothing' | 'electronics' | 'accessories' | 'perfumes' | 'supermarket' | 'gifts' | 'other';
export type ProductSource = 'internal' | 'salla' | 'zid';

export interface IntegrationsStatus {
  productSource: ProductSource;
  skipped?: true;
  salla?: {
    active: boolean;
    connected: boolean;
    lastSync: string | null;
  };
  zid?: {
    active: boolean;
    connected: boolean;
    lastSync: string | null;
  };
}

export interface SyncResult {
  imported: number;
  updated: number;
}

