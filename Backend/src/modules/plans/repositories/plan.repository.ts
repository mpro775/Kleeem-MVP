import { Types } from 'mongoose';
import { Plan } from '../schemas/plan.schema';

export type PlanEntity = Plan & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  archived?: boolean;
  isActive?: boolean;
  isTrial?: boolean;
  priceCents?: number;
};

export type SortKey = 'priceAsc' | 'priceDesc' | 'createdDesc' | 'createdAsc';

export type PlanFilter = {
  archivedNotTrue?: boolean; // default true
  isActive?: boolean;
  isTrial?: boolean;
};

export interface PlanRepository {
  create(dto: Partial<PlanEntity>): Promise<PlanEntity>;
  findOneByName(name: string): Promise<PlanEntity | null>;

  paginate(
    filter: PlanFilter,
    sort: SortKey,
    page: number,
    limit: number,
  ): Promise<{ items: PlanEntity[]; total: number }>;

  updateById(
    id: string,
    patch: Partial<PlanEntity>,
  ): Promise<PlanEntity | null>;
  archiveById(id: string): Promise<PlanEntity | null>;

  findAll(): Promise<PlanEntity[]>;
  findById(id: string): Promise<PlanEntity | null>;
  findByName(name: string): Promise<PlanEntity | null>;
  deleteById(id: string): Promise<boolean>;
}
