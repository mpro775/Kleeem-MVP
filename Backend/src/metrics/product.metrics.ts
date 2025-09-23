import { Injectable } from '@nestjs/common';
import { InjectMetric, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

export const ProductMetricsProviders = [
  makeCounterProvider({
    name: 'product_created_total',
    help: 'Total products created',
    labelNames: ['merchant_id', 'category'] as const,
  }),
  makeCounterProvider({
    name: 'product_updated_total',
    help: 'Total products updated',
    labelNames: ['merchant_id', 'category'] as const,
  }),
  makeCounterProvider({
    name: 'product_deleted_total',
    help: 'Total products deleted',
    labelNames: ['merchant_id', 'category'] as const,
  }),
];

@Injectable()
export class ProductMetrics {
  constructor(
    @InjectMetric('product_created_total')
    private readonly created: Counter<string>,
    @InjectMetric('product_updated_total')
    private readonly updated: Counter<string>,
    @InjectMetric('product_deleted_total')
    private readonly deleted: Counter<string>,
  ) {}

  incCreated(merchantId?: string, category?: string): void {
    this.created.inc({
      merchant_id: merchantId || 'unknown',
      category: category || 'none',
    });
  }
  incUpdated(merchantId?: string, category?: string): void {
    this.updated.inc({
      merchant_id: merchantId || 'unknown',
      category: category || 'none',
    });
  }
  incDeleted(merchantId?: string, category?: string): void {
    this.deleted.inc({
      merchant_id: merchantId || 'unknown',
      category: category || 'none',
    });
  }
}
