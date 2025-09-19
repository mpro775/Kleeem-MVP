export type ChecklistItem = {
  key: string;
  title: string;
  isComplete: boolean;
  isSkipped?: boolean;
  skippable?: boolean;
  message?: string;
  actionPath?: string;
};

export type ChecklistGroup = {
  key: string;
  title: string;
  items: ChecklistItem[];
};
