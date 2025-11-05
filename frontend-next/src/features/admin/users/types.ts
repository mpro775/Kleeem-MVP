export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'merchant' | 'user';
  isActive: boolean;
  merchantId?: string;
  createdAt: string;
  lastLogin?: string;
}

