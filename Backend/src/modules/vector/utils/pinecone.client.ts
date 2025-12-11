import { Injectable, Logger } from '@nestjs/common';
import {
  Pinecone,
  type PineconeRecord,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from '@pinecone-database/pinecone';

@Injectable()
export class PineconeWrapper {
  private readonly logger = new Logger(PineconeWrapper.name);
  private client!: Pinecone;
  private indexName!: string;
  private index!: ReturnType<Pinecone['Index']>;

  init(opts: { apiKey: string; indexName: string; host?: string }): void {
    if (!opts.apiKey) throw new Error('PINECONE_API_KEY is required');
    if (!opts.indexName) throw new Error('PINECONE_INDEX_NAME is required');
    this.client = new Pinecone({ apiKey: opts.apiKey });
    this.indexName = opts.indexName;
    // The second parameter expects a string host, not an object wrapper.
    this.index = this.client.Index(opts.indexName, opts.host);
    this.logger.log(
      `Pinecone initialized (index=${opts.indexName}, host=${opts.host ?? 'default'})`,
    );
  }

  getNamespace(name: string): ReturnType<Pinecone['Index']> {
    if (!this.index) throw new Error('Pinecone client not initialized');
    return this.index.namespace(name);
  }

  async ensureCollection(name: string, size: number): Promise<void> {
    if (!this.index) throw new Error('Pinecone client not initialized');
    const stats = await this.index.describeIndexStats();
    const dimension = stats.dimension;
    if (typeof dimension === 'number' && dimension !== size) {
      throw new Error(
        `Pinecone index dimension mismatch (expected ${size}, got ${dimension})`,
      );
    }
    // Namespaces are created lazily on first write; verifying connectivity/dimension is enough.
    this.logger.log(
      `Pinecone namespace ready (namespace=${name}, dim=${dimension ?? 'unknown'})`,
    );
  }

  async upsert(
    namespace: string,
    records: PineconeRecord<RecordMetadata>[],
  ): Promise<void> {
    await this.getNamespace(namespace).upsert(records);
  }

  async query(
    namespace: string,
    input: {
      vector: number[];
      topK: number;
      includeMetadata?: boolean;
      filter?: Record<string, unknown>;
    },
  ): Promise<{ matches?: ScoredPineconeRecord<RecordMetadata>[] }> {
    const res = await this.getNamespace(namespace).query({
      vector: input.vector,
      topK: input.topK,
      includeMetadata: input.includeMetadata ?? true,
      ...(input.filter ? { filter: input.filter } : {}),
    });
    return res;
  }

  async deleteMany(
    namespace: string,
    ids: Array<string | number>,
  ): Promise<void> {
    if (!ids.length) return;
    await this.getNamespace(namespace).deleteMany(ids.map((x) => String(x)));
  }

  async deleteByFilter(
    namespace: string,
    filter: Record<string, unknown>,
  ): Promise<void> {
    // deleteAll() takes no args; deleteMany supports filter-based deletion.
    await this.getNamespace(namespace).deleteMany({ filter });
  }
}
