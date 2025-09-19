import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Faq } from './schemas/faq.schema';
import { VectorService } from '../vector/vector.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from 'src/common/outbox/outbox.service';
import { FaqRepository } from './repositories/faq.repository';

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
  ) {
    if (!faqs?.length) throw new BadRequestException('No FAQs provided');

    const created = await this.repo.insertManyPending(merchantId, faqs);

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

    // معالجة بالخلفية (بدون انتظار)
    this.processFaqsInBackground(
      merchantId,
      created.map((d: any) => String(d._id)),
      requestedBy,
    ).catch((err) =>
      this.logger.error(
        `[createMany] background error: ${err.message}`,
        err.stack,
      ),
    );

    return {
      success: true,
      queued: created.length,
      message: 'FAQs queued for embedding',
      ids: created.map((d: any) => d._id),
    };
  }

  private async processFaqsInBackground(
    merchantId: string,
    ids: string[],
    requestedBy?: string,
  ) {
    let done = 0,
      failed = 0;

    for (const id of ids) {
      const faq = await this.repo.findByIdForMerchant(id, merchantId);
      if (!faq) continue;

      try {
        const text = `${faq.question}\n${faq.answer}`;
        const embedding = await this.vectorService.embedText(text);

        await this.vectorService.upsertFaqs([
          {
            id: this.vectorService.generateFaqId(String((faq as any)._id)),
            vector: embedding,
            payload: {
              merchantId,
              faqId: String((faq as any)._id),
              question: faq.question,
              answer: faq.answer,
              type: 'faq',
              source: 'manual',
            },
          },
        ]);

        await this.repo.updateFieldsById((faq as any)._id, {
          status: 'completed',
          errorMessage: undefined,
        } as Partial<Faq>);
        done++;

        if (requestedBy) {
          await this.notifications.notifyUser(requestedBy, {
            type: 'embeddings.completed',
            title: 'تم تدريب سؤال/جواب',
            body: (faq.question || '').slice(0, 80),
            merchantId,
            severity: 'success',
            data: { faqId: String((faq as any)._id) },
          });
        }

        await this.outbox
          .enqueueEvent({
            exchange: 'knowledge.index',
            routingKey: 'faq.completed',
            eventType: 'knowledge.faq.completed',
            aggregateType: 'knowledge',
            aggregateId: merchantId,
            payload: { merchantId, faqId: String((faq as any)._id) },
          })
          .catch(() => {});
      } catch (e: any) {
        this.logger.error(`[processFaqs] failed for ${id}: ${e.message}`);
        await this.repo.updateFieldsById(id, {
          status: 'failed',
          errorMessage: e.message || 'Embedding failed',
        } as Partial<Faq>);
        failed++;

        if (requestedBy) {
          await this.notifications.notifyUser(requestedBy, {
            type: 'embeddings.failed',
            title: 'فشل تدريب سؤال/جواب',
            body: (faq as any)?.question?.slice(0, 80) ?? id,
            merchantId,
            severity: 'error',
            data: { faqId: id, error: e.message },
          });
        }

        await this.outbox
          .enqueueEvent({
            exchange: 'knowledge.index',
            routingKey: 'faq.failed',
            eventType: 'knowledge.faq.failed',
            aggregateType: 'knowledge',
            aggregateId: merchantId,
            payload: { merchantId, faqId: id, error: e.message },
          })
          .catch(() => {});
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

  async list(merchantId: string, includeDeleted = false) {
    return this.repo.listByMerchant(merchantId, includeDeleted);
  }

  async getStatus(merchantId: string) {
    return this.repo.getStatusCounts(merchantId);
  }

  async updateOne(
    merchantId: string,
    faqId: string,
    data: { question?: string; answer?: string },
    requestedBy?: string,
  ) {
    if (!Types.ObjectId.isValid(faqId))
      throw new BadRequestException('invalid id');

    const faq = await this.repo.findByIdForMerchant(faqId, merchantId);
    if (!faq) throw new NotFoundException('faq not found');

    const question = data.question ?? faq.question;
    const answer = data.answer ?? faq.answer;

    await this.repo.updateFieldsById(faqId, {
      question,
      answer,
      status: 'pending',
      errorMessage: undefined,
    } as Partial<Faq>);

    try {
      const embedding = await this.vectorService.embedText(
        `${question}\n${answer}`,
      );
      await this.vectorService.upsertFaqs([
        {
          id: this.vectorService.generateFaqId(faqId),
          vector: embedding,
          payload: {
            merchantId,
            faqId,
            question,
            answer,
            type: 'faq',
            source: 'manual',
          },
        },
      ]);

      await this.repo.updateFieldsById(faqId, {
        status: 'completed',
      } as Partial<Faq>);

      if (requestedBy) {
        await this.notifications.notifyUser(requestedBy, {
          type: 'faq.updated',
          title: 'تم تحديث سؤال شائع',
          body: `تم تحديث سؤال/جواب بنجاح.`,
          merchantId,
          severity: 'success',
          data: { faqId },
        });
      }

      await this.outbox
        .enqueueEvent({
          exchange: 'knowledge.index',
          routingKey: 'faq.updated',
          eventType: 'knowledge.faq.updated',
          aggregateType: 'knowledge',
          aggregateId: merchantId,
          payload: { merchantId, faqId },
        })
        .catch(() => {});
    } catch (e: any) {
      await this.repo.updateFieldsById(faqId, {
        status: 'failed',
        errorMessage: e.message || 'Embedding failed',
      } as Partial<Faq>);

      if (requestedBy) {
        await this.notifications.notifyUser(requestedBy, {
          type: 'embeddings.failed',
          title: 'فشل تحديث سؤال/جواب',
          body: e?.message || 'خطأ غير معروف',
          merchantId,
          severity: 'error',
          data: { faqId, error: e?.message },
        });
      }

      await this.outbox
        .enqueueEvent({
          exchange: 'knowledge.index',
          routingKey: 'faq.update_failed',
          eventType: 'knowledge.faq.update_failed',
          aggregateType: 'knowledge',
          aggregateId: merchantId,
          payload: { merchantId, faqId, error: e?.message },
        })
        .catch(() => {});

      throw e;
    }

    return { success: true };
  }

  async softDelete(merchantId: string, faqId: string) {
    if (!Types.ObjectId.isValid(faqId))
      throw new BadRequestException('invalid id');
    const ok = await this.repo.softDeleteById(merchantId, faqId);
    if (!ok) throw new NotFoundException('faq not found');
    return { success: true, softDeleted: true };
  }

  async hardDelete(merchantId: string, faqId: string) {
    if (!Types.ObjectId.isValid(faqId))
      throw new BadRequestException('invalid id');

    const faq = await this.repo.findByIdForMerchant(faqId, merchantId);
    if (!faq) throw new NotFoundException('faq not found');

    await this.vectorService.deleteFaqPointByFaqId(faqId);
    const ok = await this.repo.hardDeleteById(merchantId, faqId);
    if (!ok) throw new NotFoundException('faq not found');

    return { success: true, deleted: 1 };
  }

  async deleteAll(merchantId: string, hard = false) {
    if (hard) {
      await this.vectorService.deleteFaqsByFilter({
        must: [
          { key: 'merchantId', match: { value: merchantId } },
          { key: 'source', match: { value: 'manual' } },
        ],
      });
      const deleted = await this.repo.hardDeleteAll(merchantId);
      return { success: true, deleted, mode: 'hard' };
    } else {
      const softDeleted = await this.repo.softDeleteAll(merchantId);
      return { success: true, softDeleted, mode: 'soft' };
    }
  }
}
