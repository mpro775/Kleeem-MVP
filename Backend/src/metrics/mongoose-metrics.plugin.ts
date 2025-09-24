// src/metrics/mongoose-metrics.plugin.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

import type { Connection, Schema } from 'mongoose';
import type { Histogram } from 'prom-client';

const NANOSECONDS_TO_SECONDS = 1e9;

type HookThis = {
  __start?: bigint;
  mongooseCollection?: { name: string };
  model?: { collection?: { name: string } };
};

type NextFn = (err?: unknown) => void;

@Injectable()
export class MongooseMetricsPlugin implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    // ✅ حقن مباشر بالاسم نفسه الذي عرّفناه في makeHistogramProvider
    @InjectMetric('database_query_duration_seconds')
    private readonly dbQueryDuration: Histogram<string>,
  ) {}

  onModuleInit(): void {
    const histogram = this.dbQueryDuration;
    const ops = [
      'find',
      'findOne',
      'count',
      'countDocuments',
      'updateOne',
      'updateMany',
      'deleteOne',
      'deleteMany',
      'aggregate',
      'insertMany',
    ] as const;

    const attach = (schema: Schema, op: string): void => {
      schema.pre(op as never, function (this: HookThis, next: NextFn): void {
        this.__start = process.hrtime.bigint();
        next();
      });

      schema.post(
        op as never,
        function (this: HookThis, _res: unknown, next: NextFn): void {
          const coll =
            this.mongooseCollection?.name ??
            this.model?.collection?.name ??
            'unknown';

          const start: bigint | undefined = this.__start;
          if (start) {
            const sec =
              Number(process.hrtime.bigint() - start) / NANOSECONDS_TO_SECONDS;
            histogram.observe(
              { operation: op, collection: coll, status: 'ok' },
              sec,
            );
          }
          next();
        },
      );
    };

    const plugin = (schema: Schema): void => {
      for (const op of ops) attach(schema, op);
    };

    this.conn.plugin(plugin);
  }
}
