// src/features/leads/hooks.ts
import { useCallback, useEffect,  useState } from "react";
import { useErrorHandler } from "@/shared/errors";
import { v4 as uuidv4 } from "uuid";
import type { Lead, LeadField, LeadsSettings } from "./types";
import { fetchLeads, fetchLeadsSettings, saveLeadsSettings } from "./api";

export function useLeadsManager(merchantId: string) {
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState<boolean>(true);
  const [fields, setFields] = useState<LeadField[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const refreshAll = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    setError(null);
    try {
      const [settings, leadsList] = await Promise.all([
        fetchLeadsSettings(merchantId),
        fetchLeads(merchantId),
      ]);
      setEnabled(settings.enabled);
      setFields(settings.fields);
      setLeads(leadsList);
    } catch (e) {
      handleError(e);
      setError("فشل تحميل بيانات الـ Leads");
    } finally {
      setLoading(false);
    }
  }, [merchantId, handleError]);

  // جلب البيانات عند تغيير merchantId فقط
  useEffect(() => {
    if (!merchantId) return;
    
    let cancelled = false;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [settings, leadsList] = await Promise.all([
          fetchLeadsSettings(merchantId),
          fetchLeads(merchantId),
        ]);
        
        if (cancelled) return;
        
        setEnabled(settings.enabled);
        setFields(settings.fields);
        setLeads(leadsList);
      } catch (e) {
        if (cancelled) return;
        handleError(e);
        setError("فشل تحميل بيانات الـ Leads");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      cancelled = true;
    };
  }, [merchantId, handleError]);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      { key: uuidv4(), fieldType: "custom", label: "", placeholder: "", required: false },
    ]);
  }, []);

  const removeField = useCallback((key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const updateField = useCallback((key: string, patch: Partial<LeadField>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }, []);

  const saveAll = useCallback(async () => {
    if (!merchantId) return false;
    setSaving(true);
    try {
      const payload: LeadsSettings = { enabled, fields };
      await saveLeadsSettings(merchantId, payload);
      return true;
    } catch (e) {
      handleError(e);
      return false;
    } finally {
      setSaving(false);
    }
  }, [merchantId, enabled, fields]);

  return {
    loading,
    saving,
    error,
    enabled,
    fields,
    leads,
    setEnabled,
    addField,
    removeField,
    updateField,
    refreshAll,
    saveAll,
  };
}
