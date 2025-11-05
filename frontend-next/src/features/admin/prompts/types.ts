export interface Prompt {
  _id: string;
  name: string;
  content: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePromptDto {
  name: string;
  content: string;
  category?: string;
  isActive?: boolean;
}

