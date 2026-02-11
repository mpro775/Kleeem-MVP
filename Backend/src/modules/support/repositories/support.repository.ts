import type { SupportTicket } from '../schemas/support-ticket.schema';
import type { TicketStatus } from '../support.enums';
import type { Types } from 'mongoose';

export type SupportTicketEntity = SupportTicket & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface ListAllAdminParams {
  limit: number;
  page: number;
  status?: TicketStatus;
  /** بحث نصي في الموضوع والرسالة والاسم */
  search?: string;
  sortBy?: 'createdAt' | 'status' | 'ticketNumber' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TicketReplyItem {
  authorId: Types.ObjectId;
  body: string;
  isInternal?: boolean;
  createdAt: Date;
}

export interface SupportRepository {
  create(dto: Partial<SupportTicketEntity>): Promise<SupportTicketEntity>;
  findById?(id: string): Promise<SupportTicketEntity | null>;
  updateById?(
    id: string,
    patch: Partial<SupportTicketEntity>,
  ): Promise<SupportTicketEntity | null>;
  listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: SupportTicketEntity[]; total: number }>;
  addReply?(
    id: string,
    reply: TicketReplyItem,
  ): Promise<SupportTicketEntity | null>;
  statsAdmin?(): Promise<{
    byStatus: Record<string, number>;
    total: number;
    avgResolutionHours?: number;
  }>;
}
