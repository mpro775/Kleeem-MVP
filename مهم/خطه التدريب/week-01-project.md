# مشروع الأسبوع الأول: نظام إدارة المهام البسيط

**الأسبوع:** الأول - أساسيات النظام الجديد  
**نوع المشروع:** تطبيقي شامل  
**المدة المقدرة:** 5 أيام (30 ساعة)  
**المستوى:** مبتدئ إلى متوسط  
**النقاط:** 100 نقطة

---

## 🎯 نظرة عامة على المشروع

### الهدف الرئيسي
بناء نظام إدارة مهام (Task Management System) باستخدام NestJS، MongoDB، وRedis. هذا المشروع سيطبق جميع المفاهيم التي تعلمتها خلال الأسبوع الأول.

### الوظائف المطلوبة
1. **إدارة المستخدمين:** تسجيل، تسجيل دخول، إدارة الملفات الشخصية
2. **إدارة المهام:** إنشاء، تحديث، حذف، عرض المهام
3. **التصنيفات:** تنظيم المهام في فئات
4. **البحث والفلترة:** البحث في المهام وفلترتها
5. **الإحصائيات:** لوحة معلومات بسيطة
6. **API Documentation:** توثيق شامل باستخدام Swagger

### التقنيات المستخدمة
- **Backend Framework:** NestJS
- **Database:** MongoDB مع Mongoose
- **Caching:** Redis
- **Authentication:** JWT
- **Validation:** class-validator
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

---

## 📋 المتطلبات التفصيلية

### 1. إدارة المستخدمين (User Management)

#### نموذج المستخدم (User Model)
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  password: string; // مُشفر
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```

#### الوظائف المطلوبة
- **POST /auth/register** - تسجيل مستخدم جديد
- **POST /auth/login** - تسجيل الدخول
- **POST /auth/refresh** - تجديد الـ token
- **GET /users/profile** - عرض الملف الشخصي
- **PUT /users/profile** - تحديث الملف الشخصي
- **PUT /users/password** - تغيير كلمة المرور

#### متطلبات الأمان
- تشفير كلمات المرور باستخدام bcrypt
- JWT tokens للمصادقة
- Validation شامل للبيانات المدخلة
- Rate limiting للـ login attempts

### 2. إدارة المهام (Task Management)

#### نموذج المهمة (Task Model)
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  categoryId?: string;
  userId: string; // صاحب المهمة
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### الوظائف المطلوبة
- **GET /tasks** - عرض جميع مهام المستخدم مع فلترة وترقيم
- **GET /tasks/:id** - عرض مهمة محددة
- **POST /tasks** - إنشاء مهمة جديدة
- **PUT /tasks/:id** - تحديث مهمة
- **DELETE /tasks/:id** - حذف مهمة
- **PATCH /tasks/:id/status** - تغيير حالة المهمة
- **GET /tasks/search** - البحث في المهام

#### ميزات متقدمة
- فلترة حسب الحالة، الأولوية، التاريخ
- ترتيب حسب معايير مختلفة
- البحث النصي في العنوان والوصف
- إحصائيات المهام

### 3. إدارة التصنيفات (Categories)

#### نموذج التصنيف (Category Model)
```typescript
interface Category {
  id: string;
  name: string;
  description?: string;
  color: string; // hex color
  icon?: string;
  userId: string;
  tasksCount: number; // محسوب
  createdAt: Date;
  updatedAt: Date;
}
```

#### الوظائف المطلوبة
- **GET /categories** - عرض جميع تصنيفات المستخدم
- **GET /categories/:id** - عرض تصنيف محدد
- **POST /categories** - إنشاء تصنيف جديد
- **PUT /categories/:id** - تحديث تصنيف
- **DELETE /categories/:id** - حذف تصنيف
- **GET /categories/:id/tasks** - عرض مهام تصنيف محدد

---

## 🏗️ هيكل المشروع

### هيكل المجلدات
```
task-management-api/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── schemas/
│   │   └── dto/
│   ├── tasks/
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   ├── schemas/
│   │   └── dto/
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   ├── schemas/
│   │   └── dto/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   └── config/
│       ├── database.config.ts
│       ├── jwt.config.ts
│       └── redis.config.ts
├── test/
├── docs/
├── docker-compose.yml
├── Dockerfile
└── package.json
```

### الوحدات الأساسية

#### 1. Auth Module
```typescript
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

