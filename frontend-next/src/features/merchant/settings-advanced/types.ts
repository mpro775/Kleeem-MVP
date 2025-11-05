export type Digest = 'off' | 'daily' | 'weekly';
export type ProductSource = 'internal' | 'salla' | 'zid';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'MERCHANT' | 'ADMIN' | 'MEMBER';
  merchantId?: string | null;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}

export interface NotificationsPrefs {
  channels: { inApp: boolean; email: boolean; telegram?: boolean; whatsapp?: boolean };
  topics: { syncFailed: boolean; syncCompleted: boolean; webhookFailed: boolean; embeddingsCompleted: boolean; missingResponsesDigest: Digest };
  quietHours: { enabled: boolean; start?: string; end?: string; timezone?: string };
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ConfirmPasswordPayload {
  confirmPassword: string;
}
