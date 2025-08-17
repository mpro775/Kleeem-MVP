import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { VectorService } from '../vector/vector.service';
import * as XLSX from 'xlsx';
import { join } from 'path';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema'; // تأكد من مسار الاستيراد
interface ExcelRow {
  category?: string;
  [key: string]: any;
}
@Injectable()
export class ProductsImportService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly vectorService: VectorService,
  ) {}

  async importFromFile(filePath: string, merchantId: string) {
    const absPath = join(process.cwd(), filePath);
    const workbook = XLSX.readFile(absPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // 1. استخرج أسماء الفئات الفريدة (وحذف الفراغات)
    const categoryNames: string[] = Array.from(
      new Set(
        (rows as ExcelRow[])
          .map((row) => (row.category ?? '').toString().trim())
          .filter((name) => !!name),
      ),
    );

    // 2. جلب الفئات الموجودة
    const existingCats = await this.categoryModel
      .find({
        name: { $in: categoryNames },
      })
      .lean();

    // 3. أنشئ الفئات غير الموجودة
    const nameToId: Record<string, string> = {};
    for (const cat of existingCats) {
      nameToId[cat.name] = cat._id.toString();
    }
    // الفئات الغير موجودة:
    const newCatNames = categoryNames.filter((n) => !nameToId[n]);
    if (newCatNames.length > 0) {
      const newCats = await this.categoryModel.insertMany(
        newCatNames.map((name) => ({ name })),
      );
      for (const cat of newCats) {
        nameToId[cat.name] = cat._id.toString();
      }
    }

    // 4. حفظ المنتجات وربطها بالفئة الصحيحة
    const merchantObjectId = new Types.ObjectId(merchantId);

    const productDocs = await Promise.all(
      rows.map(async (row: any) => {
        const categoryName = (row.category ?? '').trim();
        const categoryId = nameToId[categoryName]
          ? new Types.ObjectId(nameToId[categoryName])
          : undefined;

        const product = await this.productModel.create({
          merchantId: merchantObjectId,
          name: row.name ?? '',
          description: row.description ?? '',
          category: categoryId,
          price: parseFloat(row.price || 0),
          isAvailable: true,
          images: row.images?.split(',') ?? [],
          specsBlock: row.specsBlock?.split(',') ?? [],
          keywords: row.keywords?.split(',') ?? [],
          source: 'manual',
          status: 'active',
          originalUrl: null,
          sourceUrl: null,
          externalId: null,
          syncStatus: 'imported',
        });

        return {
          id: product._id.toString(),
          merchantId: merchantId,
          name: product.name,
          description: product.description,
          category: categoryName, // نرسل الاسم للفيكتور وليس id
          specsBlock: product.specsBlock,
          keywords: product.keywords,
        };
      }),
    );

    await this.vectorService.upsertProducts(productDocs);

    return {
      count: productDocs.length,
      message: 'Products imported successfully',
    };
  }
}
