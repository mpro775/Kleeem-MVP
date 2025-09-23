import type { UserDocument } from '../../users/schemas/user.schema';
import type { EmailVerificationTokenDocument } from '../schemas/email-verification-token.schema';
import type { PasswordResetTokenDocument } from '../schemas/password-reset-token.schema';
import type { Types } from 'mongoose';

export interface AuthRepository {
  // Users
  createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    active: boolean;
    firstLogin: boolean;
    emailVerified: boolean;
  }): Promise<UserDocument>;
  findUserByEmailWithPassword(email: string): Promise<UserDocument | null>;
  findUserByEmailSelectId(
    email: string,
  ): Promise<Pick<UserDocument, '_id'> | null>;
  findUserById(id: string): Promise<UserDocument | null>;
  findUserByIdWithPassword(id: string): Promise<UserDocument | null>;
  saveUser(user: UserDocument): Promise<UserDocument>;

  // Merchants
  findMerchantBasicById(id: Types.ObjectId | string): Promise<{
    _id: Types.ObjectId;
    active?: boolean;
    deletedAt?: Date | null;
  } | null>;

  // Email verification tokens
  createEmailVerificationToken(data: {
    userId: Types.ObjectId;
    codeHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationTokenDocument>;
  latestEmailVerificationTokenByUser(
    userId: Types.ObjectId,
  ): Promise<EmailVerificationTokenDocument | null>;
  deleteEmailVerificationTokensByUser(userId: Types.ObjectId): Promise<void>;

  // Password reset tokens
  createPasswordResetToken(data: {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenDocument>;
  latestPasswordResetTokenByUser(
    userId: Types.ObjectId,
    onlyUnused?: boolean,
  ): Promise<PasswordResetTokenDocument | null>;
  findLatestPasswordResetForUser(
    userId: Types.ObjectId,
    onlyUnused?: boolean,
  ): Promise<PasswordResetTokenDocument | null>;
  markPasswordResetTokenUsed(docId: Types.ObjectId): Promise<void>;
  deleteOtherPasswordResetTokens(
    userId: Types.ObjectId,
    excludeId: Types.ObjectId,
  ): Promise<void>;
  deletePasswordResetTokensByUser(userId: Types.ObjectId): Promise<void>;
}