#### 2. Tasks Module
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    CacheModule.register(),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
```

---

## 💻 التنفيذ خطوة بخطوة

### اليوم الأول: إعداد المشروع والمصادقة

#### الخطوة 1: إنشاء المشروع
```bash
# إنشاء مشروع NestJS جديد
nest new task-management-api
cd task-management-api

# تثبيت التبعيات المطلوبة
npm install @nestjs/mongoose mongoose
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/config
npm install class-validator class-transformer
npm install bcryptjs
npm install redis @nestjs/cache-manager cache-manager-redis-store

# تثبيت dev dependencies
npm install -D @types/bcryptjs @types/passport-jwt @types/passport-local
```

#### الخطوة 2: إعداد التكوين
```typescript
// src/config/database.config.ts
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => ({
  uri: configService.get<string>('DATABASE_URL'),
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```

#### الخطوة 3: إنشاء User Schema
```typescript
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  avatar?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ enum: ['user', 'admin'], default: 'user' })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

#### الخطوة 4: إنشاء Auth Service
```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });
    
    return this.login(user);
  }
}
```

### اليوم الثاني: إنشاء نظام المهام

#### الخطوة 1: إنشاء Task Schema
```typescript
// src/tasks/schemas/task.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Task extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'], 
    default: 'pending' 
  })
  status: string;

  @Prop({ 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  })
  priority: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop()
  dueDate?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  attachments: string[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);
```

#### الخطوة 2: إنشاء Tasks Service
```typescript
// src/tasks/tasks.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schemas/task.schema';
import { CreateTaskDto, UpdateTaskDto, TaskFiltersDto } from './dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const task = new this.taskModel({
      ...createTaskDto,
      userId,
    });
    return task.save();
  }

  async findAll(userId: string, filters: TaskFiltersDto) {
    const query: any = { userId };

    // تطبيق الفلاتر
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate('categoryId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(query),
    ]);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.taskModel
      .findOne({ _id: id, userId })
      .populate('categoryId')
      .exec();
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: id, userId },
        { 
          ...updateTaskDto,
          ...(updateTaskDto.status === 'completed' && { completedAt: new Date() })
        },
        { new: true }
      )
      .populate('categoryId')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.taskModel.deleteOne({ _id: id, userId }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Task not found');
    }
  }

  async getStatistics(userId: string) {
    const stats = await this.taskModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const priorityStats = await this.taskModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      statusStats: stats,
      priorityStats,
      total: await this.taskModel.countDocuments({ userId }),
    };
  }
}
```

### اليوم الثالث: إنشاء نظام التصنيفات

#### الخطوة 1: إنشاء Category Schema
```typescript
// src/categories/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, match: /^#[0-9A-F]{6}$/i })
  color: string;

  @Prop()
  icon?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
```

#### الخطوة 2: إنشاء Categories Service
```typescript
// src/categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';
import { Task } from '../tasks/schemas/task.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<Category> {
    const category = new this.categoryModel({
      ...createCategoryDto,
      userId,
    });
    return category.save();
  }

  async findAll(userId: string): Promise<any[]> {
    const categories = await this.categoryModel.find({ userId }).exec();
    
    // إضافة عدد المهام لكل تصنيف
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const tasksCount = await this.taskModel.countDocuments({
          categoryId: category._id,
          userId,
        });
        
        return {
          ...category.toObject(),
          tasksCount,
        };
      })
    );

    return categoriesWithCount;
  }

  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.categoryModel
      .findOne({ _id: id, userId })
      .exec();
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string): Promise<Category> {
    const category = await this.categoryModel
      .findOneAndUpdate(
        { _id: id, userId },
        updateCategoryDto,
        { new: true }
      )
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(id: string, userId: string): Promise<void> {
    // التحقق من عدم وجود مهام مرتبطة
    const tasksCount = await this.taskModel.countDocuments({
      categoryId: id,
      userId,
    });

    if (tasksCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with existing tasks'
      );
    }

    const result = await this.categoryModel.deleteOne({ _id: id, userId }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Category not found');
    }
  }
}
```

