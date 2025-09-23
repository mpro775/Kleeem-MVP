export interface MerchantProfile {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  cachedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface ProductsList {
  items: Product[];
  meta: { total: number; hasMore: boolean };
  merchantId: string;
  cachedAt: Date;
}

export interface PopularProducts {
  items: Product[];
  merchantId: string;
  cachedAt: Date;
}

export interface Category {
  id: string;
  name: string;
}

export interface MerchantCategories {
  categories: Category[];
  merchantId: string;
  cachedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
}

export interface ActivePlans {
  plans: Plan[];
  cachedAt: Date;
}
