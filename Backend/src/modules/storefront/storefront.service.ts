// src/storefront/storefront.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { UpdateStorefrontDto } from './dto/update-storefront.dto';
import { Storefront, StorefrontDocument } from './schemas/storefront.schema';
import { CreateStorefrontDto } from './dto/create-storefront.dto';
export interface StorefrontResult {
  merchant: Merchant;
  products: Product[];
  categories: Category[];
}
@Injectable()
export class StorefrontService {
  constructor(
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Storefront.name)
    private storefrontModel: Model<StorefrontDocument>,
  ) {}
  async create(dto: CreateStorefrontDto): Promise<Storefront> {
    return this.storefrontModel.create(dto);
  }

  async findByMerchant(merchantId: string): Promise<StorefrontDocument | null> {
    let id: any = merchantId;
    if (Types.ObjectId.isValid(merchantId)) {
      id = new Types.ObjectId(merchantId);
    }
    // جرّب البحث بكلا القيمتين (أحيانًا البيانات محفوظة كـ String أحيانًا كـ ObjectId)
    return this.storefrontModel
      .findOne({
        $or: [{ merchant: merchantId }, { merchant: id }],
      })
      .exec();
  }

  async update(id: string, dto: UpdateStorefrontDto): Promise<Storefront> {
    const storefront = await this.storefrontModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!storefront) throw new NotFoundException('Storefront not found');
    return storefront;
  }

  async updateByMerchant(
    merchantId: string,
    dto: UpdateStorefrontDto,
  ): Promise<Storefront> {
    const storefront = await this.storefrontModel.findOneAndUpdate(
      { merchant: merchantId },
      dto,
      { new: true },
    );
    if (!storefront) throw new NotFoundException('Storefront not found');
    return storefront;
  }
  async getStorefront(slugOrId: string): Promise<StorefrontResult> {
    const filter = Types.ObjectId.isValid(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
      : { slug: slugOrId };
    const merchant = await this.merchantModel.findOne(filter).lean();
    if (!merchant) throw new NotFoundException('Merchant not found');

    const products = await this.productModel
      .find({ merchantId: merchant._id, status: 'active', isAvailable: true })
      .sort({ createdAt: -1 })
      .lean();

    // جلب الفئات
    const categories = await this.categoryModel
      .find({ merchantId: merchant._id })
      .sort({ name: 1 })
      .lean();

    return { merchant, products, categories };
  }
}
