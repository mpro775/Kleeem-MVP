// src/vector/qdrant.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantWrapper {
  private readonly logger = new Logger(QdrantWrapper.name);
  private client!: QdrantClient;

  init(url: string) {
    this.client = new QdrantClient({ url });
    return this.client;
  }

  async ensureCollection(name: string, size: number) {
    const { collections } = await this.client.getCollections();
    if (!collections.find((c) => c.name === name)) {
      try {
        await this.client.createCollection(name, {
          vectors: { size, distance: 'Cosine' },
        });
      } catch (e: any) {
        // سباق إنشاء من مثيل آخر؟ تجاهل لو المجموعة أصبحت موجودة
        if (!/already exists/i.test(e?.message ?? '')) throw e;
      }
    }
  }

  upsert = this.client?.upsert?.bind(this.client);
  search = this.client?.search?.bind(this.client);
  delete = this.client?.delete?.bind(this.client);
  getCollections = this.client?.getCollections?.bind(this.client);
}
