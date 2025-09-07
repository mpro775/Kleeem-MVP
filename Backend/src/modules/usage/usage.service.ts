// src/modules/usage/usage.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsageCounter, UsageCounterDocument } from './schemas/usage-counter.schema';
import { PaymentRequiredException } from 'src/common/exceptions/payment-required.exception';
import { PlansService } from 'src/modules/plans/plans.service';
// لو عندك MerchantService؛ وإلا اجلب MerchantModel مباشرة
import { Merchant, MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UsageLimitResolver } from './usage-limit.resolver';

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(UsageCounter.name) private usageModel: Model<UsageCounterDocument>,
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private readonly plansService: PlansService,
    private readonly limitResolver: UsageLimitResolver,

    @InjectConnection() private readonly connection: Connection,
  ) {}
  monthKeyFrom(date = new Date()): string {
    const tzOffsetMs = 3 * 60 * 60 * 1000; // Asia/Aden +03
    const d = new Date(date.getTime() + tzOffsetMs);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private async getMerchantOrThrow(merchantId: string) {
    const m = await this.merchantModel.findById(merchantId).lean();
    if (!m) throw new NotFoundException('Merchant not found');
    return m;
  }

  async consumeMessages(merchantId: string, n = 1) {
    const monthKey = this.monthKeyFrom();
    const mId = new Types.ObjectId(merchantId);

    const merchant = await this.getMerchantOrThrow(merchantId);
    const { limit: messageLimit } = await this.limitResolver.resolveForMerchant(merchant);

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const doc = await this.usageModel.findOneAndUpdate(
        { merchantId: mId, monthKey },
        { $setOnInsert: { merchantId: mId, monthKey, messagesUsed: 0 } },
        { upsert: true, new: true, session },
      );

      if ((doc.messagesUsed + n) > messageLimit) {
        throw new PaymentRequiredException('تم استهلاك الحد الشهري للرسائل، فضلاً قم بالترقية.');
      }

      doc.messagesUsed += n;
      await doc.save({ session });

      await session.commitTransaction();
      return { monthKey, messagesUsed: doc.messagesUsed, limit: messageLimit };
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async getUsage(merchantId: string, monthKey?: string) {
    const key = monthKey ?? this.monthKeyFrom();
    const doc = await this.usageModel.findOne({ merchantId, monthKey: key }).lean();
    return doc ?? { merchantId, monthKey: key, messagesUsed: 0 };
  }
 

  async getPlanAndLimit(merchantId: string) {
    const merchant = await this.merchantModel.findById(merchantId).lean();
    if (!merchant) throw new NotFoundException('Merchant not found');

    // نتوقع وجود subscription.planId
    const planId = merchant.subscription?.planId;
    if (!planId) {
      // خيار: اعتبرها Free بحد أدنى أو Unlimited (حسب سياستك)
      return { plan: null, messageLimit: 0, isUnlimited: true };
    }
    const plan = await this.plansService.findById(String(planId));
    // إن لم يحدد plan.messageLimit => اعتبر غير محدود
    const isUnlimited = typeof plan.messageLimit !== 'number' || plan.messageLimit < 0;
    const messageLimit = isUnlimited ? Number.MAX_SAFE_INTEGER : plan.messageLimit!;
    return { plan, messageLimit, isUnlimited };
  }

 


  // لإعادة التعيين اليدوي (نادراً ما تحتاجها مع monthKey)
  async resetUsage(merchantId: string, monthKey?: string) {
    const key = monthKey ?? this.monthKeyFrom();
    await this.usageModel.updateOne(
      { merchantId, monthKey: key },
      { $set: { messagesUsed: 0 } },
      { upsert: true },
    );
    return this.getUsage(merchantId, key);
  }
}
