// src/modules/public/public-router.controller.ts
import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Model, Types } from 'mongoose';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import {
  ChatWidgetSettings,
  ChatWidgetSettingsDocument,
} from '../chat/schema/chat-widget.schema';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import {
  Storefront,
  StorefrontDocument,
} from '../storefront/schemas/storefront.schema';

@ApiTags('Public Router')
@UseGuards(JwtAuthGuard)
@Controller('public')
export class PublicRouterController {
  constructor(
    @InjectModel(Merchant.name) private merchants: Model<MerchantDocument>,
    @InjectModel(ChatWidgetSettings.name)
    private widgets: Model<ChatWidgetSettingsDocument>,
    @InjectModel(Storefront.name) private stores: Model<StorefrontDocument>,
  ) {}

  private async resolve(slug: string) {
    const m = await this.merchants
      .findOne({ publicSlug: slug, publicSlugEnabled: true })
      .select('_id name publicSlug')
      .lean<{ _id: Types.ObjectId; name: string; publicSlug: string }>();

    if (!m) throw new NotFoundException('Merchant slug not found or disabled');
    return { merchant: m };
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Resolve slug',
    description: 'معلومات عامة وروابط جاهزة',
  })
  async getSummary(@Param('slug') slug: string): Promise<{
    merchant: { id: Types.ObjectId; name: string; slug: string };
    urls: { store: string; chat: string; legacyStore: string };
    embedModes: string[];
    theme: { primaryColor?: string; secondaryColor?: string };
  }> {
    const { merchant } = await this.resolve(slug);

    // اجلب/أنشئ المتجر والودجت حتى يكون عندك بيانات أكيدة للعرض
    const [store, widget] = await Promise.all([
      this.stores
        .findOneAndUpdate(
          {
            $or: [
              { merchant: merchant._id },
              { merchant: String(merchant._id) },
            ],
          }, // دفاعي لو خُزّن كسلسلة
          {
            $setOnInsert: {
              merchant: merchant._id,
              slug: merchant.publicSlug, // لأن pre('save') لا يعمل مع findOneAndUpdate
              primaryColor: '#FF8500',
              secondaryColor: '#2575fc',
              buttonStyle: 'rounded',
              brandDark: '#111827',
              banners: [],
              featuredProductIds: [],
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        )
        .lean<Storefront & { _id: Types.ObjectId }>(),

      this.widgets
        .findOneAndUpdate(
          { merchantId: String(merchant._id) },
          {
            $setOnInsert: {
              merchantId: String(merchant._id),
              widgetSlug: merchant.publicSlug, // لأن pre('save') لا يعمل مع findOneAndUpdate
              embedMode: 'bubble',
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        )
        .lean<ChatWidgetSettings & { _id: Types.ObjectId }>(),
    ]);

    return {
      merchant: {
        id: merchant._id,
        name: merchant.name,
        slug: merchant.publicSlug,
      },
      urls: {
        // ثبّت مسار الواجهة الأمامية المستخدم لديك
        store: `/store/${merchant.publicSlug}`, // ✅ يتوافق مع مسارك الحالي: /store/almajd
        chat: `/chat/${merchant.publicSlug}`,
        // احتفظ بمسار قديم إن كنت استعملته في أماكن أخرى:
        legacyStore: `/${merchant.publicSlug}/store`,
      },
      embedModes: widget?.embedMode
        ? [widget.embedMode, 'bubble', 'iframe', 'bar', 'conversational']
        : ['bubble', 'iframe', 'bar', 'conversational'],
      theme: {
        primaryColor: store?.primaryColor,
        secondaryColor: store?.secondaryColor,
      },
    };
  }

  @Get(':slug/storefront')
  @Public()
  @ApiOperation({ summary: 'Get Storefront by slug' })
  async getStore(
    @Param('slug') slug: string,
  ): Promise<Storefront & { _id: unknown }> {
    const { merchant } = await this.resolve(slug);

    const store = await this.stores
      .findOneAndUpdate(
        {
          $or: [{ merchant: merchant._id }, { merchant: String(merchant._id) }],
        },
        {
          $setOnInsert: {
            merchant: merchant._id,
            slug: merchant.publicSlug,
            primaryColor: '#FF8500',
            secondaryColor: '#2575fc',
            buttonStyle: 'rounded',
            brandDark: '#111827',
            banners: [],
            featuredProductIds: [],
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();

    return store; // ما عاد فيه 404
  }

  @Get(':slug/chat')
  @Public()
  @ApiOperation({ summary: 'Get Chat Widget by slug' })
  async getChat(
    @Param('slug') slug: string,
  ): Promise<ChatWidgetSettings & { _id: unknown }> {
    const { merchant } = await this.resolve(slug);

    const widget = await this.widgets
      .findOneAndUpdate(
        { merchantId: String(merchant._id) },
        {
          $setOnInsert: {
            merchantId: String(merchant._id),
            widgetSlug: merchant.publicSlug,
            embedMode: 'bubble',
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();

    return widget;
  }
}
