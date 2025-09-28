# نظام Cursor Pagination

تم تنفيذ نظام موحد للـ Cursor Pagination في جميع أنحاء التطبيق لضمان الأداء الأمثل والتوسع.

## المميزات

- **أداء عالي**: لا يعتمد على OFFSET/SKIP البطيء
- **ثبات النتائج**: لا تتأثر النتائج بالتغييرات أثناء التصفح
- **توسع ممتاز**: يعمل بكفاءة مع ملايين السجلات
- **فهارس محسّنة**: فهارس مركبة لكل استعلام

## الاستخدام الأساسي

### 1. DTO الأساسي

```typescript
import { CursorDto } from '../../../common/dto/pagination.dto';

export class GetProductsDto extends CursorDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}
```

### 2. في الخدمة

```typescript
import { PaginationService } from '../../common/services/pagination.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private paginationService: PaginationService,
  ) {}

  async getProducts(merchantId: string, dto: GetProductsDto) {
    const baseFilter = { merchantId: new Types.ObjectId(merchantId) };

    if (dto.search) {
      baseFilter.$text = { $search: dto.search };
    }

    return this.paginationService.paginate(this.productModel, dto, baseFilter, {
      sortField: 'createdAt',
      sortOrder: -1,
      populate: 'category',
      lean: true,
    });
  }
}
```

### 3. في الكونترولر

```typescript
@Get()
async getProducts(
  @Query() dto: GetProductsDto,
  @CurrentMerchantId() merchantId: string,
) {
  const result = await this.productsService.getProducts(merchantId, dto);

  return {
    items: result.items,
    meta: result.meta,
  };
}
```

## معاملات الاستعلام

### معاملات أساسية

- `limit`: عدد العناصر (1-100، افتراضي 20)
- `cursor`: cursor للصفحة التالية (base64)

### مثال على الاستعلام

```
GET /api/products?limit=20&cursor=eyJ0IjoxNjk5ODg4ODAwMDAwLCJpZCI6IjY1NGY5YzAwMTIzNDU2Nzg5YWJjZGVmMCJ9
```

## استجابة API

```json
{
  "items": [
    {
      "_id": "654f9c00123456789abcdef0",
      "name": "منتج تجريبي",
      "price": 100,
      "createdAt": "2023-11-11T10:00:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": "eyJ0IjoxNjk5ODg4ODAwMDAwLCJpZCI6IjY1NGY5YzAwMTIzNDU2Nzg5YWJjZGVmMCJ9",
    "hasMore": true,
    "count": 20
  }
}
```

## الفهارس المطلوبة

### فهرس أساسي للـ pagination

```typescript
Schema.index(
  {
    merchantId: 1,
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);
```

### فهرس للبحث النصي

```typescript
Schema.index(
  { name: 'text', description: 'text' },
  {
    weights: { name: 5, description: 1 },
    background: true,
  },
);
```

## الخدمات المحدثة

### ✅ تم التحديث

- **ProductsService**: جلب المنتجات مع فلترة متقدمة
- **UsersService**: إدارة المستخدمين
- **OrdersService**: جلب الطلبات
- **PaginationService**: خدمة أساسية مشتركة

### الـ Schemas المحدثة

- **Product**: فهارس للمنتجات والبحث النصي
- **User**: فهارس للمستخدمين والأدوار
- **Order**: فهارس للطلبات والجلسات
- **Merchant**: فهارس للتجار والاشتراكات
- **Category**: فهارس للفئات الهرمية
- **SupportTicket**: فهارس لتذاكر الدعم
- **Plan**: فهارس للخطط والأسعار

## إعدادات Mongoose

تم تحسين إعدادات الاتصال:

```typescript
MongooseModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    uri: configService.get<string>('MONGODB_URI'),
    autoIndex: configService.get<string>('NODE_ENV') !== 'production',
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
    retryWrites: true,
    retryReads: true,
  }),
});
```

## أفضل الممارسات

### 1. استخدم lean() دائماً

```typescript
const result = await this.paginationService.paginate(
  this.productModel,
  dto,
  baseFilter,
  { lean: true },
);
```

### 2. حدد الحقول المطلوبة

```typescript
const result = await this.paginationService.paginate(
  this.productModel,
  dto,
  baseFilter,
  {
    select: 'name price status createdAt',
    lean: true,
  },
);
```

### 3. استخدم الفهارس المناسبة

- فهرس مركب لكل استعلام شائع
- فهرس نصي للبحث
- background: true لجميع الفهارس

### 4. حدود الأمان

- حد أقصى 100 عنصر للـ limit
- تحقق من صحة الـ cursor
- فلترة حسب merchantId دائماً

## مراقبة الأداء

### مقاييس مهمة

- زمن الاستجابة للاستعلامات
- استخدام الفهارس
- عدد المستندات المفحوصة

### أدوات المراقبة

```bash
# فحص استخدام الفهارس
db.products.find({...}).explain("executionStats")

# مراقبة الاستعلامات البطيئة
db.setProfilingLevel(2, { slowms: 100 })
```

## الترحيل

### للتطبيقات الموجودة

1. أنشئ endpoints جديدة مع cursor pagination
2. احتفظ بالـ endpoints القديمة مؤقتاً
3. حدث العميل تدريجياً
4. احذف الـ endpoints القديمة

### مثال على التوافق العكسي

```typescript
@Get('legacy')
async findAllLegacy(@Query() query: any) {
  // الطريقة القديمة
}

@Get()
async getProducts(@Query() dto: GetProductsDto) {
  // الطريقة الجديدة
}
```