### اليوم الرابع: إضافة الميزات المتقدمة

#### الخطوة 1: إضافة Redis Caching
```typescript
// src/tasks/tasks.service.ts (إضافة caching)
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findOne(id: string, userId: string): Promise<Task> {
    const cacheKey = `task:${id}:${userId}`;
    
    // البحث في الكاش أولاً
    const cachedTask = await this.cacheManager.get(cacheKey);
    if (cachedTask) {
      return cachedTask as Task;
    }

    const task = await this.taskModel
      .findOne({ _id: id, userId })
      .populate('categoryId')
      .exec();
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // حفظ في الكاش لمدة 5 دقائق
    await this.cacheManager.set(cacheKey, task, 300);
    
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: id, userId },
        { 
          ...updateTaskDto,
          ...(updateTaskDto.status === 'completed' && { completedAt: new Date() })
        },
        { new: true }
      )
      .populate('categoryId')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // تحديث الكاش
    const cacheKey = `task:${id}:${userId}`;
    await this.cacheManager.set(cacheKey, task, 300);

    return task;
  }
}
```

#### الخطوة 2: إضافة Swagger Documentation
```typescript
// src/tasks/tasks.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: any,
  ) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async findAll(
    @Query() filters: TaskFiltersDto,
    @GetUser() user: any,
  ) {
    return this.tasksService.findAll(user.id, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@GetUser() user: any) {
    return this.tasksService.getStatistics(user.id);
  }
}
```

