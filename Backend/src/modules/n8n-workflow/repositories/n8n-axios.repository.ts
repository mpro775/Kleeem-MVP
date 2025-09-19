import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  N8nClientRepository,
  WorkflowCreatePayload,
} from './n8n-client.repository';
import { WorkflowDefinition } from '../types';

@Injectable()
export class N8nAxiosRepository implements N8nClientRepository {
  private api: AxiosInstance;
  private readonly logger = new Logger(N8nAxiosRepository.name);

  constructor() {
    const keyName = 'X-N8N-API-KEY';
    const apiKey = process.env.N8N_API_KEY!;
    const baseUrl = (
      process.env.N8N_API_URL || 'https://n8n.kaleem-ai.com'
    ).replace(/\/+$/, '');

    this.logger.log(`[n8n.baseURL] = ${baseUrl}`);
    this.logger.log(
      `[n8n.header]  = ${keyName}: ${apiKey ? apiKey.slice(0, 4) + '***' : 'MISSING'}`,
    );

    this.api = axios.create({
      baseURL: `${baseUrl}`,
      headers: { [keyName]: apiKey },
      timeout: 5000,
    });
  }

  private wrapError(err: any, action: string): never {
    this.logger.error(`n8n API ${action} raw error`, {
      status: err.response?.status,
      data: err.response?.data,
      msg: err.message,
    });
    const status = err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      err.response?.data?.message || err.message || 'Unknown error';
    throw new HttpException(`n8n API ${action} failed: ${message}`, status);
  }

  async createWorkflow(payload: WorkflowCreatePayload): Promise<string> {
    try {
      const resp = await this.api.post('/workflows', payload);
      return (resp.data as { id: string }).id;
    } catch (err) {
      this.wrapError(err, 'CREATE');
    }
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition> {
    try {
      const resp = await this.api.get<WorkflowDefinition>(`/workflows/${id}`);
      return resp.data;
    } catch (err) {
      this.wrapError(err, 'GET');
    }
  }

  async patchWorkflow(id: string, body: any): Promise<void> {
    try {
      await this.api.patch(`/workflows/${id}`, body);
    } catch (err) {
      this.wrapError(err, 'PATCH');
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.api.delete(`/workflows/${id}`);
    } catch (err) {
      this.wrapError(err, 'DELETE');
    }
  }

  async setActive(id: string, active: boolean): Promise<void> {
    try {
      const action = active ? 'activate' : 'deactivate';
      await this.api.post(`/workflows/${id}/${action}`);
    } catch (err) {
      this.wrapError(err, 'SET ACTIVE');
    }
  }
}
