import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { DEFAULT_TIMEOUT } from 'src/common/constants/common';
import { v4 as uuidv4 } from 'uuid';

import {
  WhatsappDeleteInstanceResponse,
  WhatsappInstanceCreateResponse,
  WhatsappSetWebhookResponse,
  WhatsappInstanceInfo,
  SendMessageResponse,
} from '../merchants/types/evolution.types';

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
      timeout: DEFAULT_TIMEOUT,
      headers: {
        apikey: this.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
    });
  }

  async ensureFreshInstance(
    instanceName: string,
  ): Promise<{ qr: string; token: string }> {
    try {
      await this.getStatus(instanceName);
      this.logger.log(`Instance ${instanceName} already exists. Deleting...`);
      await this.deleteInstance(instanceName);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error?.response?.status !== 404) throw err;
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
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      this.logger.error(
        'deleteInstance failed',
        error?.response?.data || error?.message,
      );
      if (error?.response?.status !== 404) throw err;
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
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      this.logger.error(
        'startSession failed',
        error?.response?.data || error?.message,
      );
      throw err;
    }
  }

  async getStatus(instanceName: string): Promise<WhatsappInstanceInfo> {
    try {
      const { data } = await this.http.get<WhatsappInstanceInfo>(
        `/instance/fetchInstances`,
        {
          params: { instanceName },
        },
      );
      if (!data)
        throw {
          response: { status: 404 },
          message: 'Instance not found',
        } as unknown;
      return data;
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      this.logger.error(
        'getStatus failed',
        error?.response?.data || error?.message,
      );
      throw err;
    }
  }

  async sendMessage(
    instanceName: string,
    to: string,
    message: string,
  ): Promise<unknown> {
    try {
      const { data } = await this.http.post<SendMessageResponse>(
        `/message/sendText`,
        {
          instanceName,
          to,
          message,
        },
      );
      return data;
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      this.logger.error(
        'sendMessage failed',
        error?.response?.data || error?.message,
      );
      throw err;
    }
  }

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
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      this.logger.error(
        'setWebhook failed',
        error?.response?.data || error?.message,
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
  ): Promise<unknown> {
    return await this.setWebhook(
      instanceName,
      webhookUrl,
      events,
      webhook_by_events,
      webhook_base64,
    );
  }
}
