import { WorkflowDefinition } from '../types';

export interface WorkflowCreatePayload {
  name: string;
  nodes: Array<{
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, { name: string }>;
  }>;
  connections: Record<string, unknown>;
  active?: boolean;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
}

export interface N8nClientRepository {
  createWorkflow(payload: WorkflowCreatePayload): Promise<string>;
  getWorkflow(id: string): Promise<WorkflowDefinition>;
  patchWorkflow(id: string, body: any): Promise<void>;
  deleteWorkflow(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
}