#### الخطوة 3: إضافة Validation DTOs
```typescript
// src/tasks/dto/create-task.dto.ts
import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Complete project documentation' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  })
  @IsOptional()
  @IsEnum(['pending', 'in-progress', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Task tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

### اليوم الخامس: الاختبارات والتوثيق

#### الخطوة 1: كتابة Unit Tests
```typescript
// src/tasks/tasks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { Task } from './schemas/task.schema';
import { CACHE_MANAGER } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let mockTaskModel: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockTaskModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      save: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getModelToken(Task.name),
          useValue: mockTaskModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('findOne', () => {
    it('should return a task from cache if available', async () => {
      const taskId = 'task123';
      const userId = 'user123';
      const cachedTask = { _id: taskId, title: 'Test Task' };

      mockCacheManager.get.mockResolvedValue(cachedTask);

      const result = await service.findOne(taskId, userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`task:${taskId}:${userId}`);
      expect(result).toEqual(cachedTask);
      expect(mockTaskModel.findOne).not.toHaveBeenCalled();
    });

    it('should fetch task from database if not in cache', async () => {
      const taskId = 'task123';
      const userId = 'user123';
      const task = { _id: taskId, title: 'Test Task' };

      mockCacheManager.get.mockResolvedValue(null);
      mockTaskModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(task),
        }),
      });

      const result = await service.findOne(taskId, userId);

      expect(mockTaskModel.findOne).toHaveBeenCalledWith({ _id: taskId, userId });
      expect(mockCacheManager.set).toHaveBeenCalledWith(`task:${taskId}:${userId}`, task, 300);
      expect(result).toEqual(task);
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createTaskDto = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
      };
      const userId = 'user123';
      const savedTask = { _id: 'task123', ...createTaskDto, userId };

      // Mock constructor and save
      const mockTaskInstance = {
        save: jest.fn().mockResolvedValue(savedTask),
      };
      
      // Mock the model constructor
      mockTaskModel.mockImplementation(() => mockTaskInstance);

      const result = await service.create(createTaskDto, userId);

      expect(mockTaskModel).toHaveBeenCalledWith({
        ...createTaskDto,
        userId,
      });
      expect(mockTaskInstance.save).toHaveBeenCalled();
      expect(result).toEqual(savedTask);
    });
  });
});
```

#### الخطوة 2: كتابة E2E Tests
```typescript
// test/tasks.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    
    await app.init();

    // إنشاء مستخدم للاختبار
    const testUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    const authResult = await authService.register(testUser);
    accessToken = authResult.access_token;
    userId = authResult.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/tasks (POST)', () => {
    it('should create a new task', () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'high',
      };

      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe(createTaskDto.title);
          expect(res.body.description).toBe(createTaskDto.description);
          expect(res.body.priority).toBe(createTaskDto.priority);
          expect(res.body.userId).toBe(userId);
        });
    });

    it('should return 401 without authentication', () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'This is a test task',
      };

      return request(app.getHttpServer())
        .post('/tasks')
        .send(createTaskDto)
        .expect(401);
    });
  });

  describe('/tasks (GET)', () => {
    it('should return paginated tasks', () => {
      return request(app.getHttpServer())
        .get('/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tasks');
          expect(res.body).toHaveProperty('pagination');
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('limit');
          expect(res.body.pagination).toHaveProperty('total');
        });
    });
  });
});
```

---

## 📊 معايير التقييم

### توزيع النقاط (100 نقطة)

#### 1. الوظائف الأساسية (40 نقطة)
- **المصادقة والتسجيل (10 نقاط)**
  - تسجيل مستخدم جديد
  - تسجيل الدخول
  - JWT tokens
  - تشفير كلمات المرور

- **إدارة المهام (20 نقطة)**
  - إنشاء مهمة
  - عرض المهام مع فلترة
  - تحديث المهام
  - حذف المهام

- **إدارة التصنيفات (10 نقاط)**
  - إنشاء تصنيفات
  - ربط المهام بالتصنيفات
  - عرض مهام كل تصنيف

#### 2. جودة الكود (25 نقطة)
- **هيكل المشروع (10 نقاط)**
  - تنظيم الملفات والمجلدات
  - فصل الاهتمامات (Separation of Concerns)
  - استخدام الوحدات بشكل صحيح

- **معايير الترميز (10 نقاط)**
  - اتباع TypeScript best practices
  - استخدام decorators بشكل صحيح
  - تسمية متغيرات وفئات واضحة

- **التعامل مع الأخطاء (5 نقاط)**
  - Exception handling شامل
  - رسائل خطأ واضحة
  - HTTP status codes صحيحة

#### 3. الميزات المتقدمة (20 نقطة)
- **Validation (5 نقاط)**
  - استخدام class-validator
  - validation pipes
  - custom validators

- **Caching (5 نقاط)**
  - استخدام Redis للتخزين المؤقت
  - cache invalidation
  - performance optimization

- **البحث والفلترة (5 نقاط)**
  - البحث النصي
  - فلترة متعددة المعايير
  - ترقيم الصفحات

- **الإحصائيات (5 نقاط)**
  - إحصائيات المهام
  - aggregation queries
  - dashboard data

#### 4. التوثيق والاختبارات (15 نقطة)
- **Swagger Documentation (5 نقاط)**
  - توثيق جميع الـ endpoints
  - أمثلة واضحة
  - schemas مفصلة

- **Unit Tests (5 نقاط)**
  - تغطية 70%+ للكود
  - اختبارات للخدمات الرئيسية
  - mocking صحيح

- **E2E Tests (5 نقاط)**
  - اختبارات للـ workflows الأساسية
  - اختبارات المصادقة
  - اختبارات الـ API endpoints

---

## 🚀 التسليم والعرض

### متطلبات التسليم

#### 1. الكود المصدري
```bash
# هيكل التسليم
task-management-api/
├── README.md                 # دليل شامل للمشروع
├── SETUP.md                 # تعليمات الإعداد
├── API_DOCS.md              # توثيق الـ API
├── src/                     # الكود المصدري
├── test/                    # الاختبارات
├── docs/                    # الوثائق الإضافية
├── docker-compose.yml       # إعداد قواعد البيانات
├── .env.example            # مثال على متغيرات البيئة
└── package.json            # التبعيات والسكريبتات
```

#### 2. الوثائق المطلوبة

**README.md**
```markdown
# Task Management API

