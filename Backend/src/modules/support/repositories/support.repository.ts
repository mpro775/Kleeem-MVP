import type { SupportTicket } from '../schemas/support-ticket.schema';
import type { Types } from 'mongoose';

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
