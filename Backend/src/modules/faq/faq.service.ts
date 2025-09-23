import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OutboxService } from 'src/common/outbox/outbox.service';

import { NotificationsService } from '../notifications/notifications.service';
import { VectorService } from '../vector/vector.service';

import { FaqRepository } from './repositories/faq.repository';
import { Faq } from './schemas/faq.schema';

// ======= Constants =======
const STATUS_PENDING = 'pending' as const;
const STATUS_COMPLETED = 'completed' as const;
const STATUS_FAILED = 'failed' as const;

const SOURCE_MANUAL = 'manual' as const;
const TYPE_FAQ = 'faq' as const;

const MSG_PREVIEW_LEN = 80;

const EXCHANGE_KNOWLEDGE = 'knowledge.index' as const;
const RK_FAQ_COMPLETED = 'faq.completed' as const;
const RK_FAQ_FAILED = 'faq.failed' as const;
const RK_FAQ_UPDATED = 'faq.updated' as const;
const RK_FAQ_UPDATE_FAILED = 'faq.update_failed' as const;

// ======= Types =======
type IdLike = string | Types.ObjectId;

interface FaqLean {
  _id: Types.ObjectId;
  question: string;
  answer: string;
  status?: string;
  errorMessage?: string | null;
}

interface UpsertVector {
  id: string;
  vector: number[];
  payload: {
    merchantId: string;
    faqId: string;
    question: string;
    answer: string;
    type: typeof TYPE_FAQ;
    source: typeof SOURCE_MANUAL;
  };
}

interface BatchResult {
  success: true;
  queued: number;
  message: string;
  ids: string[];
}

interface SoftDeleteResult {
  success: true;
  softDeleted: true;
}

interface HardDeleteResult {
  success: true;
  deleted: 1;
}

interface DeleteAllHard {
  success: true;
  deleted: number;
  mode: 'hard';
}
interface DeleteAllSoft {
  success: true;
  softDeleted: number;
  mode: 'soft';
}

interface FaqStatusCounts {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  deleted: number;
}

