// src/features/mechant/analytics/api.ts
import axiosInstance from "@/shared/api/axios";

export type Period = "week" | "month" | "quarter";
export type GroupBy = "day" | "week";
export type Overview = import("@/features/mechant/dashboard/type").Overview;
export type ChecklistGroup = import("@/features/mechant/dashboard/type").ChecklistGroup;

const ensureArray = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

export async function getOverview(period: Period) {
  const res = await axiosInstance.get<Overview>(`/analytics/overview`, { params: { period } });
  return res.data; // ✅ حمولة مباشرة
}

export async function getProductsCount() {
  const res = await axiosInstance.get<{ total: number } | number>(`/analytics/products-count`);
  const payload = res.data;
  return typeof payload === "number" ? payload : (payload?.total ?? 0); // ✅ رقم دائمًا
}

export async function getMessagesTimeline(period: Period, groupBy: GroupBy = "day") {
  const res = await axiosInstance.get<import("@/features/mechant/dashboard/type").TimelinePoint[]>(
    `/analytics/messages-timeline`,
    { params: { period, groupBy } }
  );
  return ensureArray(res.data); // ✅ مصفوفة دائمًا
}

export async function getChecklist(merchantId: string) {
  const res = await axiosInstance.get<ChecklistGroup[]>(`/merchants/${merchantId}/checklist`);
  return ensureArray<ChecklistGroup>(res.data); // ✅ مصفوفة مباشرة (لا {data: []})
}

export async function skipChecklistItem(merchantId: string, itemKey: string) {
  await axiosInstance.post(`/merchants/${merchantId}/checklist/${itemKey}/skip`);
}



export async function getTopProducts(period: Period, limit = 8) {
  const res = await axiosInstance.get<
    { productId: string; name: string; count: number }[]
  >("/analytics/top-products", { params: { period, limit } });
  const arr = ensureArray<{ productId: string; name: string; count: number }>(res.data);
  return arr.map((p) => ({ productId: p.productId, name: p.name, count: p.count }));
}

export async function getTopKeywords(period: Period, limit = 10) {
  const res = await axiosInstance.get<{ keyword: string; count: number; percentage?: number }[]>(
    "/analytics/top-keywords",
    { params: { period, limit } }
  );
  const arr = ensureArray<{ keyword: string; count: number; percentage?: number }>(res.data);
  return arr.map((k) => ({ keyword: k.keyword, count: k.count, percentage: k.percentage }));
}

type MissingStat = {
  _id: string;
  channels: { channel: string; count: number; resolved: boolean }[];
  total: number;
};

export async function getMissingStats(days: number) {
  const res = await axiosInstance.get<MissingStat[]>(
    "/analytics/missing-responses/stats",
    {
      params: { days },
    }
  );
  const rows = ensureArray<MissingStat>(res.data);
  return rows.map((d) => {
    let resolved = 0,
      unresolved = 0;
    for (const ch of d.channels || []) {
      if (ch.resolved) resolved += ch.count;
      else unresolved += ch.count;
    }
    return { day: d._id, resolved, unresolved, total: d.total };
  });
}

export type Channel = "all" | "whatsapp" | "telegram" | "webchat";

export async function getMissingUnresolvedList(params: {
  page?: number;
  limit?: number;
  channel?: Channel;
}) {
  const { page = 1, limit = 10, channel = "all" } = params;
  const res = await axiosInstance.get<{
    items: {
      _id: string;
      question: string;
      channel: string;
      createdAt: string;
    }[];
    total: number;
  }>("/analytics/missing-responses", {
    params: { page, limit, resolved: "false", channel },
  });
  return res.data;
}

export async function getFaqs(merchantId: string) {
  const res = await axiosInstance.get<
    { _id: string; question: string; answer: string }[]
  >(`/merchants/${merchantId}/faqs`);
  return ensureArray(res.data);
}
