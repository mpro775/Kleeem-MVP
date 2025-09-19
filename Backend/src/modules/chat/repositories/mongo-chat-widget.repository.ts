import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatWidgetSettings,
  ChatWidgetSettingsDocument,
} from '../schema/chat-widget.schema';

@Injectable()
export class MongoChatWidgetRepository {
  constructor(
    @InjectModel(ChatWidgetSettings.name)
    private readonly widgetModel: Model<ChatWidgetSettingsDocument>,
  ) {}

  private toId(id: string | Types.ObjectId) {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  async findOneByMerchant(merchantId: string | Types.ObjectId) {
    return this.widgetModel
      .findOne({ merchantId: this.toId(merchantId) })
      .lean<ChatWidgetSettings>()
      .exec();
  }

  async createDefault(merchantId: string | Types.ObjectId) {
    const created = await this.widgetModel.create({
      merchantId: this.toId(merchantId),
    });
    return created.toObject() as ChatWidgetSettings;
  }

  async upsertAndReturn(
    merchantId: string | Types.ObjectId,
    setDoc: Partial<ChatWidgetSettings>,
  ) {
    const doc = await this.widgetModel
      .findOneAndUpdate(
        { merchantId: this.toId(merchantId) },
        { $set: setDoc },
        { new: true, upsert: true },
      )
      .lean<ChatWidgetSettings>()
      .exec();
    return doc as ChatWidgetSettings;
  }

  async setWidgetSlug(merchantId: string | Types.ObjectId, slug: string) {
    await this.widgetModel
      .findOneAndUpdate(
        { merchantId: this.toId(merchantId) },
        { widgetSlug: slug },
        { new: true, upsert: true },
      )
      .exec();
  }

  async existsByWidgetSlug(slug: string) {
    const x = await this.widgetModel.exists({ widgetSlug: slug });
    return !!x;
  }

  async findBySlugOrPublicSlug(slug: string) {
    return this.widgetModel
      .findOne({ $or: [{ widgetSlug: slug }, { publicSlug: slug }] })
      .lean<ChatWidgetSettings>()
      .exec();
  }

  // ===== جداول أخرى عبر نفس اتصال Mongoose =====
  async getStorefrontBrand(merchantId: string | Types.ObjectId) {
    const mId = this.toId(merchantId);
    const Storefront = this.widgetModel.db.model('Storefront');
    // نتوقع حقول brandDark/… حسب سكيمتك
    const sf = await Storefront.findOne({ merchant: mId })
      .select('brandDark')
      .lean<{ brandDark?: string }>()
      .exec();
    return sf ?? null;
  }

  async getMerchantPublicSlug(merchantId: string | Types.ObjectId) {
    const mId = this.toId(merchantId);
    const Merchant = this.widgetModel.db.model('Merchant');
    const doc = await Merchant.findById(mId)
      .select('publicSlug')
      .lean<{ publicSlug?: string }>()
      .exec();
    return (doc?.publicSlug ?? null) as string | null;
  }
}
