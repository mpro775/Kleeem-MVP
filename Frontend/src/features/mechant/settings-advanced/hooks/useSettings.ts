// src/features/mechant/settings-advanced/hooks/useSettings.ts
import { useState, useEffect, useCallback } from "react";
import { useErrorHandler } from "@/shared/errors";
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
  // ... (نفس الكائن الافتراضي من الكود الأصلي)
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

// هذا الخطاف يدير كل حالة ومنطق صفحة الإعدادات
export const useSettings = (userId: string, merchantId: string) => {
  const { handleError } = useErrorHandler();
  
  // States
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({ name: "", phone: "", email: "", id: "", role: "MERCHANT" });
  const [prefs, setPrefs] = useState<NotificationsPrefs>(DEFAULT_PREFS);
  const [productSource, setSource] = useState<ProductSource>("internal");

  // Loading states for buttons
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Snack state
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" as "success" | "error" });

  // Dialog state
  const [confirmModal, setConfirmModal] = useState({ open: false, for: null as "source" | "delete" | null });
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Fetch initial data
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const [profileData, notificationsData] = await Promise.all([
          getMyProfile(userId),
          getMyNotifications(userId).catch(() => DEFAULT_PREFS),
        ]);
        setProfile({ name: profileData?.name ?? "", phone: profileData?.phone ?? "", email: profileData?.email ?? "", id: profileData?.id ?? "", role: profileData?.role ?? "MERCHANT" });
        setPrefs({ ...DEFAULT_PREFS, ...(notificationsData ?? {}) });
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, handleError]);

  const showSnack = (msg: string, type: "success" | "error" = "success" as const) => {
    setSnack({ open: true, msg, type: type as "success" | "error" });
  };
  
  // Handlers
  const handleSaveProfile = useCallback(async () => {
    setSaving(s => ({ ...s, profile: true }));
    try {
      await updateMyProfile(userId, { name: profile.name.trim(), phone: profile.phone?.trim() ?? "" });
      showSnack("تم حفظ بياناتي بنجاح");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(s => ({ ...s, profile: false }));
    }
  }, [userId, profile, handleError]);

  const handleChangePassword = useCallback(async (passwords: Record<string, string>) => {
    const { currentPassword, newPassword, confirmNewPassword } = passwords;
    if (!currentPassword || !newPassword || newPassword !== confirmNewPassword) {
      showSnack("تحقق من الحقول وكلمة المرور الجديدة", "error");
      return;
    }
    setSaving(s => ({ ...s, password: true }));
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword: confirmNewPassword });
      showSnack("تم تغيير كلمة المرور بنجاح");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(s => ({ ...s, password: false }));
    }
  }, [handleError]);

  const handleSaveNotifications = useCallback(async () => {
      setSaving(s => ({ ...s, notifications: true }));
      try {
        await updateMyNotifications(userId, prefs);
        showSnack("تم حفظ تفضيلات الإشعارات");
      } catch (error) {
        handleError(error);
      } finally {
        setSaving(s => ({ ...s, notifications: false }));
      }
  }, [userId, prefs, handleError]);

  const submitConfirmAction = useCallback(async () => {
      if (!confirmPassword) {
        showSnack("أدخل كلمة المرور للتأكيد", "error");
        return;
      }
      setSaving(s => ({ ...s, confirm: true }));
      try {
        if (confirmModal.for === "source") {
          await setProductSource(merchantId, productSource, confirmPassword);
          showSnack("تم تغيير مصدر المنتجات");
        } else if (confirmModal.for === "delete") {
          await deleteMyAccount(userId, { confirmPassword });
          showSnack("تم حذف الحساب بنجاح");
          // TODO: Redirect user or log them out
        }
        setConfirmModal({ open: false, for: null });
        setConfirmPassword("");
      } catch (error) {
        handleError(error);
      } finally {
        setSaving(s => ({ ...s, confirm: false }));
      }
  }, [confirmPassword, confirmModal.for, merchantId, productSource, userId, handleError]);
  
  // Return values to be used by the component
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