import axiosInstance from "@/shared/api/axios";

/* ===== Types ===== */
export type PromptType = "system" | "user";
export type Prompt = {
  _id: string;
  type: PromptType;
  content: string;
  name?: string;
  tags?: string[];
  active: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreatePromptDto = {
  type: PromptType;
  content: string;
  name?: string;
  tags?: string[];
  active?: boolean; // لو true والنوع system يطفّي غيره تلقائيًا
};

export type UpdatePromptDto = Partial<CreatePromptDto> & { archived?: boolean };

/* ===== API ===== */
export async function listPrompts(params?: {
  type?: PromptType;
  includeArchived?: boolean;
}) {
  const { data } = await axiosInstance.get<Prompt[]>(
    "/admin/kleem/bot-prompts",
    { params }
  );
  return data;
}

export async function getActiveSystemContent() {
  const { data } = await axiosInstance.get<{ content: string }>(
    "/admin/kleem/bot-prompts/system/active/content"
  );
  return data;
}

export async function createPrompt(p: CreatePromptDto) {
  const { data } = await axiosInstance.post<Prompt>(
    "/admin/kleem/bot-prompts",
    p
  );
  return data;
}

export async function updatePrompt(id: string, dto: UpdatePromptDto) {
  const { data } = await axiosInstance.patch<Prompt>(
    `/admin/kleem/bot-prompts/${id}`,
    dto
  );
  return data;
}

export async function setPromptActive(id: string, active: boolean) {
  const { data } = await axiosInstance.post<Prompt>(
    `/admin/kleem/bot-prompts/${id}/active`,
    { active }
  );
  return data;
}

export async function archivePrompt(id: string) {
  const { data } = await axiosInstance.post<Prompt>(
    `/admin/kleem/bot-prompts/${id}/archive`
  );
  return data;
}

export async function deletePrompt(id: string) {
  await axiosInstance.delete(`/admin/kleem/bot-prompts/${id}`);
}
/* ===== Settings (لوحة الإعدادات) ===== */
export type ChatSettings = {
  launchDate: string;
  applyUrl: string;
  integrationsNow: string;
  trialOffer: string;
  yemenNext: string;
  yemenPositioning: string;
  ctaEvery: number;
  highIntentKeywords: string[];
  piiKeywords: string[];
};

export async function getChatSettings() {
  const { data } = await axiosInstance.get<ChatSettings>(
    "/admin/kleem/settings/chat"
  );
  return data;
}
export async function updateChatSettings(dto: Partial<ChatSettings>) {
  const { data } = await axiosInstance.put<ChatSettings>(
    "/admin/kleem/settings/chat",
    dto
  );
  return data;
}

/* ===== Sandbox ===== */
export type SandboxRequest = {
  text: string;
  attachKnowledge?: boolean; // افتراضي true
  topK?: number; // افتراضي 5
  dryRun?: boolean; // true = معاينة فقط بدون استدعاء LLM
};
export type SandboxResponse = {
  systemPrompt: string;
  knowledge: { question: string; answer: string; score: number }[];
  highIntent: boolean;
  ctaAllowed: boolean;
  result?: {
    raw?: string; // رد النموذج قبل الفلترة (إن وُجد)
    final?: string; // بعد فلترة الخصوصية/CTA (إن طبقتها بالباك)
    tokens?: number;
    latencyMs?: number;
  };
};

export async function sandboxTest(payload: SandboxRequest) {
  const { data } = await axiosInstance.post<SandboxResponse>(
    "/admin/kleem/prompts/sandbox",
    payload
  );
  return data;
}

export type BotFaq = {
  _id: string;
  question: string;
  answer: string;
  status: "active" | "deleted";
  tags?: string[];
  locale?: "ar" | "en";
  source?: "manual" | "auto" | "imported";
  vectorStatus?: "pending" | "ok" | "failed";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBotFaqDto = {
  question: string;
  answer: string;
  tags?: string[];
  locale?: "ar" | "en";
  source?: "manual" | "auto" | "imported";
};

export async function listFaqs() {
  const { data } = await axiosInstance.get<BotFaq[]>("/admin/kleem/bot-faqs");
  return data;
}

export async function addFaq(dto: CreateBotFaqDto) {
  const { data } = await axiosInstance.post<BotFaq>(
    "/admin/kleem/bot-faqs",
    dto
  );
  return data;
}

export async function importFaqs(items: CreateBotFaqDto[]) {
  const { data } = await axiosInstance.post<{ inserted: number }>(
    "/admin/kleem/bot-faqs/import",
    { items }
  );
  return data;
}
export async function updateFaq(id: string, dto: Partial<CreateBotFaqDto>) {
  const { data } = await axiosInstance.patch<BotFaq>(
    `/admin/kleem/bot-faqs/${id}`,
    dto
  );
  return data;
}
export async function importFaqsFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await axiosInstance.post<{ inserted: number }>(
    "/admin/kleem/bot-faqs/import/file",
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function deleteFaq(id: string) {
  await axiosInstance.delete(`/admin/kleem/bot-faqs/${id}`);
}

export async function reindexAllFaqs() {
  const { data } = await axiosInstance.post<{ count: number }>(
    "/admin/kleem/bot-faqs/reindex"
  );
  return data;
}

// 🔎 semantic search (public)
export type BotFaqSearchItem = {
  id: string | number;
  question: string;
  answer: string;
  score: number;
};
export async function semanticSearch(q: string, topK = 5) {
  const { data } = await axiosInstance.get<BotFaqSearchItem[]>(
    `/kleem/faq/semantic-search`,
    { params: { q, topK } }
  );
  return data;
}
// زر إعادة الفهرسة من اللوحة

export type ChatSession = {
  sessionId: string;
  messages: {
    role: "user" | "bot";
    text: string;
    rating?: 0 | 1 | null;
    feedback?: string | null;
    timestamp?: string;
  }[];
};
export async function listSessions(page = 1, limit = 20, q?: string) {
  const { data } = await axiosInstance.get(`/admin/kleem/bot-chats`, {
    params: { page, limit, q },
  });
  return data as { data: ChatSession[]; total: number };
}
export async function getSession(sessionId: string) {
  const { data } = await axiosInstance.get<ChatSession>(
    `/admin/kleem/bot-chats/${sessionId}`
  );
  return data;
}
export async function statsTopQuestions(limit = 10) {
  const { data } = await axiosInstance.get(
    `/admin/kleem/bot-chats/stats/top-questions/list`,
    { params: { limit } }
  );
  return data as Array<{ text: string; count: number }>;
}
export async function statsBadReplies(limit = 10) {
  const { data } = await axiosInstance.get(
    `/admin/kleem/bot-chats/stats/bad-bot-replies/list`,
    { params: { limit } }
  );
  return data as Array<{ text: string; count: number; feedbacks: string[] }>;
}
