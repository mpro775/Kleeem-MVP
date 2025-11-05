// Category types
export interface Category {
  _id: string;
  merchantId: string;
  name: string;
  slug: string;
  path: string;
  parent?: string | null;
  image?: string;
  keywords?: string[];
  ancestors: string[];
  depth: number;
  order: number;
}

export interface CategoryNode extends Category {
  children?: CategoryNode[];
}

