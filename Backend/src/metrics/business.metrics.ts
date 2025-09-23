// src/metrics/business.metrics.ts
import { Injectable } from '@nestjs/common';
import { InjectMetric, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

export const BusinessMetricsProviders = [
  makeCounterProvider({
    name: 'merchant_created_total',
    help: 'Total merchants created successfully',
  }),
  makeCounterProvider({
    name: 'n8n_workflow_created_total',
    help: 'Total n8n workflows created',
  }),
  makeCounterProvider({
    name: 'email_verification_sent_total',
    help: 'Total verification emails sent',
  }),
  makeCounterProvider({
    name: 'email_verification_failed_total',
    help: 'Total verification emails failed',
  }),
  makeCounterProvider({
    name: 'password_change_completed_total',
    help: 'Total password changes completed',
  }),
];

@Injectable()
export class BusinessMetrics {
  constructor(
    @InjectMetric('merchant_created_total')
    private readonly merchantCreated: Counter<string>,
    @InjectMetric('n8n_workflow_created_total')
    private readonly n8nWorkflowCreated: Counter<string>,
    @InjectMetric('email_verification_sent_total')
    private readonly emailSent: Counter<string>,
    @InjectMetric('email_verification_failed_total')
    private readonly emailFailed: Counter<string>,
    @InjectMetric('password_change_completed_total')
    private readonly passwordChangeCompleted: Counter<string>,
  ) {}

  incMerchantCreated(): void {
    this.merchantCreated.inc();
  }
  incN8nWorkflowCreated(): void {
    this.n8nWorkflowCreated.inc();
  }
  incEmailSent(): void {
    this.emailSent.inc();
  }
  incEmailFailed(): void {
    this.emailFailed.inc();
  }
  incPasswordChangeCompleted(): void {
    this.passwordChangeCompleted.inc();
  }
}
