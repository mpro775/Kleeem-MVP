import { Test, type TestingModule } from '@nestjs/testing';

import { VectorService } from '../../../vector/vector.service';
import { BotFaqService } from '../botFaq.service';
import { BOT_FAQ_REPOSITORY } from '../tokens';

import type { BotFaqRepository } from '../repositories/bot-faq.repository';

describe('BotFaqService', () => {
  let service: BotFaqService;

  const repo: jest.Mocked<BotFaqRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    softDelete: jest.fn(),
    findAllActiveSorted: jest.fn(),
    findAllActiveLean: jest.fn(),
    insertMany: jest.fn(),
    updateManyByIds: jest.fn(),
  };

  const vector: jest.Mocked<
    Pick<
      VectorService,
      'embedText' | 'upsertBotFaqs' | 'deleteBotFaqPoint' | 'searchBotFaqs'
    >
  > = {
    embedText: jest.fn(),
    upsertBotFaqs: jest.fn(),
    deleteBotFaqPoint: jest.fn(),
    searchBotFaqs: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotFaqService,
        { provide: BOT_FAQ_REPOSITORY, useValue: repo },
        { provide: VectorService, useValue: vector },
      ],
    }).compile();

    service = module.get(BotFaqService);
  });

  it('create embeds & upserts then marks ok', async () => {
    repo.create.mockResolvedValue({
      _id: '1',
      question: 'Q',
      answer: 'A',
    } as any);
    vector.embedText.mockResolvedValue([0.1, 0.2, 0.3] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateById.mockResolvedValue({ _id: '1', vectorStatus: 'ok' } as any);

    const res = await service.create(
      { question: 'Q', answer: 'A' } as any,
      'u1',
    );
    expect(vector.embedText).toHaveBeenCalled();
    expect(vector.upsertBotFaqs).toHaveBeenCalled();
    expect(repo.updateById.bind(repo)).toHaveBeenCalledWith('1', {
      vectorStatus: 'ok',
    } as any);
    expect((res as any).vectorStatus).toBe('ok');
  });

  it('should handle FAQ creation with minimal data', async () => {
    repo.create.mockResolvedValue({
      _id: '2',
      question: 'سؤال بسيط',
      answer: 'إجابة بسيطة',
    } as any);
    vector.embedText.mockResolvedValue([0.1, 0.2, 0.3] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateById.mockResolvedValue({ _id: '2', vectorStatus: 'ok' } as any);

    const result = await service.create({
      question: 'سؤال بسيط',
      answer: 'إجابة بسيطة',
    } as any);

    expect(repo.create).toHaveBeenCalledWith({
      question: 'سؤال بسيط',
      answer: 'إجابة بسيطة',
      vectorStatus: 'pending',
    });
    expect(result).toBeDefined();
  });

  it('should handle FAQ creation with all optional fields', async () => {
    repo.create.mockResolvedValue({
      _id: '3',
      question: 'سؤال شامل',
      answer: 'إجابة شاملة',
      source: 'imported',
      tags: ['شامل', 'مفصل'],
      locale: 'ar',
    } as any);
    vector.embedText.mockResolvedValue([0.1, 0.2, 0.3] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateById.mockResolvedValue({ _id: '3', vectorStatus: 'ok' } as any);

    const result = await service.create({
      question: 'سؤال شامل',
      answer: 'إجابة شاملة',
      source: 'imported',
      tags: ['شامل', 'مفصل'],
      locale: 'ar',
    } as any);

    expect(repo.create).toHaveBeenCalledWith({
      question: 'سؤال شامل',
      answer: 'إجابة شاملة',
      source: 'imported',
      tags: ['شامل', 'مفصل'],
      locale: 'ar',
      vectorStatus: 'pending',
    });
    expect(result).toBeDefined();
  });

  it('should handle embedding failure during creation', async () => {
    repo.create.mockResolvedValue({
      _id: '4',
      question: 'سؤال مع خطأ',
      answer: 'إجابة مع خطأ',
    } as any);
    vector.embedText.mockRejectedValue(new Error('Embedding failed'));
    repo.updateById.mockResolvedValue({
      _id: '4',
      vectorStatus: 'failed',
    } as any);

    await expect(
      service.create({
        question: 'سؤال مع خطأ',
        answer: 'إجابة مع خطأ',
      } as any),
    ).rejects.toThrow('Embedding failed');

    expect(repo.updateById).toHaveBeenCalledWith('4', {
      vectorStatus: 'failed',
    });
  });

  it('should handle upsert failure during creation', async () => {
    repo.create.mockResolvedValue({
      _id: '5',
      question: 'سؤال مع فشل في الرفع',
      answer: 'إجابة مع فشل في الرفع',
    } as any);
    vector.embedText.mockResolvedValue([0.1, 0.2, 0.3] as any);
    vector.upsertBotFaqs.mockRejectedValue(new Error('Upsert failed'));
    repo.updateById.mockResolvedValue({
      _id: '5',
      vectorStatus: 'failed',
    } as any);

    await expect(
      service.create({
        question: 'سؤال مع فشل في الرفع',
        answer: 'إجابة مع فشل في الرفع',
      } as any),
    ).rejects.toThrow('Upsert failed');

    expect(repo.updateById).toHaveBeenCalledWith('5', {
      vectorStatus: 'failed',
    });
  });

  it('update triggers reindex when fields changed', async () => {
    repo.findById.mockResolvedValue({
      _id: '1',
      question: 'Q',
      answer: 'A',
    } as any);
    repo.updateById.mockResolvedValue({
      _id: '1',
      question: 'Q2',
      answer: 'A',
    } as any);
    vector.embedText.mockResolvedValue([0.4] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);

    const out = await service.update('1', { question: 'Q2' } as any);
    expect(vector.embedText).toHaveBeenCalled();
    expect(vector.upsertBotFaqs).toHaveBeenCalled();
    expect(repo.updateById.bind(repo)).toHaveBeenLastCalledWith('1', {
      vectorStatus: 'ok',
    } as any);
    expect((out as any)._id).toBe('1');
  });

  it('delete soft deletes and removes vector point', async () => {
    repo.softDelete.mockResolvedValue({ _id: '1', status: 'deleted' } as any);
    vector.deleteBotFaqPoint.mockResolvedValue(undefined as any);
    const res = await service.delete('1');
    expect(repo.softDelete.bind(repo)).toHaveBeenCalledWith('1');
    expect(vector.deleteBotFaqPoint).toHaveBeenCalled();
    expect((res as any).status).toBe('deleted');
  });

  it('semanticSearch delegates to vector service', async () => {
    vector.searchBotFaqs.mockResolvedValue([{ score: 0.9 }] as any);
    const r = await service.semanticSearch('hello', 3);
    expect(vector.searchBotFaqs).toHaveBeenCalledWith('hello', 3);
    expect(r[0].score).toBe(0.9);
  });

  it('reindexAll embeds all active and marks ok', async () => {
    repo.findAllActiveLean.mockResolvedValue([
      { _id: 'a', question: 'q1', answer: 'a1' },
      { _id: 'b', question: 'q2', answer: 'a2' },
    ] as any);
    vector.embedText
      .mockResolvedValueOnce([0.1] as any)
      .mockResolvedValueOnce([0.2] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateManyByIds.mockResolvedValue(undefined as any);

    const out = await service.reindexAll();
    expect(vector.embedText).toHaveBeenCalledTimes(2);
    expect(vector.upsertBotFaqs).toHaveBeenCalled();
    expect(repo.updateManyByIds.bind(repo)).toHaveBeenCalledWith(['a', 'b'], {
      vectorStatus: 'ok',
    } as any);
    expect(out.count).toBe(2);
  });

  it('should handle findAll with no FAQs', async () => {
    repo.findAllActiveSorted.mockResolvedValue([]);

    const result = await service.findAll();

    expect(repo.findAllActiveSorted).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should handle findAll with many FAQs', async () => {
    const faqs = Array(100)
      .fill(null)
      .map((_, i) => ({
        _id: `faq_${i}`,
        question: `سؤال ${i}`,
        answer: `إجابة ${i}`,
      })) as any;

    repo.findAllActiveSorted.mockResolvedValue(faqs);

    const result = await service.findAll();

    expect(result).toHaveLength(100);
  });

  it('should handle semantic search with no results', async () => {
    vector.searchBotFaqs.mockResolvedValue([]);

    const result = await service.semanticSearch('موضوع غير موجود', 5);

    expect(vector.searchBotFaqs).toHaveBeenCalledWith('موضوع غير موجود', 5);
    expect(result).toEqual([]);
  });

  it('should handle semantic search with default limit', async () => {
    const results = [
      { id: '1', question: 'سؤال 1', answer: 'إجابة 1', score: 0.9 },
    ] as any;

    vector.searchBotFaqs.mockResolvedValue(results);

    const result = await service.semanticSearch('سؤال');

    expect(vector.searchBotFaqs).toHaveBeenCalledWith('سؤال', 5);
    expect(result).toEqual(results);
  });

  it('should handle update with no reindexing for non-content fields', async () => {
    repo.findById.mockResolvedValue({
      _id: '1',
      question: 'Q',
      answer: 'A',
      source: 'manual',
    } as any);
    repo.updateById.mockResolvedValue({
      _id: '1',
      question: 'Q',
      answer: 'A',
      source: 'auto', // تغيير في source فقط
    } as any);

    const result = await service.update('1', { source: 'auto' } as any);

    expect(vector.embedText).not.toHaveBeenCalled();
    expect(vector.upsertBotFaqs).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should handle update with reindexing for question change', async () => {
    repo.findById.mockResolvedValue({
      _id: '2',
      question: 'سؤال قديم',
      answer: 'إجابة قديمة',
    } as any);
    repo.updateById
      .mockResolvedValueOnce({
        _id: '2',
        question: 'سؤال جديد',
        answer: 'إجابة قديمة',
        vectorStatus: 'pending',
      } as any)
      .mockResolvedValueOnce({
        _id: '2',
        question: 'سؤال جديد',
        answer: 'إجابة قديمة',
        vectorStatus: 'ok',
      } as any);

    vector.embedText.mockResolvedValue([0.1] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);

    const result = await service.update('2', { question: 'سؤال جديد' } as any);

    expect(vector.embedText).toHaveBeenCalledWith('سؤال جديد\nإجابة قديمة');
    expect(result).toBeDefined();
  });

  it('should handle update with reindexing for answer change', async () => {
    repo.findById.mockResolvedValue({
      _id: '3',
      question: 'سؤال',
      answer: 'إجابة قديمة',
    } as any);
    repo.updateById
      .mockResolvedValueOnce({
        _id: '3',
        question: 'سؤال',
        answer: 'إجابة جديدة',
        vectorStatus: 'pending',
      } as any)
      .mockResolvedValueOnce({
        _id: '3',
        question: 'سؤال',
        answer: 'إجابة جديدة',
        vectorStatus: 'ok',
      } as any);

    vector.embedText.mockResolvedValue([0.1] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);

    const result = await service.update('3', { answer: 'إجابة جديدة' } as any);

    expect(vector.embedText).toHaveBeenCalledWith('سؤال\nإجابة جديدة');
    expect(result).toBeDefined();
  });

  it('should handle update with reindexing for tags change', async () => {
    repo.findById.mockResolvedValue({
      _id: '4',
      question: 'سؤال',
      answer: 'إجابة',
      tags: ['قديم'],
    } as any);
    repo.updateById
      .mockResolvedValueOnce({
        _id: '4',
        question: 'سؤال',
        answer: 'إجابة',
        tags: ['جديد'],
        vectorStatus: 'pending',
      } as any)
      .mockResolvedValueOnce({
        _id: '4',
        question: 'سؤال',
        answer: 'إجابة',
        tags: ['جديد'],
        vectorStatus: 'ok',
      } as any);

    vector.embedText.mockResolvedValue([0.1] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);

    const result = await service.update('4', { tags: ['جديد'] } as any);

    expect(vector.embedText).toHaveBeenCalledWith('سؤال\nإجابة');
    expect(result).toBeDefined();
  });

  it('should return null when updating non-existent FAQ', async () => {
    repo.findById.mockResolvedValue(null);

    const result = await service.update('nonexistent', {
      question: 'جديد',
    } as any);

    expect(result).toBeNull();
  });

  it('should handle bulk import with multiple items', async () => {
    const bulkData = {
      items: [
        { question: 'سؤال 1', answer: 'إجابة 1' },
        { question: 'سؤال 2', answer: 'إجابة 2' },
      ],
    };

    const createdFaqs = [
      {
        _id: 'bulk1',
        question: 'سؤال 1',
        answer: 'إجابة 1',
        vectorStatus: 'pending',
      },
      {
        _id: 'bulk2',
        question: 'سؤال 2',
        answer: 'إجابة 2',
        vectorStatus: 'pending',
      },
    ] as any;

    repo.insertMany.mockResolvedValue(createdFaqs);
    vector.embedText
      .mockResolvedValueOnce([0.1] as any)
      .mockResolvedValueOnce([0.2] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateManyByIds.mockResolvedValue(undefined as any);

    const result = await service.bulkImport(bulkData);

    expect(repo.insertMany).toHaveBeenCalled();
    expect(vector.embedText).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ inserted: 2 });
  });

  it('should handle bulk import with createdBy', async () => {
    const bulkData = {
      items: [{ question: 'سؤال', answer: 'إجابة' }],
    };

    const createdFaqs = [
      {
        _id: 'bulk3',
        question: 'سؤال',
        answer: 'إجابة',
        vectorStatus: 'pending',
        createdBy: 'user1',
      },
    ] as any;

    repo.insertMany.mockResolvedValue(createdFaqs);
    vector.embedText.mockResolvedValue([0.1] as any);
    vector.upsertBotFaqs.mockResolvedValue(undefined as any);
    repo.updateManyByIds.mockResolvedValue(undefined as any);

    const result = await service.bulkImport(bulkData, 'user1');

    expect(repo.insertMany).toHaveBeenCalledWith([
      {
        question: 'سؤال',
        answer: 'إجابة',
        vectorStatus: 'pending',
        createdBy: 'user1',
      },
    ]);
    expect(result).toEqual({ inserted: 1 });
  });

  it('should handle bulk import with embedding failure', async () => {
    const bulkData = {
      items: [{ question: 'سؤال', answer: 'إجابة' }],
    };

    const createdFaqs = [
      {
        _id: 'bulk4',
        question: 'سؤال',
        answer: 'إجابة',
        vectorStatus: 'pending',
      },
    ] as any;

    repo.insertMany.mockResolvedValue(createdFaqs);
    vector.embedText.mockRejectedValue(new Error('Embedding failed'));

    await expect(service.bulkImport(bulkData)).rejects.toThrow(
      'Embedding failed',
    );
  });

  it('should handle delete with vector removal failure', async () => {
    repo.softDelete.mockResolvedValue({
      _id: '1',
      question: 'سؤال محذوف',
      answer: 'إجابة محذوفة',
      deletedAt: new Date(),
    } as any);
    vector.deleteBotFaqPoint.mockRejectedValue(
      new Error('Vector deletion failed'),
    );

    const result = await service.delete('1');

    expect(repo.softDelete).toHaveBeenCalledWith('1');
    expect(vector.deleteBotFaqPoint).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
