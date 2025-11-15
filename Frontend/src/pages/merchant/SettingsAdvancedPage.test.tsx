import { describe, it, expect, vi, beforeEach } from "vitest";
import {  screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import SettingsAdvancedPage from "./SettingsAdvancedPage";

// Mock auth context
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      merchantId: "test-merchant-id",
      name: "Test User",
      email: "test@example.com",
    },
  }),
}));

// Mock API functions
vi.mock("@/features/mechant/settings-advanced/api", () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  getMyNotifications: vi.fn(),
  updateMyNotifications: vi.fn(),
  setProductSource: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  requestPasswordReset,
  getMyNotifications,
  updateMyNotifications,
  setProductSource,
  deleteMyAccount,
} from "@/features/mechant/settings-advanced/api";

describe("SettingsAdvancedPage", () => {
  const mockProfile = {
    id: "test-user-id",
    name: "Test User",
    phone: "+966501234567",
    email: "test@example.com",
    role: "MERCHANT" as const,
    merchantId: "test-merchant-id"
  };

  const mockNotifications = {
    channels: { inApp: true, email: true, telegram: false, whatsapp: false },
    topics: {
      syncFailed: true,
      syncCompleted: true,
      webhookFailed: true,
      embeddingsCompleted: true,
      missingResponsesDigest: "daily" as const,
    },
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: "Asia/Aden",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMyProfile).mockResolvedValue(mockProfile);
    vi.mocked(getMyNotifications).mockResolvedValue(mockNotifications);
  });

  it("يجب أن يعرض عنوان الصفحة", async () => {
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("معلوماتي")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض معلومات المستخدم", async () => {
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
      expect(screen.getByDisplayValue("+966501234567")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض قسم الأمان", async () => {
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("الأمان")).toBeInTheDocument();
      expect(screen.getByLabelText("كلمة المرور الحالية")).toBeInTheDocument();
      expect(screen.getByLabelText("كلمة المرور الجديدة")).toBeInTheDocument();
      expect(screen.getByLabelText("تأكيد كلمة المرور الجديدة")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض قسم الإشعارات", async () => {
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("إشعاراتي")).toBeInTheDocument();
      expect(screen.getByText("القنوات")).toBeInTheDocument();
      expect(screen.getByText("الموضوعات")).toBeInTheDocument();
      expect(screen.getByText("ساعات هادئة")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض قسم مصدر المنتجات", async () => {
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("مصدر المنتجات")).toBeInTheDocument();
      expect(screen.getByLabelText("داخلي")).toBeInTheDocument();
      expect(screen.getByLabelText("سلة")).toBeInTheDocument();
      expect(screen.getByLabelText("زد")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض المنطقة الخطرة", async () => {
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("منطقة خطرة")).toBeInTheDocument();
      expect(screen.getByText("حذف حسابي")).toBeInTheDocument();
    });
  });

  it("يجب أن يحفظ معلومات الملف الشخصي", async () => {
    const user = userEvent.setup();
    vi.mocked(updateMyProfile).mockResolvedValueOnce(mockProfile);

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("حفظ")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("حفظ");
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateMyProfile).toHaveBeenCalledWith("test-user-id", {
        name: "Test User",
        phone: "+966501234567",
      });
    });
  });

  it("يجب أن يغير كلمة المرور", async () => {
    const user = userEvent.setup();
    vi.mocked(changePassword).mockResolvedValueOnce({ status: "ok" as const });

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText("كلمة المرور الحالية")).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText("كلمة المرور الحالية");
    const newPasswordInput = screen.getByLabelText("كلمة المرور الجديدة");
    const confirmPasswordInput = screen.getByLabelText("تأكيد كلمة المرور الجديدة");
    const changePasswordButton = screen.getByText("تغيير كلمة المرور");

    await user.type(currentPasswordInput, "oldpassword");
    await user.type(newPasswordInput, "newpassword");
    await user.type(confirmPasswordInput, "newpassword");
    await user.click(changePasswordButton);

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
        confirmPassword: "newpassword",
      });
    });
  });

  it("يجب أن يرسل طلب إعادة تعيين كلمة المرور", async () => {
    const user = userEvent.setup();
    vi.mocked(requestPasswordReset).mockResolvedValueOnce({ status: "ok" as const });

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("نسيت كلمة المرور؟")).toBeInTheDocument();
    });

    const forgotPasswordButton = screen.getByText("نسيت كلمة المرور؟");
    await user.click(forgotPasswordButton);

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("يجب أن يحفظ تفضيلات الإشعارات", async () => {
    const user = userEvent.setup();
    vi.mocked(updateMyNotifications).mockResolvedValueOnce(mockNotifications);

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("حفظ تفضيلات الإشعارات")).toBeInTheDocument();
    });

    const saveNotificationsButton = screen.getByText("حفظ تفضيلات الإشعارات");
    await user.click(saveNotificationsButton);

    await waitFor(() => {
      expect(updateMyNotifications).toHaveBeenCalledWith("test-user-id", mockNotifications);
    });
  });

  it("يجب أن يفتح نافذة تأكيد كلمة المرور لمصدر المنتجات", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("تعيين المصدر")).toBeInTheDocument();
    });

    const setSourceButton = screen.getByText("تعيين المصدر");
    await user.click(setSourceButton);

    await waitFor(() => {
      expect(screen.getByText("تأكيد بكلمة المرور")).toBeInTheDocument();
    });
  });

  it("يجب أن يفتح نافذة تأكيد كلمة المرور لحذف الحساب", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("حذف حسابي")).toBeInTheDocument();
    });

    const deleteAccountButton = screen.getByText("حذف حسابي");
    await user.click(deleteAccountButton);

    await waitFor(() => {
      expect(screen.getByText("تأكيد بكلمة المرور")).toBeInTheDocument();
    });
  });

  it("يجب أن يغير مصدر المنتجات عند التأكيد", async () => {
    const user = userEvent.setup();
    vi.mocked(setProductSource).mockResolvedValueOnce({});

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("تعيين المصدر")).toBeInTheDocument();
    });

    const setSourceButton = screen.getByText("تعيين المصدر");
    await user.click(setSourceButton);

    await waitFor(() => {
      expect(screen.getByText("تأكيد بكلمة المرور")).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText("كلمة المرور");
    const confirmButton = screen.getByText("تأكيد");

    await user.type(passwordInput, "password123");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(setProductSource).toHaveBeenCalledWith("test-merchant-id", "internal", "password123");
    });
  });

  it("يجب أن يحذف الحساب عند التأكيد", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteMyAccount).mockResolvedValueOnce({});

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("حذف حسابي")).toBeInTheDocument();
    });

    const deleteAccountButton = screen.getByText("حذف حسابي");
    await user.click(deleteAccountButton);

    await waitFor(() => {
      expect(screen.getByText("تأكيد بكلمة المرور")).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText("كلمة المرور");
    const confirmButton = screen.getByText("تأكيد");

    await user.type(passwordInput, "password123");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteMyAccount).toHaveBeenCalledWith("test-user-id", {
        confirmPassword: "password123",
      });
    });
  });

  it("يجب أن يتعامل مع أخطاء API", async () => {
    const user = userEvent.setup();
    vi.mocked(updateMyProfile).mockRejectedValueOnce(new Error("Network error"));

    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByText("حفظ")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("حفظ");
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("فشل حفظ البيانات")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض حالة التحميل", () => {
    vi.mocked(getMyProfile).mockImplementation(() => new Promise(() => {}));
    
    renderWithProviders(<SettingsAdvancedPage />);
    
    expect(screen.getByText("جارِ التحميل…")).toBeInTheDocument();
  });

  it("يجب أن يحدث تفضيلات الإشعارات", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText("داخل التطبيق")).toBeInTheDocument();
    });

    const inAppSwitch = screen.getByLabelText("داخل التطبيق");
    await user.click(inAppSwitch);

    await waitFor(() => {
      expect(inAppSwitch).not.toBeChecked();
    });
  });

  it("يجب أن يحدث ساعات الهدوء", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText("تفعيل")).toBeInTheDocument();
    });

    const quietHoursSwitch = screen.getByLabelText("تفعيل");
    await user.click(quietHoursSwitch);

    await waitFor(() => {
      expect(quietHoursSwitch).toBeChecked();
    });
  });

  it("يجب أن يحدث مصدر المنتجات", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsAdvancedPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText("سلة")).toBeInTheDocument();
    });

    const sallaRadio = screen.getByLabelText("سلة");
    await user.click(sallaRadio);

    await waitFor(() => {
      expect(sallaRadio).toBeChecked();
    });
  });
});
