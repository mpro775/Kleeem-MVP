// src/modules/n8n-workflow/interfaces/workflow-definition.interface.ts

export interface WorkflowNode {
  parameters: {
    path?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  [key: string]: unknown;
}
