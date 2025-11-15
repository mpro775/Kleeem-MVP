// src/features/leads/types.ts
export type FieldType = "name" | "email" | "phone" | "address" | "custom";

export interface LeadField {
  key: string;
  fieldType: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface Lead {
  _id: string;
  sessionId: string;
  data: Record<string, unknown>;
  createdAt: string;
  source?: string;
  phoneNormalized?: string; // إن موجودة
  name?: string;            // إن موجودة
}

export interface LeadsSettings {
  enabled: boolean;
  fields: LeadField[];
}
