import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PLAN_REPOSITORY } from './tokens';
import { PlanRepository, SortKey } from './repositories/plan.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { Plan } from './schemas/plan.schema';

@Injectable()
export class PlansService {
  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly repo: PlanRepository,
  ) {}

  async create(dto: CreatePlanDto) {
    const exists = await this.repo.findOneByName(dto.name);
    if (exists) throw new Error('Plan name already exists');
    return this.repo.create(dto as any);
  }

  async findAllPaged(q: QueryPlansDto) {
    const page = Math.max(parseInt((q.page as any) ?? '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt((q.limit as any) ?? '20', 10), 1),
      100,
    );

    const filter = {
      archivedNotTrue: true,
      ...(q.isActive != null ? { isActive: q.isActive === 'true' } : {}),
      ...(q.isTrial != null ? { isTrial: q.isTrial === 'true' } : {}),
    };

    const sort: SortKey = (q.sort as SortKey) ?? 'createdDesc';

    const { items, total } = await this.repo.paginate(
      filter,
      sort,
      page,
      limit,
    );
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async toggleActive(id: string, isActive: boolean) {
    const plan = await this.repo.updateById(id, { isActive });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async archive(id: string) {
    const plan = await this.repo.archiveById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findAll(): Promise<Plan[]> {
    const items = await this.repo.findAll();
    return items as unknown as Plan[];
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan as unknown as Plan;
  }

  async findById(id: string): Promise<Plan> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan as unknown as Plan;
  }

  async findByName(name: string): Promise<Plan> {
    const plan = await this.repo.findByName(name);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan as unknown as Plan;
  }

  async update(id: string, updateDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.repo.updateById(id, updateDto as any);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan as unknown as Plan;
  }

  async remove(id: string): Promise<{ message: string }> {
    const ok = await this.repo.deleteById(id);
    if (!ok) throw new NotFoundException('Plan not found');
    return { message: 'Plan deleted successfully' };
  }
}
