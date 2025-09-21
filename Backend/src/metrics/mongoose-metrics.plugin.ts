// src/metrics/mongoose-metrics.plugin.ts
import { Histogram } from 'prom-client';
import { Connection } from 'mongoose';
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { DATABASE_QUERY_DURATION_SECONDS } from './metrics.module';

@Injectable()
export class MongooseMetricsPlugin implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Inject(DATABASE_QUERY_DURATION_SECONDS)
    private readonly dbQueryDuration: Histogram<string>,
  ) {}

  onModuleInit() {
    const histogram = this.dbQueryDuration; // 🤝 التقط المرجع في الإغلاق

    const attach = (schema: any, op: string) => {
      schema.pre(op, function (this: any, next: Function) {
        this.__start = process.hrtime.bigint();
        next();
      });

      schema.post(op, function (this: any, _res: any, next: Function) {
        const coll =
          this?.mongooseCollection?.name ||
          this?.model?.collection?.name ||
          'unknown';

        const start: bigint | undefined = this.__start;
        if (start) {
          const sec = Number(process.hrtime.bigint() - start) / 1e9;
          histogram.observe({ operation: op, collection: coll, status: 'ok' }, sec);
        }
        next();
      });
    };

    const plugin = (schema: any) => {
      // عرّف العمليات صراحةً بدل Regex لالتقاط اسمها بالـ closure
      const ops = [
        'find', 'findOne', 'count', 'countDocuments',
        'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
        'aggregate', 'insertMany',
      ];
      for (const op of ops) attach(schema, op);
    };

    (this.conn as any).plugin(plugin);
  }
}
