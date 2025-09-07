import { describe, it, expect, vi, beforeEach } from "vitest";
import {  screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import MerchantSupportCenterPage from "./SupportCenterPage";

// Mock axios
vi.mock("@/shared/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock auth context
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      merchantId: "test-merchant-id",
      name: "Test User",
      email: "test@example.com",
    },
  }),
}));

// Mock dayjs
vi.mock("dayjs", () => ({
  default: () => ({
    tz: () => ({
      hour: () => ({
        minute: () => ({
          isAfter: () => true,
          isBefore: () => false,
          format: () => "06:00 PM",
        }),
      }),
    }),
    extend: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn(),
  },
});

import axios from "@/shared/api/axios";

describe("MerchantSupportCenterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue("[]");
  });

  it("يجب أن يعرض عنوان الصفحة", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    expect(screen.getByText("الدعم الفني والتواصل")).toBeInTheDocument();
  });

  it("يجب أن يعرض وصف الصفحة", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    expect(screen.getByText(/راسل فريق كليم مباشرة من لوحة التاجر/)).toBeInTheDocument();
  });

  it("يجب أن يعرض معلومات ساعات العمل", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    expect(screen.getByText(/SLA: عادةً 4–8 ساعات/)).toBeInTheDocument();
  });

  it("يجب أن يعرض نموذج إنشاء التذكرة", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    expect(screen.getByText("أنشئ تذكرة دعم")).toBeInTheDocument();
  });

  it("يجب أن يعرض حقول النموذج المطلوبة", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    
    expect(screen.getByLabelText("الاسم")).toBeInTheDocument();
    expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
    expect(screen.getByLabelText("الجوال (اختياري)")).toBeInTheDocument();
    expect(screen.getByLabelText("معرّف التاجر")).toBeInTheDocument();
    expect(screen.getByLabelText("نوع الطلب")).toBeInTheDocument();
    expect(screen.getByLabelText("الأولوية")).toBeInTheDocument();
    expect(screen.getByLabelText("عنوان التذكرة")).toBeInTheDocument();
    expect(screen.getByLabelText("وصف المشكلة/الطلب")).toBeInTheDocument();
  });

  it("يجب أن يملأ البيانات الافتراضية من المستخدم", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test-merchant-id")).toBeInTheDocument();
  });

  it("يجب أن يعرض قنوات التواصل السريعة", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    
    expect(screen.getByText("قنوات سريعة")).toBeInTheDocument();
    expect(screen.getByText("واتساب الرسمي")).toBeInTheDocument();
    expect(screen.getByText("تيليجرام")).toBeInTheDocument();
    expect(screen.getByText("البريد")).toBeInTheDocument();
    expect(screen.getByText("الهاتف")).toBeInTheDocument();
  });

  it("يجب أن يعرض الأدلة السريعة", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    
    expect(screen.getByText("أدلة سريعة")).toBeInTheDocument();
    expect(screen.getByText("تفعيل ويب شات كليم")).toBeInTheDocument();
    expect(screen.getByText("ربط واتساب الرسمي")).toBeInTheDocument();
    expect(screen.getByText("ربط تيليجرام")).toBeInTheDocument();
  });

  it("يجب أن يعرض قسم آخر التذاكر", () => {
    renderWithProviders(<MerchantSupportCenterPage />);
    
    expect(screen.getByText("آخر التذاكر")).toBeInTheDocument();
  });

  it("يجب أن يرسل النموذج عند التقديم", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      id: "ticket-123",
      ticketNumber: "TKT-2024-001",
      status: "open" as const,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    
    vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

    renderWithProviders(<MerchantSupportCenterPage />);

    const subjectInput = screen.getByLabelText("عنوان التذكرة");
    const messageInput = screen.getByLabelText("وصف المشكلة/الطلب");
    const submitButton = screen.getByText("إرسال");

    await user.type(subjectInput, "مشكلة في التطبيق");
    await user.type(messageInput, "أحتاج مساعدة في حل مشكلة معينة في التطبيق");
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/support/contact",
        expect.any(FormData),
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
    });
  });

  it("يجب أن يعرض رسالة نجاح بعد إرسال التذكرة", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      id: "ticket-123",
      ticketNumber: "TKT-2024-001",
      status: "open" as const,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    
    vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

    renderWithProviders(<MerchantSupportCenterPage />);

    const subjectInput = screen.getByLabelText("عنوان التذكرة");
    const messageInput = screen.getByLabelText("وصف المشكلة/الطلب");
    const submitButton = screen.getByText("إرسال");

    await user.type(subjectInput, "مشكلة في التطبيق");
    await user.type(messageInput, "أحتاج مساعدة في حل مشكلة معينة في التطبيق");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("تم فتح التذكرة: TKT-2024-001")).toBeInTheDocument();
    });
  });

  it("يجب أن يتعامل مع الأخطاء", async () => {
    const user = userEvent.setup();
    vi.mocked(axios.post).mockRejectedValueOnce(new Error("Network error"));

    renderWithProviders(<MerchantSupportCenterPage />);

    const subjectInput = screen.getByLabelText("عنوان التذكرة");
    const messageInput = screen.getByLabelText("وصف المشكلة/الطلب");
    const submitButton = screen.getByText("إرسال");

    await user.type(subjectInput, "مشكلة في التطبيق");
    await user.type(messageInput, "أحتاج مساعدة في حل مشكلة معينة في التطبيق");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("حدث خطأ غير متوقع")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض حالة التحميل أثناء الإرسال", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(axios.post).mockReturnValueOnce(promise);

    renderWithProviders(<MerchantSupportCenterPage />);

    const subjectInput = screen.getByLabelText("عنوان التذكرة");
    const messageInput = screen.getByLabelText("وصف المشكلة/الطلب");
    const submitButton = screen.getByText("إرسال");

    await user.type(subjectInput, "مشكلة في التطبيق");
    await user.type(messageInput, "أحتاج مساعدة في حل مشكلة معينة في التطبيق");
    await user.click(submitButton);

    expect(screen.getByText("جاري الإرسال…")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    resolvePromise!({ data: {} });
    await waitFor(() => {
      expect(screen.getByText("إرسال")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض التذاكر السابقة", () => {
    const mockTickets = [
      { ticketNumber: "TKT-2024-001", createdAt: "2024-01-01T00:00:00.000Z" },
      { ticketNumber: "TKT-2024-002", createdAt: "2024-01-02T00:00:00.000Z" },
    ];
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTickets));

    renderWithProviders(<MerchantSupportCenterPage />);

    expect(screen.getByText("TKT-2024-001")).toBeInTheDocument();
    expect(screen.getByText("TKT-2024-002")).toBeInTheDocument();
  });

  it("يجب أن يعرض رسالة عندما لا توجد تذاكر سابقة", () => {
    localStorageMock.getItem.mockReturnValue("[]");

    renderWithProviders(<MerchantSupportCenterPage />);

    expect(screen.getByText("لا توجد تذاكر حديثة.")).toBeInTheDocument();
  });

  it("يجب أن يدعم إرفاق الملفات", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MerchantSupportCenterPage />);

    const fileInput = screen.getByLabelText("إرفاق ملفات (اختياري)");
    const file = new File(["test content"], "test.pdf", { type: "application/pdf" });

    await user.upload(fileInput, file);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
  });

  it("يجب أن يعرض زر نسخ رقم التذكرة", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      id: "ticket-123",
      ticketNumber: "TKT-2024-001",
      status: "open" as const,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    
    vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

    renderWithProviders(<MerchantSupportCenterPage />);

    const subjectInput = screen.getByLabelText("عنوان التذكرة");
    const messageInput = screen.getByLabelText("وصف المشكلة/الطلب");
    const submitButton = screen.getByText("إرسال");

    await user.type(subjectInput, "مشكلة في التطبيق");
    await user.type(messageInput, "أحتاج مساعدة في حل مشكلة معينة في التطبيق");
    await user.click(submitButton);

    await waitFor(() => {
      const copyButton = screen.getByTitle("نسخ الرقم");
      expect(copyButton).toBeInTheDocument();
    });
  });
});
