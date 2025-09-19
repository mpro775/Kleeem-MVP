import { Types } from 'mongoose';
import { SupportTicket } from '../schemas/support-ticket.schema';

export type SupportTicketEntity = SupportTicket & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface SupportRepository {
  create(dto: Partial<SupportTicketEntity>): Promise<SupportTicketEntity>;
  findById?(id: string): Promise<SupportTicketEntity | null>;
  updateById?(
    id: string,
    patch: Partial<SupportTicketEntity>,
  ): Promise<SupportTicketEntity | null>;
  // يمكن إضافة paginate/softDelete لاحقًا عند الحاجة
}