// ======= Helpers =======
function toIdString(v: IdLike): string {
  return typeof v === 'string' ? v : v.toString();
}
function isError(x: unknown): x is Error {
  return typeof x === 'object' && x !== null && 'message' in x;
}

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(
    @Inject('FaqRepository') private readonly repo: FaqRepository,
    private readonly vectorService: VectorService,
    private readonly notifications: NotificationsService,
    private readonly outbox: OutboxService,
  ) {}

  /** إدراج جماعي: pending ثم معالجة خلفية */
  async createMany(
    merchantId: string,
    faqs: { question: string; answer: string }[],
    requestedBy?: string,
  ): Promise<BatchResult> {
    if (!faqs || faqs.length === 0) {
      throw new BadRequestException('No FAQs provided');
    }

    const created = await this.repo.insertManyPending(merchantId, faqs);
    const createdIds = created.map((d: FaqLean) => toIdString(d._id));

    if (requestedBy) {
      await this.notifications.notifyUser(requestedBy, {
        type: 'faq.queued',
        title: 'تمت جدولة أسئلة شائعة',
        body: `عدد العناصر: ${created.length}`,
        merchantId,
        severity: 'info',
        data: { count: created.length },
      });
    }

    // معالجة بالخلفية (fire-and-forget)
    this.processFaqsInBackground(merchantId, createdIds, requestedBy).catch(
      (err: unknown) => {
        const msg = isError(err) ? err.message : String(err);
        const stack = isError(err) ? err.stack : undefined;
        this.logger.error(`[createMany] background error: ${msg}`, stack);
      },
    );

    return {
      success: true,
      queued: created.length,
      message: 'FAQs queued for embedding',
      ids: createdIds,
    };
  }

  private async processFaqsInBackground(
    merchantId: string,
    ids: string[],
    requestedBy?: string,
  ): Promise<void> {
    let done = 0;
    let failed = 0;

    for (const id of ids) {
      const faq = (await this.repo.findByIdForMerchant(
        id,
        merchantId,
      )) as FaqLean | null;
      if (!faq) continue;

      try {
        await this.upsertFaqEmbedding(
          merchantId,
          toIdString(faq._id),
          faq.question,
          faq.answer,
        );

        await this.repo.updateFieldsById(faq._id, {
          status: STATUS_COMPLETED,
          errorMessage: undefined,
        } as Partial<Faq>);
        done++;

        await this.notifySuccessEmbedding(
          requestedBy,
          merchantId,
          toIdString(faq._id),
          faq.question,
        );
        await this.enqueueOutbox(
          EXCHANGE_KNOWLEDGE,
          RK_FAQ_COMPLETED,
          merchantId,
          {
            merchantId,
            faqId: toIdString(faq._id),
          },
        );
      } catch (e: unknown) {
        const msg = isError(e) ? e.message : 'Embedding failed';
        this.logger.error(`[processFaqs] failed for ${id}: ${msg}`);

        await this.repo.updateFieldsById(id, {
          status: STATUS_FAILED,
          errorMessage: msg,
        } as Partial<Faq>);
        failed++;

        await this.notifyFailedEmbedding(
          requestedBy,
          merchantId,
          id,
          faq.question,
          msg,
        );
        await this.enqueueOutbox(
          EXCHANGE_KNOWLEDGE,
          RK_FAQ_FAILED,
          merchantId,
          {
            merchantId,
            faqId: id,
            error: msg,
          },
        );
      }
    }

    if (requestedBy) {
      await this.notifications.notifyUser(requestedBy, {
        type: 'embeddings.batch.completed',
        title: 'انتهى تدريب الأسئلة الشائعة',
        body: `تمت: ${done} — فشلت: ${failed} — المجموع: ${ids.length}`,
        merchantId,
        severity: failed ? 'warning' : 'success',
        data: { done, failed, total: ids.length },
      });
    }
    this.logger.log(`[processFaqs] Completed batch of ${ids.length}`);
  }

  async list(
    merchantId: string,
    includeDeleted = false,
  ): Promise<
    Array<
      Pick<Faq, 'question' | 'answer' | 'status' | 'errorMessage'> & {
        _id: Types.ObjectId;
        createdAt?: Date;
      }
    >
  > {
    return this.repo.listByMerchant(merchantId, includeDeleted);
  }

  async getStatus(merchantId: string): Promise<FaqStatusCounts> {
    return this.repo.getStatusCounts(merchantId);
  }

  async updateOne(
    merchantId: string,
    faqId: string,
    data: { question?: string; answer?: string },
    requestedBy?: string,
  ): Promise<{ success: true }> {
    if (!Types.ObjectId.isValid(faqId)) {
      throw new BadRequestException('invalid id');
    }

    const faq = (await this.repo.findByIdForMerchant(
      faqId,
      merchantId,
    )) as FaqLean | null;
    if (!faq) throw new NotFoundException('faq not found');

    const question = data.question ?? faq.question;
    const answer = data.answer ?? faq.answer;

    await this.repo.updateFieldsById(faqId, {
      question,
      answer,
      status: STATUS_PENDING,
      errorMessage: undefined,
    } as Partial<Faq>);

    try {
      await this.upsertFaqEmbedding(merchantId, faqId, question, answer);

      await this.repo.updateFieldsById(faqId, {
        status: STATUS_COMPLETED,
      } as Partial<Faq>);

      await this.notifyFaqUpdated(requestedBy, merchantId, faqId);
      await this.enqueueOutbox(EXCHANGE_KNOWLEDGE, RK_FAQ_UPDATED, merchantId, {
        merchantId,
        faqId,
      });

      return { success: true };
    } catch (e: unknown) {
      const msg = isError(e) ? e.message : 'Embedding failed';

      await this.repo.updateFieldsById(faqId, {
        status: STATUS_FAILED,
        errorMessage: msg,
      } as Partial<Faq>);

      await this.notifyFailedEmbedding(
        requestedBy,
        merchantId,
        faqId,
        undefined,
        msg,
      );
      await this.enqueueOutbox(
        EXCHANGE_KNOWLEDGE,
        RK_FAQ_UPDATE_FAILED,
        merchantId,
        {
          merchantId,
          faqId,
          error: msg,
        },
      );

      throw isError(e) ? e : new Error(msg);
    }
  }

  async softDelete(
    merchantId: string,
    faqId: string,
  ): Promise<SoftDeleteResult> {
    if (!Types.ObjectId.isValid(faqId)) {
      throw new BadRequestException('invalid id');
    }
    const ok = await this.repo.softDeleteById(merchantId, faqId);
    if (!ok) throw new NotFoundException('faq not found');
    return { success: true, softDeleted: true };
  }

  async hardDelete(
    merchantId: string,
    faqId: string,
  ): Promise<HardDeleteResult> {
    if (!Types.ObjectId.isValid(faqId)) {
      throw new BadRequestException('invalid id');
    }

    const faq = await this.repo.findByIdForMerchant(faqId, merchantId);
    if (!faq) throw new NotFoundException('faq not found');

    await this.vectorService.deleteFaqPointByFaqId(faqId);
    const ok = await this.repo.hardDeleteById(merchantId, faqId);
    if (!ok) throw new NotFoundException('faq not found');

    return { success: true, deleted: 1 };
  }

  async deleteAll(
    merchantId: string,
    hard = false,
  ): Promise<DeleteAllHard | DeleteAllSoft> {
    if (hard) {
      await this.vectorService.deleteFaqsByFilter({
        must: [
          { key: 'merchantId', match: { value: merchantId } },
          { key: 'source', match: { value: SOURCE_MANUAL } },
        ],
      });
      const deleted = await this.repo.hardDeleteAll(merchantId);
      return { success: true, deleted, mode: 'hard' };
    }

    const softDeleted = await this.repo.softDeleteAll(merchantId);
    return { success: true, softDeleted, mode: 'soft' };
  }

  // ======= Private extracted logic to reduce size/complexity =======
  private async upsertFaqEmbedding(
    merchantId: string,
    faqId: string,
    question: string,
    answer: string,
  ): Promise<void> {
    const embedding = await this.vectorService.embedText(
      `${question}\n${answer}`,
    );
    const upsert: UpsertVector = {
      id: this.vectorService.generateFaqId(faqId),
      vector: embedding,
      payload: {
        merchantId,
        faqId,
        question,
        answer,
        type: TYPE_FAQ,
        source: SOURCE_MANUAL,
      },
    };
    await this.vectorService.upsertFaqs([upsert]);
  }

  private async notifySuccessEmbedding(
    requestedBy: string | undefined,
    merchantId: string,
    faqId: string,
    question: string,
  ): Promise<void> {
    if (!requestedBy) return;
    await this.notifications.notifyUser(requestedBy, {
      type: 'embeddings.completed',
      title: 'تم تدريب سؤال/جواب',
      body: (question ?? '').slice(0, MSG_PREVIEW_LEN),
      merchantId,
      severity: 'success',
      data: { faqId },
    });
  }

  private async notifyFailedEmbedding(
    requestedBy: string | undefined,
    merchantId: string,
    faqId: string,
    questionOrId?: string,
    errorMsg?: string,
  ): Promise<void> {
    if (!requestedBy) return;
    await this.notifications.notifyUser(requestedBy, {
      type: 'embeddings.failed',
      title: 'فشل تدريب سؤال/جواب',
      body: (questionOrId ?? faqId).slice(0, MSG_PREVIEW_LEN),
      merchantId,
      severity: 'error',
      data: { faqId, error: errorMsg },
    });
  }

  private async notifyFaqUpdated(
    requestedBy: string | undefined,
    merchantId: string,
    faqId: string,
  ): Promise<void> {
    if (!requestedBy) return;
    await this.notifications.notifyUser(requestedBy, {
      type: 'faq.updated',
      title: 'تم تحديث سؤال شائع',
      body: 'تم تحديث سؤال/جواب بنجاح.',
      merchantId,
      severity: 'success',
      data: { faqId },
    });
  }

  private async enqueueOutbox(
    exchange: string,
    routingKey: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.outbox
      .enqueueEvent({
        exchange,
        routingKey,
        eventType: `knowledge.${routingKey}`,
        aggregateType: 'knowledge',
        aggregateId,
        payload,
      })
      .catch(() => undefined);
  }
}
