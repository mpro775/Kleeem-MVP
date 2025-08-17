import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../modules/merchants/schemas/merchant.schema';
import { Storefront } from '../modules/storefront/schemas/storefront.schema';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const merchantModel = app.get(getModelToken(Merchant.name));
  const storefrontModel = app.get(getModelToken(Storefront.name));

  // جلب جميع التجار
  const merchants: MerchantDocument[] = await merchantModel.find().exec();

  for (const merchant of merchants) {
    // هل لديه Storefront بالفعل؟
    const exists = await storefrontModel.findOne({ merchant: merchant._id });
    if (!exists) {
      await storefrontModel.create({
        merchant: merchant._id,
        primaryColor: '#FF8500',
        secondaryColor: '#1976d2',
        buttonStyle: 'rounded',
        banners: [],
        featuredProductIds: [],
        slug: merchant.id.toString(), // استخدم slug التاجر أو id
      });
      console.log(
        `Created storefront for merchant: ${merchant.name} (${merchant.id})`,
      );
    }
  }
  await app.close();
  console.log('تم إنشاء جميع storefronts المفقودة.');
}

main();
