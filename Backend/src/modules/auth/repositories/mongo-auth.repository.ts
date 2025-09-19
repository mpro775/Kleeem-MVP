import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
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

  async findUserByEmailWithPassword(email: string) {
    return this.userModel
      .findOne({ email })
      .select('+password active merchantId emailVerified role firstLogin')
      .exec();
  }

  async findUserByEmailSelectId(email: string) {
    return this.userModel.findOne({ email }).select('_id').lean();
  }

  async findUserById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findUserByIdWithPassword(id: string) {
    return this.userModel.findById(id).select('+password').exec();
  }

  async saveUser(user: UserDocument) {
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
  }) {
    return this.tokenModel.create(data);
  }

  async latestEmailVerificationTokenByUser(userId: Types.ObjectId) {
    return this.tokenModel.findOne({ userId }).sort({ createdAt: -1 }).exec();
  }

  async deleteEmailVerificationTokensByUser(userId: Types.ObjectId) {
    await this.tokenModel.deleteMany({ userId });
  }

  // ===== Password reset tokens =====
  async createPasswordResetToken(data: {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prtModel.create(data);
  }

  async latestPasswordResetTokenByUser(
    userId: Types.ObjectId,
    onlyUnused = true,
  ) {
    const q: any = { userId };
    if (onlyUnused) q.used = false;
    return this.prtModel.findOne(q).sort({ createdAt: -1 }).exec();
  }

  async findLatestPasswordResetForUser(
    userId: Types.ObjectId,
    onlyUnused = true,
  ) {
    return this.latestPasswordResetTokenByUser(userId, onlyUnused);
  }

  async markPasswordResetTokenUsed(docId: Types.ObjectId) {
    await this.prtModel.updateOne({ _id: docId }, { $set: { used: true } });
  }

  async deleteOtherPasswordResetTokens(
    userId: Types.ObjectId,
    excludeId: Types.ObjectId,
  ) {
    await this.prtModel.deleteMany({ userId, _id: { $ne: excludeId } });
  }

  async deletePasswordResetTokensByUser(userId: Types.ObjectId) {
    await this.prtModel.deleteMany({ userId });
  }
}
