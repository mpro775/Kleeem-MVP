// src/modules/products/services/product-csv.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse/sync';
import { Model, Types } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { stringify } = require('csv-stringify/sync') as {
  stringify: (
    data: unknown[],
    options: { header: boolean; columns: string[] },
  ) => string;
};

// Type-safe wrapper for csv stringify
function safeStringify(
  data: unknown[],
  options: { header: boolean; columns: string[] },
): string {
  return stringify(data, options);
}

import { TranslationService } from '../../../common/services/translation.service';
import { Product, ProductDocument } from '../schemas/product.schema';

import { ProductValidationService } from './product-validation.service';

interface CSVRow {
  name: string;
  description?: string;
  price: string;
  sku?: string;
  barcode?: string;
  stock?: string;
  category?: string;
  images?: string;
  keywords?: string;
  productType?: string;
  isAvailable?: string;
  status?: string;
}

interface CSVExportRow {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  images: string;
  keywords: string;
  productType: string;
  isAvailable: string;
  status: string;
  hasVariants: string;
  sku: string;
  barcode: string;
  stock: string;
  variantSku: string;
  variantBarcode: string;
  variantPrice: string;
  variantStock: string;
  variantAttributes: string;
  variantImages: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

type LeanProduct = Product & { _id?: Types.ObjectId };
type ProductVariant = NonNullable<Product['variants']>[number];

type CsvParseOptions = {
  columns: true;
  skip_empty_lines?: boolean;
  trim?: boolean;
};

type CsvRowParser = (input: string, options: CsvParseOptions) => CSVRow[];

const parseCsvRows: CsvRowParser = parse as unknown as CsvRowParser;

@Injectable()
export class ProductCsvService {
  private readonly logger = new Logger(ProductCsvService.name);

  private static readonly DEFAULT_CURRENCY = 'SAR';
  private static readonly DEFAULT_PRODUCT_TYPE: Product['productType'] =
    'physical';
  private static readonly DEFAULT_STATUS: Product['status'] = 'published';

  private static readonly EXPORT_COLUMNS: Array<keyof CSVExportRow> = [
    'id',
    'name',
    'description',
    'price',
    'currency',
    'category',
    'images',
    'keywords',
    'productType',
    'isAvailable',
    'status',
    'hasVariants',
    'sku',
    'barcode',
    'stock',
    'variantSku',
    'variantBarcode',
    'variantPrice',
    'variantStock',
    'variantAttributes',
    'variantImages',
  ];

  private static readonly TEMPLATE_COLUMNS: Array<keyof CSVRow> = [
    'name',
    'description',
    'price',
    'sku',
    'barcode',
    'stock',
    'category',
    'images',
    'keywords',
    'productType',
    'isAvailable',
    'status',
  ];

  private static readonly TEMPLATE_SAMPLE: CSVRow[] = [
    {
      name: 'Product Name Example',
      description: 'Product description',
      price: '99.99',
      sku: 'SKU-001',
      barcode: '1234567890',
      stock: '100',
      category: '',
      images: 'https://example.com/image1.jpg|https://example.com/image2.jpg',
      keywords: 'keyword1|keyword2|keyword3',
      productType: ProductCsvService.DEFAULT_PRODUCT_TYPE as string,
      isAvailable: 'true',
      status: ProductCsvService.DEFAULT_STATUS as string,
    },
  ];

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly validation: ProductValidationService,
    private readonly translationService: TranslationService,
  ) {}

  /**
   * تصدير المنتجات إلى CSV
   */
  async exportToCSV(merchantId: string): Promise<string> {
    const products = await this.productModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .lean<LeanProduct>()
      .exec();

    const rows = this.buildExportRows([products]);

    return safeStringify(rows, {
      header: true,
      columns: ProductCsvService.EXPORT_COLUMNS,
    });
  }

  private buildExportRows(products: LeanProduct[]): CSVExportRow[] {
    return products.flatMap((product) => this.buildRowsForProduct(product));
  }

  private buildRowsForProduct(product: LeanProduct): CSVExportRow[] {
    const baseRow = this.buildBaseRow(product);

    if (
      product.hasVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      return product.variants.map((variant) =>
        this.buildVariantRow(baseRow, variant),
      );
    }

    return [baseRow];
  }

  private buildBaseRow(product: LeanProduct): CSVExportRow {
    return {
      id: this.getProductId(product),
      name: product.name ?? '',
      description: product.description ?? '',
      price: this.formatPrice(product.price),
      currency: product.currency ?? ProductCsvService.DEFAULT_CURRENCY,
      category: this.formatCategory(product.category),
      images: this.formatArrayField(product.images),
      keywords: this.formatArrayField(product.keywords),
      productType:
        product.productType ??
        (ProductCsvService.DEFAULT_PRODUCT_TYPE as string),
      isAvailable: this.formatBoolean(product.isAvailable),
      status: product.status ?? (ProductCsvService.DEFAULT_STATUS as string),
      hasVariants: this.formatBoolean(product.hasVariants),
      sku: '',
      barcode: '',
      stock: '',
      variantSku: '',
      variantBarcode: '',
      variantPrice: '',
      variantStock: '',
      variantAttributes: '',
      variantImages: '',
    };
  }

