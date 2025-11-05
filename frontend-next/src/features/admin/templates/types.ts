export interface Template {
  _id: string;
  name: string;
  description?: string;
  content: string;
  type: 'message' | 'email' | 'notification';
  variables?: string[];
  isActive: boolean;
  createdAt: string;
}

