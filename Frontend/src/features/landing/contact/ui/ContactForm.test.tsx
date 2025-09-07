import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "./ContactForm";
import { submitContact } from "../api/supportApi";
import { ContactTopic } from "../types";

// Mock dependencies
vi.mock("../api/supportApi");
vi.mock("@mui/material/styles", () => ({
  useTheme: () => ({
    palette: { divider: "#e0e0e0" },
  }),
}));

// Mock window.KaleemChat
Object.defineProperty(window, "KaleemChat", {
  value: { open: vi.fn() },
  writable: true,
});

const mockConfig = {
  enabled: true,
  topics: [ContactTopic.SALES, ContactTopic.SUPPORT],
  maxFiles: 5,
  allowedFileTypes: [".png", ".jpg", ".pdf"],
};

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يعرض النموذج مع جميع الحقول", () => {
    render(<ContactForm config={mockConfig} />);

    expect(screen.getByText("أرسل لنا رسالة")).toBeInTheDocument();
    expect(screen.getByLabelText("الاسم الكامل")).toBeInTheDocument();
    expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
    expect(screen.getByLabelText("رقم الهاتف (اختياري)")).toBeInTheDocument();
    expect(screen.getByLabelText("نوع الطلب")).toBeInTheDocument();
    expect(screen.getByLabelText("الموضوع")).toBeInTheDocument();
    expect(screen.getByLabelText("نص الرسالة")).toBeInTheDocument();
    expect(screen.getByText("إرفاق ملفات (اختياري)")).toBeInTheDocument();
    expect(screen.getByText("إرسال الرسالة")).toBeInTheDocument();
  });

  it("يجب أن يعرض قائمة المواضيع المطلوبة", () => {
    render(<ContactForm config={mockConfig} />);

    const topicSelect = screen.getByLabelText("نوع الطلب");
    fireEvent.mouseDown(topicSelect);

    expect(screen.getByText("مبيعات")).toBeInTheDocument();
    expect(screen.getByText("دعم فني")).toBeInTheDocument();
    expect(screen.getByText("فواتير")).toBeInTheDocument();
    expect(screen.getByText("شركات/شراكات")).toBeInTheDocument();
  });

  it("يجب أن يملأ النموذج ويُرسله بنجاح", async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    const mockResponse = { id: "123", status: "success" };

    vi.mocked(submitContact).mockResolvedValueOnce(mockResponse);

    render(<ContactForm config={mockConfig} onSuccess={mockOnSuccess} />);

    // ملء النموذج
    await user.type(screen.getByLabelText("الاسم الكامل"), "أحمد محمد");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "ahmed@example.com");
    await user.type(screen.getByLabelText("رقم الهاتف (اختياري)"), "0501234567");
    await user.type(screen.getByLabelText("الموضوع"), "استفسار عن الخدمات");
    await user.type(screen.getByLabelText("نص الرسالة"), "أريد معرفة المزيد عن خدماتكم");

    // اختيار نوع الطلب
    const topicSelect = screen.getByLabelText("نوع الطلب");
    fireEvent.mouseDown(topicSelect);
    fireEvent.click(screen.getByText("مبيعات"));

    // إرسال النموذج
    await user.click(screen.getByText("إرسال الرسالة"));

    await waitFor(() => {
      expect(submitContact).toHaveBeenCalledWith(
        {
          name: "أحمد محمد",
          email: "ahmed@example.com",
          phone: "0501234567",
          topic: ContactTopic.SALES,
          subject: "استفسار عن الخدمات",
          message: "أريد معرفة المزيد عن خدماتكم",
          website: "",
        },
        null
      );
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
    expect(screen.getByText("تم استلام رسالتك بنجاح. سنعاودك قريباً.")).toBeInTheDocument();
  });

  it("يجب أن يعرض رسالة خطأ عند فشل الإرسال", async () => {
    const user = userEvent.setup();
    const errorMessage = "حدث خطأ في الاتصال";

    vi.mocked(submitContact).mockRejectedValueOnce(new Error(errorMessage));

    render(<ContactForm config={mockConfig} />);

    // ملء النموذج
    await user.type(screen.getByLabelText("الاسم الكامل"), "أحمد محمد");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "ahmed@example.com");
    await user.type(screen.getByLabelText("الموضوع"), "استفسار");
    await user.type(screen.getByLabelText("نص الرسالة"), "رسالة تجريبية");

    // اختيار نوع الطلب
    const topicSelect = screen.getByLabelText("نوع الطلب");
    fireEvent.mouseDown(topicSelect);
    fireEvent.click(screen.getByText("مبيعات"));

    // إرسال النموذج
    await user.click(screen.getByText("إرسال الرسالة"));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض رسالة خطأ عند اكتشاف spam", async () => {
    const user = userEvent.setup();

    render(<ContactForm config={mockConfig} />);

    // ملء النموذج مع حقل website (honeypot)
    await user.type(screen.getByLabelText("الاسم الكامل"), "أحمد محمد");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "ahmed@example.com");
    await user.type(screen.getByLabelText("الموضوع"), "استفسار");
    await user.type(screen.getByLabelText("نص الرسالة"), "رسالة تجريبية");
    await user.type(screen.getByLabelText("موقعك"), "spam.com");

    // اختيار نوع الطلب
    const topicSelect = screen.getByLabelText("نوع الطلب");
    fireEvent.mouseDown(topicSelect);
    fireEvent.click(screen.getByText("مبيعات"));

    // إرسال النموذج
    await user.click(screen.getByText("إرسال الرسالة"));

    await waitFor(() => {
      expect(screen.getByText("Spam detected")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض حالة التحميل أثناء الإرسال", async () => {
    const user = userEvent.setup();
    let resolveSubmit: (value: any) => void;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });

    vi.mocked(submitContact).mockReturnValueOnce(submitPromise as any);

    render(<ContactForm config={mockConfig} />);

    // ملء النموذج
    await user.type(screen.getByLabelText("الاسم الكامل"), "أحمد محمد");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "ahmed@example.com");
    await user.type(screen.getByLabelText("الموضوع"), "استفسار");
    await user.type(screen.getByLabelText("نص الرسالة"), "رسالة تجريبية");

    // اختيار نوع الطلب
    const topicSelect = screen.getByLabelText("نوع الطلب");
    fireEvent.mouseDown(topicSelect);
    fireEvent.click(screen.getByText("مبيعات"));

    // إرسال النموذج
    await user.click(screen.getByText("إرسال الرسالة"));

    expect(screen.getByText("جاري الإرسال…")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("إرسال الرسالة")).toBeDisabled();

    // إكمال الإرسال
    resolveSubmit!({ id: "123", status: "success" });
  });

  it("يجب أن يفتح دردشة كليم عند النقر على الأيقونة", async () => {
    const user = userEvent.setup();
    render(<ContactForm config={mockConfig} />);

    const chatButton = screen.getByRole("button", { name: /افتح دردشة كليم/i });
    await user.click(chatButton);

    expect(window.KaleemChat.open).toHaveBeenCalled();
  });

  it("يجب أن يدعم رفع الملفات", async () => {
    const user = userEvent.setup();
    const mockFiles = [
      new File(["test"], "test.png", { type: "image/png" }),
      new File(["test"], "document.pdf", { type: "application/pdf" }),
    ];

    const fileInput = screen.getByLabelText("إرفاق ملفات (اختياري)");
    await user.upload(fileInput, mockFiles);

    expect(fileInput.files).toHaveLength(2);
  });

  it("يجب أن يعرض رسائل التحقق من الحقول المطلوبة", async () => {
    const user = userEvent.setup();
    render(<ContactForm config={mockConfig} />);

    // محاولة إرسال النموذج فارغ
    await user.click(screen.getByText("إرسال الرسالة"));

    await waitFor(() => {
      expect(screen.getByText("الاسم مطلوب")).toBeInTheDocument();
      expect(screen.getByText("البريد الإلكتروني مطلوب")).toBeInTheDocument();
      expect(screen.getByText("نوع الطلب مطلوب")).toBeInTheDocument();
      expect(screen.getByText("الموضوع مطلوب")).toBeInTheDocument();
      expect(screen.getByText("نص الرسالة مطلوب")).toBeInTheDocument();
    });
  });

  it("يجب أن يتحقق من صحة البريد الإلكتروني", async () => {
    const user = userEvent.setup();
    render(<ContactForm config={mockConfig} />);

    await user.type(screen.getByLabelText("البريد الإلكتروني"), "invalid-email");
    await user.tab(); // trigger onBlur

    await waitFor(() => {
      expect(screen.getByText("بريد إلكتروني غير صحيح")).toBeInTheDocument();
    });
  });
});
