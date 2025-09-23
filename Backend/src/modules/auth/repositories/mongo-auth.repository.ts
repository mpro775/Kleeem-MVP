import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';

import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument,
} from '../schemas/email-verification-token.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from '../schemas/password-reset-token.schema';

import { AuthRepository } from './auth.repository';

@Injectable()
export class MongoAuthRepository implements AuthRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    @InjectModel(EmailVerificationToken.name)
    private readonly tokenModel: Model<EmailVerificationTokenDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly prtModel: Model<PasswordResetTokenDocument>,
  ) {}

  // ===== Users =====
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    active: boolean;
    firstLogin: boolean;
    emailVerified: boolean;
  }): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findUserByEmailWithPassword(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password active merchantId emailVerified role firstLogin')
      .exec();
  }

  async findUserByEmailSelectId(
    email: string,
  ): Promise<Pick<UserDocument, '_id'> | null> {
    return this.userModel.findOne({ email }).select('_id').lean();
  }

  async findUserById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findUserByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+password').exec();
  }

  async saveUser(user: UserDocument): Promise<UserDocument> {
    return user.save();
  }

  // ===== Merchants =====
  async findMerchantBasicById(id: Types.ObjectId | string): Promise<{
    _id: Types.ObjectId;
    active?: boolean;
    deletedAt?: Date | null;
  } | null> {
    const _id = typeof id === 'string' ? new Types.ObjectId(id) : id;
    return this.merchantModel
      .findById(_id)
      .select('_id active deletedAt')
      .lean() as Promise<{
      _id: Types.ObjectId;
      active?: boolean;
      deletedAt?: Date | null;
    } | null>;
  }

  // ===== Email verification tokens =====
  async createEmailVerificationToken(data: {
    userId: Types.ObjectId;
    codeHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationTokenDocument> {
    return this.tokenModel.create(data);
  }

  async latestEmailVerificationTokenByUser(
    userId: Types.ObjectId,
  ): Promise<EmailVerificationTokenDocument | null> {
    return this.tokenModel.findOne({ userId }).sort({ createdAt: -1 }).exec();
  }

  async deleteEmailVerificationTokensByUser(
    userId: Types.ObjectId,
  ): Promise<void> {
    await this.tokenModel.deleteMany({ userId });
  }

  // ===== Password reset tokens =====
  async createPasswordResetToken(data: {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenDocument> {
    return this.prtModel.create(data);
  }

  async latestPasswordResetTokenByUser(
    userId: Types.ObjectId,
    onlyUnused = true,
  ): Promise<PasswordResetTokenDocument | null> {
    const q: RootFilterQuery<PasswordResetTokenDocument> = { userId };
    if (onlyUnused) q.used = false;
    return this.prtModel.findOne(q).sort({ createdAt: -1 }).exec();
  }

  async findLatestPasswordResetForUser(
    userId: Types.ObjectId,
    onlyUnused = true,
  ): Promise<PasswordResetTokenDocument | null> {
    return this.latestPasswordResetTokenByUser(userId, onlyUnused);
  }

  async markPasswordResetTokenUsed(docId: Types.ObjectId): Promise<void> {
    await this.prtModel.updateOne({ _id: docId }, { $set: { used: true } });
  }

  async deleteOtherPasswordResetTokens(
    userId: Types.ObjectId,
    excludeId: Types.ObjectId,
  ): Promise<void> {
    await this.prtModel.deleteMany({ userId, _id: { $ne: excludeId } });
  }

  async deletePasswordResetTokensByUser(userId: Types.ObjectId): Promise<void> {
    await this.prtModel.deleteMany({ userId });
  }
}
