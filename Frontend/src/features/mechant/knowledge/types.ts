// src/features/knowledge/types.ts
export const ACCEPTED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx"] as const;
export const MAX_SIZE_MB = 5;
export const MAX_FILES = 5;

export type Doc = {
  _id: string;
  filename: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  fileType?: string;
};

export type LinkItem = {
  _id: string;
  url: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
};

export type FaqItem = {
  _id: string;
  question: string;
  answer: string;
  createdAt?: string;
};
