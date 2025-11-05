export interface User {
  id: string;
  name: string;
  email: string;
  role: 'MERCHANT' | 'ADMIN' | 'MEMBER';
  merchantId?: string | null;
}