## نظرة عامة
نظام إدارة مهام شامل مبني باستخدام NestJS، MongoDB، وRedis.

## الميزات
- إدارة المستخدمين والمصادقة
- إدارة المهام مع فلترة وبحث
- نظام التصنيفات
- إحصائيات وتقارير
- API documentation مع Swagger

## التقنيات المستخدمة
- NestJS
- MongoDB + Mongoose
- Redis
- JWT Authentication
- Swagger/OpenAPI

## التثبيت والتشغيل
[تعليمات مفصلة]

## API Documentation
متاح على: http://localhost:3000/api/docs

## الاختبارات
```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage report
```

## المساهمة
[إرشادات المساهمة]
```

#### 3. العرض التقديمي (15 دقيقة)

**هيكل العرض:**
1. **مقدمة (2 دقيقة)**
   - نظرة عامة على المشروع
   - التقنيات المستخدمة

2. **عرض الوظائف (8 دقائق)**
   - تسجيل مستخدم جديد
   - إنشاء وإدارة المهام
   - استخدام التصنيفات
   - البحث والفلترة
   - عرض الإحصائيات

3. **التحديات والحلول (3 دقائق)**
   - المشاكل التي واجهتها
   - كيف تم حلها
   - الدروس المستفادة

4. **أسئلة ومناقشة (2 دقيقة)**

### معايير تقييم العرض
- **وضوح الشرح (5 نقاط)**
- **عرض الوظائف (5 نقاط)**
- **الإجابة على الأسئلة (3 نقاط)**
- **الالتزام بالوقت (2 نقطة)**

---

## 🎯 نصائح للنجاح

### أفضل الممارسات
1. **ابدأ بالأساسيات:** لا تحاول تنفيذ كل شيء مرة واحدة
2. **اختبر باستمرار:** تأكد من عمل كل جزء قبل الانتقال للتالي
3. **وثق كل شيء:** اكتب تعليقات واضحة ووثائق مفيدة
4. **استخدم Git:** commit منتظم مع رسائل واضحة
5. **اطلب المساعدة:** لا تتردد في السؤال عند الحاجة

### الأخطاء الشائعة التي يجب تجنبها
1. **عدم التحقق من البيانات:** استخدم validation دائماً
2. **تجاهل الأمان:** لا تنس تشفير كلمات المرور والتحقق من الصلاحيات
3. **عدم التعامل مع الأخطاء:** تأكد من وجود error handling شامل
4. **تجاهل الاختبارات:** اكتب اختبارات من البداية
5. **عدم استخدام TypeScript بشكل صحيح:** استفد من type safety

### موارد مساعدة
- [NestJS Documentation](https://docs.nestjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [JWT.io](https://jwt.io/)
- [Swagger Documentation](https://swagger.io/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

---

## 🏆 التقدير النهائي

### سلم التقديرات
- **90-100 نقطة:** ممتاز (A) - مشروع متكامل ومتميز
- **80-89 نقطة:** جيد جداً (B) - مشروع جيد مع بعض النواقص البسيطة
- **70-79 نقطة:** جيد (C) - مشروع مقبول يحتاج تحسينات
- **60-69 نقطة:** مقبول (D) - الحد الأدنى للنجاح
- **أقل من 60:** غير مقبول (F) - يحتاج إعادة العمل

### الشهادات
- **شهادة إتمام المشروع:** للحصول على 70+ نقطة
- **شهادة التميز:** للحصول على 90+ نقطة
- **شهادة أفضل مشروع:** للمشروع الأفضل في المجموعة

---

**بالتوفيق في مشروعك! 🚀 هذا المشروع سيكون أساساً قوياً لفهم تطوير الـ APIs الحديثة باستخدام NestJS.**

---

*© 2025 Manus AI - مشاريع التدريب التقني*

