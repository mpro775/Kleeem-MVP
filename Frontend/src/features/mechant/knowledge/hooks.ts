// src/features/knowledge/hooks.ts
import { useCallback, useEffect, useState } from "react";
import { ACCEPTED_EXTENSIONS, MAX_FILES, MAX_SIZE_MB } from "./types";
import type { Doc, LinkItem, FaqItem } from "./types";
import { docsApi, linksApi, faqsApi } from "./api";

export function useDocs(merchantId: string) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await docsApi.fetch(merchantId);
      setDocs(list);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => void refresh(), [refresh]);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_EXTENSIONS.includes(ext as any)) return "نوع الملف غير مدعوم";
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `الحجم الأقصى ${MAX_SIZE_MB} ميجا`;
    if (docs.length >= MAX_FILES) return `الحد الأقصى ${MAX_FILES} ملفات فقط`;
    return null;
  };

  const upload = async (file: File) => {
    const err = validateFile(file);
    if (err) throw new Error(err);
    setUploading(true);
    try {
      await docsApi.upload(merchantId, file);
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await docsApi.remove(merchantId, id);
    setDocs((prev) => prev.filter((d) => d._id !== id));
  };

  return { docs, loading, uploading, refresh, upload, remove };
}

export function useLinks(merchantId: string) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await linksApi.fetch(merchantId);
      setLinks(list);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => void refresh(), [refresh]);

  const add = async (url: string) => {
    console.log("[useLinks] Adding link:", url, "merchantId:", merchantId);
    try {
      const result = await linksApi.add(merchantId, [url]);
      console.log("[useLinks] Add result:", result);
      await refresh();
    } catch (error) {
      console.error("[useLinks] Add error:", error);
      throw error;
    }
  };

  const addBulk = async (urls: string[]) => {
    await linksApi.add(merchantId, urls);
    await refresh();
  };

  const remove = async (id: string) => {
    await linksApi.remove(merchantId, id);
    setLinks((prev) => prev.filter((l) => l._id !== id));
  };

  const removeAll = async () => {
    // حذف جميع الروابط واحداً تلو الآخر
    for (const link of links) {
      await linksApi.remove(merchantId, link._id);
    }
    setLinks([]);
  };

  return { links, loading, add, addBulk, remove, removeAll, refresh };
}

export function useFaqs(merchantId: string) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await faqsApi.fetch(merchantId);
      setFaqs(list);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => void refresh(), [refresh]);

  const add = async (q: string, a: string) => {
    await faqsApi.add(merchantId, [{ question: q, answer: a }]);
    await refresh();
  };

  const remove = async (id: string, hard?: boolean) => {
    await faqsApi.remove(merchantId, id, { hard });
    setFaqs((prev) => prev.filter((f) => f._id !== id));
  };

  const removeAll = async (hard?: boolean) => {
    await faqsApi.removeAll(merchantId, { hard });
    setFaqs([]);
  };

  const addBulk = async (items: { question: string; answer: string }[]) => {
    await faqsApi.add(merchantId, items);
    await refresh();
  };

  const update = async (
    id: string,
    data: Partial<Pick<FaqItem, "question" | "answer">>
  ) => {
    await faqsApi.update(merchantId, id, data);
    await refresh();
  };

  return { faqs, loading, add, addBulk, remove, removeAll, update, refresh };
}
