export type FieldType = 'name' | 'email' | 'phone' | 'custom';

export interface LeadField {
  key: string;
  fieldType: FieldType;
  label: string;
  required?: boolean;
}

export interface Lead {
  _id: string;
  merchant: string;
  sessionId: string;
  data: Record<string, any>;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeadsSettings {
  enabled: boolean;
  fields: LeadField[];
}

