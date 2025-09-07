import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';

@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan.name) private planModel: Model<PlanDocument>) {}

  async create(dto: CreatePlanDto) {
    const exists = await this.planModel.findOne({ name: dto.name }).lean();
    if (exists) throw new Error('Plan name already exists');
    return this.planModel.create(dto);
  }
  
  async findAllPaged(q: QueryPlansDto) {
    const page = Math.max(parseInt(q.page ?? '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit ?? '20', 10), 1), 100);
    const filter: any = { archived: { $ne: true } };
    if (q.isActive) filter.isActive = q.isActive === 'true';
    if (q.isTrial) filter.isTrial = q.isTrial === 'true';
  
    const sortMap = {
      priceAsc: { priceCents: 1 },
      priceDesc: { priceCents: -1 },
      createdDesc: { createdAt: -1 },
      createdAsc: { createdAt: 1 },
    } as const;
  
    const [items, total] = await Promise.all([
      this.planModel.find(filter).sort(sortMap[q.sort ?? 'createdDesc'] ?? { createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      this.planModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
  
  async toggleActive(id: string, isActive: boolean) {
    const plan = await this.planModel.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
  
  async archive(id: string) {
    const plan = await this.planModel.findByIdAndUpdate(id, { archived: true }, { new: true });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findAll(): Promise<Plan[]> {
    return await this.planModel.find().exec();
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
  async findById(id: string): Promise<Plan> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
  async findByName(name: string): Promise<Plan> {
    const plan = await this.planModel.findOne({ name }).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
  async update(id: string, updateDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.planModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async remove(id: string): Promise<{ message: string }> {
    const plan = await this.planModel.findByIdAndDelete(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return { message: 'Plan deleted successfully' };
  }
}
