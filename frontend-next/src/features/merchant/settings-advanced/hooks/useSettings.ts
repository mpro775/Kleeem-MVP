'use client';

import { useState, useEffect, useCallback } from "react";
import { useSnackbar } from "notistack";
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyNotifications,
  updateMyNotifications,
  setProductSource,
  deleteMyAccount,
} from "../api";
import type { UserProfile, NotificationsPrefs, ProductSource } from "../types";

const DEFAULT_PREFS: NotificationsPrefs = {
  channels: { inApp: true, email: true, telegram: false, whatsapp: false },
  topics: {
    syncFailed: true,
    syncCompleted: true,
    webhookFailed: true,
    embeddingsCompleted: true,
    missingResponsesDigest: "daily",
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone: "Asia/Aden",
  },
};

export const useSettings = (userId: string, merchantId: string) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({ name: "", phone: "", email: "", id: "", role: "MERCHANT" });
  const [prefs, setPrefs] = useState<NotificationsPrefs>(DEFAULT_PREFS);
  const [productSource, setSource] = useState<ProductSource>("internal");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" as "success" | "error" });
  const [confirmModal, setConfirmModal] = useState({ open: false, for: null as "source" | "delete" | null });
  const [confirmPassword, setConfirmPassword] = useState("");
  
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const [profileData, notificationsData] = await Promise.all([
          getMyProfile(userId),
          getMyNotifications(userId).catch(() => DEFAULT_PREFS),
        ]);
        setProfile({ 
          name: profileData?.name ?? "", 
          phone: profileData?.phone ?? "", 
          email: profileData?.email ?? "", 
          id: profileData?.id ?? "", 
          role: profileData?.role ?? "MERCHANT" 
        });
        setPrefs({ ...DEFAULT_PREFS, ...(notificationsData ?? {}) });
      } catch (error) {
        enqueueSnackbar((error as Error).message || 'خطأ في تحميل البيانات', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, enqueueSnackbar]);

  const showSnack = (msg: string, type: "success" | "error" = "success") => {
    setSnack({ open: true, msg, type });
  };
  
  const handleSaveProfile = useCallback(async () => {
    setSaving(s => ({ ...s, profile: true }));
    try {
      await updateMyProfile(userId, { name: profile.name.trim(), phone: profile.phone?.trim() ?? "" });
      showSnack("تم حفظ بياناتي بنجاح");
      enqueueSnackbar("تم حفظ بياناتي بنجاح", { variant: 'success' });
    } catch (error) {
      const msg = (error as Error).message || 'فشل حفظ البيانات';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(s => ({ ...s, profile: false }));
    }
  }, [userId, profile, enqueueSnackbar]);

  const handleChangePassword = useCallback(async (passwords: Record<string, string>) => {
    const { currentPassword, newPassword, confirmNewPassword } = passwords;
    if (!currentPassword || !newPassword || newPassword !== confirmNewPassword) {
      showSnack("تحقق من الحقول وكلمة المرور الجديدة", "error");
      enqueueSnackbar("تحقق من الحقول وكلمة المرور الجديدة", { variant: 'error' });
      return;
    }
    setSaving(s => ({ ...s, password: true }));
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword: confirmNewPassword });
      showSnack("تم تغيير كلمة المرور بنجاح");
      enqueueSnackbar("تم تغيير كلمة المرور بنجاح", { variant: 'success' });
    } catch (error) {
      const msg = (error as Error).message || 'فشل تغيير كلمة المرور';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(s => ({ ...s, password: false }));
    }
  }, [enqueueSnackbar]);

  const handleSaveNotifications = useCallback(async () => {
    setSaving(s => ({ ...s, notifications: true }));
    try {
      await updateMyNotifications(userId, prefs);
      showSnack("تم حفظ تفضيلات الإشعارات");
      enqueueSnackbar("تم حفظ تفضيلات الإشعارات", { variant: 'success' });
    } catch (error) {
      const msg = (error as Error).message || 'فشل حفظ التفضيلات';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(s => ({ ...s, notifications: false }));
    }
  }, [userId, prefs, enqueueSnackbar]);

  const submitConfirmAction = useCallback(async () => {
    if (!confirmPassword) {
      showSnack("أدخل كلمة المرور للتأكيد", "error");
      enqueueSnackbar("أدخل كلمة المرور للتأكيد", { variant: 'error' });
      return;
    }
    setSaving(s => ({ ...s, confirm: true }));
    try {
      if (confirmModal.for === "source") {
        await setProductSource(merchantId, productSource, confirmPassword);
        showSnack("تم تغيير مصدر المنتجات");
        enqueueSnackbar("تم تغيير مصدر المنتجات", { variant: 'success' });
      } else if (confirmModal.for === "delete") {
        await deleteMyAccount(userId, { confirmPassword });
        showSnack("تم حذف الحساب بنجاح");
        enqueueSnackbar("تم حذف الحساب بنجاح", { variant: 'success' });
      }
      setConfirmModal({ open: false, for: null });
      setConfirmPassword("");
    } catch (error) {
      const msg = (error as Error).message || 'فشل العملية';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(s => ({ ...s, confirm: false }));
    }
  }, [confirmPassword, confirmModal.for, merchantId, productSource, userId, enqueueSnackbar]);
  
  return {
    loading,
    saving,
    profile,
    setProfile,
    prefs,
    setPrefs,
    productSource,
    setSource,
    snack,
    setSnack,
    confirmModal,
    setConfirmModal,
    confirmPassword,
    setConfirmPassword,
    handleSaveProfile,
    handleChangePassword,
    handleSaveNotifications,
    submitConfirmAction,
  };
};