  private getProductId(product: LeanProduct): string {
    return product._id?.toString() ?? '';
  }

  private formatPrice(price: number | undefined): string {
    return price?.toString() ?? '0';
  }

  private formatCategory(category: Types.ObjectId | undefined): string {
    return category ? category.toString() : '';
  }

  private formatArrayField(arr: string[] | undefined): string {
    return (arr ?? []).join('|');
  }

  private formatBoolean(value: boolean | undefined): string {
    return value ? 'true' : 'false';
  }

  private buildVariantRow(
    baseRow: CSVExportRow,
    variant: ProductVariant,
  ): CSVExportRow {
    return {
      ...baseRow,
      hasVariants: 'true',
      variantSku: variant.sku || '',
      variantBarcode: variant.barcode || '',
      variantPrice: variant.price?.toString() || '0',
      variantStock: variant.stock?.toString() || '0',
      variantAttributes: JSON.stringify(variant.attributes || {}),
      variantImages: (variant.images || []).join('|'),
    };
  }

  /**
   * استيراد المنتجات من CSV
   */
  async importFromCSV(
    merchantId: string,
    csvContent: string,
  ): Promise<ImportResult> {
    const mId = new Types.ObjectId(merchantId);
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const rows = this.parseCsv(csvContent);

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // +2 لأن الصف الأول هو العناوين

      try {
        await this.importRow(mId, row);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.warn(
          `Failed to import row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return result;
  }

  private async importRow(
    merchantId: Types.ObjectId,
    row: CSVRow,
  ): Promise<void> {
    this.ensureRowHasRequiredFields(row);

    const price = this.parsePrice(row.price);

    const status: Product['status'] = row.status
      ? (row.status as Product['status'])
      : ProductCsvService.DEFAULT_STATUS;

    const productType: Product['productType'] = row.productType
      ? (row.productType as Product['productType'])
      : ProductCsvService.DEFAULT_PRODUCT_TYPE;

    const productData = {
      merchantId,
      name: row.name,
      description: row.description || '',
      price,
      isAvailable: row.isAvailable === 'true',
      status,
      productType,
      source: 'manual',
    } as Partial<Product>;

    this.assignCategory(row, productData);
    this.assignImages(row, productData);
    this.assignKeywords(row, productData);

    if (row.sku) {
      await this.setupVariantData(merchantId, row, productData, price);
    }

    await this.productModel.create(productData);
  }

  private parseCsv(csvContent: string): CSVRow[] {
    try {
      return parseCsvRows(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      this.logger.error((error as Error).message);
      throw new BadRequestException(
        this.translationService.translate('products.errors.invalidCSV'),
      );
    }
  }

  private ensureRowHasRequiredFields(row: CSVRow): void {
    if (!row.name || !row.price) {
      throw new BadRequestException('Name and price are required');
    }
  }

  private parsePrice(value: string): number {
    const price = parseFloat(value);

    if (Number.isNaN(price) || price < 0) {
      throw new BadRequestException('Invalid price');
    }

    return price;
  }

  private assignCategory(row: CSVRow, productData: Partial<Product>): void {
    if (row.category && Types.ObjectId.isValid(row.category)) {
      productData.category = new Types.ObjectId(row.category);
    }
  }

  private assignImages(row: CSVRow, productData: Partial<Product>): void {
    if (row.images) {
      productData.images = this.splitPipeValues(row.images);
    }
  }

  private assignKeywords(row: CSVRow, productData: Partial<Product>): void {
    if (row.keywords) {
      productData.keywords = this.splitPipeValues(row.keywords);
    }
  }

  private async setupVariantData(
    merchantId: Types.ObjectId,
    row: CSVRow,
    productData: Partial<Product>,
    price: number,
  ): Promise<void> {
    const sku = row.sku as string;

    await this.validation.validateUniqueSku(merchantId.toHexString(), sku);

    productData.hasVariants = true;
    productData.variants = [
      {
        sku,
        barcode: row.barcode || null,
        attributes: {},
        price,
        stock: row.stock ? parseInt(row.stock, 10) : 0,
        images: productData.images || [],
        isAvailable: productData.isAvailable ?? true,
      },
    ];
  }

  private splitPipeValues(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value.split('|').filter((item) => item.trim());
  }

  /**
   * تصدير template CSV فارغ
   */
  exportTemplate(): string {
    try {
      return safeStringify(ProductCsvService.TEMPLATE_SAMPLE, {
        header: true,
        columns: ProductCsvService.TEMPLATE_COLUMNS,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to export CSV template: ${errorMessage}`);
      throw new BadRequestException('Failed to generate CSV template');
    }
  }
}
