/**
 * هيكل الكائن الذي يعيده n8n عند GET /workflows/:id
 */
export interface WorkflowDefinition {
  id?: string;
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
  active: boolean;
  settings: Record<string, unknown>;
  pinData: Record<string, unknown>;
}
