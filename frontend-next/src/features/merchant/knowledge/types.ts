export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Doc {
  _id: string;
  title: string;
  content: string;
  url?: string;
  enabled?: boolean;
  createdAt?: string;
}

export interface LinkItem {
  _id: string;
  title: string;
  url: string;
  description?: string;
  enabled?: boolean;
}

