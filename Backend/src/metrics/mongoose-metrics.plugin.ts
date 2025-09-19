// src/metrics/mongoose-metrics.plugin.ts
import { Histogram } from 'prom-client';
import { Connection, Query } from 'mongoose';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MongooseMetricsPlugin implements OnModuleInit {
  constructor(
    private readonly conn: Connection,
    @InjectMetric('database_query_duration_seconds')
    private readonly dbQueryDuration: Histogram<string>,
  ) {}

  onModuleInit() {
    const plugin = (schema: any) => {
      schema.pre(
        /^find|count|update|aggregate|delete|insert/i,
        function (this: Query<any, any>, next: Function) {
          (this as any).__start = process.hrtime.bigint();
          next();
        },
      );

      schema.post(
        /^find|count|update|aggregate|delete|insert/i,
        function (this: Query<any, any>, _res: any, next: Function) {
          const op = (this.op || 'unknown').toString();
          const coll = (this as any).mongooseCollection?.name || 'unknown';
          const start = (this as any).__start as bigint | undefined;
          if (start) {
            const sec = Number(process.hrtime.bigint() - start) / 1e9;
            // نستخدم status=ok هنا كليبل ثابت (أضف مسار للأخطاء عندك إن رغبت)
            (global as any).__dbHistogram?.observe?.(
              { operation: op, collection: coll, status: 'ok' },
              sec,
            );
          }
          next();
        },
      );
    };

    // تطبيق على كل السكيمات
    (this.conn as any).plugin(plugin);

    // خزن المرجع عالمياً لاستخدامه داخل الهوكس
    (global as any).__dbHistogram = this.dbQueryDuration;
  }
}
