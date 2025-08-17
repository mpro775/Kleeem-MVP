import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan.name) private planModel: Model<PlanDocument>) {}

  async create(createDto: CreatePlanDto): Promise<Plan> {
    const plan = new this.planModel(createDto);
    return await plan.save();
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
