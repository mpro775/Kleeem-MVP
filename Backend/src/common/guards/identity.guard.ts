// src/common/guards/identity.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import { Model } from 'mongoose';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';
import {
  Merchant,
  MerchantDocument,
} from '../../modules/merchants/schemas/merchant.schema';

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const payload = req.user;
    if (!payload?.userId) throw new UnauthorizedException('Unauthorized');

    const user = await this.userModel
      .findById(payload.userId)
      .select('role emailVerified active merchantId')
      .lean();

    if (!user) throw new UnauthorizedException('الحساب غير موجود');

    req.authUser = {
      _id: user['_id'],
      role: user.role,
      emailVerified: !!user.emailVerified,
      active: user.active !== false,
      merchantId: user.merchantId ?? null,
    };

    if (user.merchantId) {
      const m = await this.merchantModel
        .findById(user.merchantId)
        .select('active deletedAt')
        .lean();
      req.authMerchant = m
        ? {
            _id: m['_id'],
            active: m.active !== false,
            deletedAt: m.deletedAt ?? null,
          }
        : null;
    } else {
      req.authMerchant = null;
    }

    return true;
  }
}
