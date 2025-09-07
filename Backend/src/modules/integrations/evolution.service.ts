import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  WhatsappDeleteInstanceResponse,
  WhatsappInstanceCreateResponse,
  WhatsappSetWebhookResponse,
  WhatsappInstanceInfo,
} from '../merchants/types/evolution.types';

interface EvolutionWebhookResponse {
  webhook?: {
    instanceName: string;
    webhook: {
      url: string;
      webhook_by_events: boolean;
      webhook_base64: boolean;
      events: string[];
      enabled: boolean;
    };
  };
  [key: string]: any;
}

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly baseUrl = (
    process.env.EVOLUTION_API_URL || 'http://evolution_api:8080'
  ).replace(/\/+$/, '');
  private readonly apiKey = process.env.EVOLUTION_API_KEY || '';
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 20_000,
      headers: {
        apikey: this.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      // validateStatus: () => true, // لو تحب تتعامل مع كل الحالات يدويًا
    });
  }

  /** حذف الجلسة إذا كانت موجودة ثم إنشاء جديدة بتوكن جديد */
  async ensureFreshInstance(
    instanceName: string,
  ): Promise<{ qr: string; token: string }> {
    try {
      await this.getStatus(instanceName);
      this.logger.log(`Instance ${instanceName} already exists. Deleting...`);
      await this.deleteInstance(instanceName);
    } catch (err: any) {
      if (err?.response?.status !== 404) throw err;
    }
    const token = uuidv4();
    const { qr } = await this.startSession(instanceName, token);
    return { qr, token };
  }

  async deleteInstance(
    instanceName: string,
  ): Promise<WhatsappDeleteInstanceResponse> {
    try {
      const { data } = await this.http.delete<WhatsappDeleteInstanceResponse>(
        `/instance/delete/${instanceName}`,
      );
      this.logger.log(`Instance ${instanceName} deleted successfully.`);
      return data;
    } catch (err: any) {
      this.logger.error(
        'deleteInstance failed',
        err?.response?.data || err.message,
      );
      if (err?.response?.status !== 404) throw err;
      return {
        status: 'NOT_FOUND',
        error: true,
        response: { message: 'Instance not found' },
      };
    }
  }

  async startSession(
    instanceName: string,
    token: string,
  ): Promise<{ qr: string; token: string; instanceId: string }> {
    try {
      const { data } = await this.http.post<WhatsappInstanceCreateResponse>(
        `/instance/create`,
        { instanceName, token, qrcode: true },
      );
      const base64Qr = data?.qrcode?.base64 || '';
      const instanceId = data?.instance?.instanceId || '';
      return { qr: base64Qr, token, instanceId };
    } catch (err: any) {
      this.logger.error(
        'startSession failed',
        err?.response?.data || err.message,
      );
      throw err;
    }
  }

  async getStatus(instanceName: string): Promise<WhatsappInstanceInfo> {
    try {
      const { data } = await this.http.get(`/instance/fetchInstances`, {
        params: { instanceName },
      });
      if (!data?.instance)
        throw { response: { status: 404 }, message: 'Instance not found' };
      return data.instance as WhatsappInstanceInfo;
    } catch (err: any) {
      this.logger.error('getStatus failed', err?.response?.data || err.message);
      throw err;
    }
  }

  async sendMessage(
    instanceName: string,
    to: string,
    message: string,
  ): Promise<any> {
    try {
      const { data } = await this.http.post(`/message/sendText`, {
        instanceName,
        to,
        message,
      });
      return data;
    } catch (err: any) {
      this.logger.error(
        'sendMessage failed',
        err?.response?.data || err.message,
      );
      throw err;
    }
  }

  /** تعيين Webhook حسب الوثائق الجديدة */
  async setWebhook(
    instanceName: string,
    url: string,
    events: string[] = ['MESSAGES_UPSERT'],
    webhook_by_events = true,
    webhook_base64 = true,
  ): Promise<WhatsappSetWebhookResponse> {
    try {
      const { data } = await this.http.post<WhatsappSetWebhookResponse>(
        `/webhook/set/${instanceName}`,
        {
          url,
          events,
          webhook_by_events,
          webhook_base64,
        },
      );
      this.logger.log(`Webhook set successfully on ${instanceName} -> ${url}`);
      return data;
    } catch (err: any) {
      this.logger.error(
        'setWebhook failed',
        err?.response?.data || err.message,
      );
      throw err;
    }
  }

  async updateWebhook(
    instanceName: string,
    webhookUrl: string,
    events: string[] = ['MESSAGES_UPSERT'],
    webhook_by_events = false,
    webhook_base64 = false,
  ): Promise<EvolutionWebhookResponse> {
    return this.setWebhook(
      instanceName,
      webhookUrl,
      events,
      webhook_by_events,
      webhook_base64,
    ) as any;
  }
}
