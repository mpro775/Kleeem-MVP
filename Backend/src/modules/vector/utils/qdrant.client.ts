// src/vector/qdrant.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantWrapper {
  private readonly logger = new Logger(QdrantWrapper.name);
  private client!: QdrantClient;

  init(url: string): QdrantClient {
    this.client = new QdrantClient({ url });
    return this.client;
  }

  async ensureCollection(name: string, size: number): Promise<void> {
    const { collections } = await this.client.getCollections();
    if (!collections.find((c) => c.name === name)) {
      try {
        await this.client.createCollection(name, {
          vectors: { size, distance: 'Cosine' },
        });
      } catch (e: unknown) {
        const error = e as { message?: string };
        // سباق إنشاء من مثيل آخر؟ تجاهل لو المجموعة أصبحت موجودة
        if (!/already exists/i.test(error?.message ?? '')) throw e;
      }
    }
  }

  upsert = this.client?.upsert?.bind(this.client) as unknown as (
    collection: string,
    points: unknown,
  ) => Promise<unknown>;
  search = this.client?.search?.bind(this.client) as unknown as (
    collection: string,
    query: unknown,
  ) => Promise<unknown>;
  delete = this.client?.delete?.bind(this.client) as (
    collection: string,
    ids: string[],
  ) => Promise<unknown>;
  getCollections = this.client?.getCollections?.bind(
    this.client,
  ) as () => Promise<unknown>;
}
