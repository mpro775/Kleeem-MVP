import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerInfoForm from "./CustomerInfoForm";

// Mock axios
vi.mock("@/shared/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock session utils
vi.mock("@/shared/utils/session", () => ({
  getSessionId: () => "test-session-id",
}));

// Mock customer utils
const mockCustomer = {
  name: "Test User",
  phone: "+966501234567",
  address: "Riyadh, Saudi Arabia",
};

vi.mock("@/shared/utils/customer", () => ({
  getLocalCustomer: () => mockCustomer,
  saveLocalCustomer: vi.fn(),
}));

import axios from "@/shared/api/axios";
import { saveLocalCustomer } from "@/shared/utils/customer";

describe("CustomerInfoForm", () => {
  const merchantId = "test-merchant-id";
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يعرض النموذج مع البيانات المحفوظة مسبقاً", () => {
    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    expect(screen.getByLabelText("الاسم")).toHaveValue("Test User");
    expect(screen.getByLabelText("رقم الجوال")).toHaveValue("+966501234567");
    expect(screen.getByLabelText("العنوان")).toHaveValue("Riyadh, Saudi Arabia");
  });

  it("يجب أن يحدث الحقول عند الكتابة", async () => {
    const user = userEvent.setup();
    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    const nameInput = screen.getByLabelText("الاسم");
    const phoneInput = screen.getByLabelText("رقم الجوال");
    const addressInput = screen.getByLabelText("العنوان");

    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.clear(phoneInput);
    await user.type(phoneInput, "+966509876543");
    await user.clear(addressInput);
    await user.type(addressInput, "Jeddah, Saudi Arabia");

    expect(nameInput).toHaveValue("New Name");
    expect(phoneInput).toHaveValue("+966509876543");
    expect(addressInput).toHaveValue("Jeddah, Saudi Arabia");
  });

  it("يجب أن يرسل البيانات عند تقديم النموذج", async () => {
    const user = userEvent.setup();
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });

    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    const submitButton = screen.getByText("متابعة");
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `/storefront/merchant/${merchantId}/leads`,
        {
          sessionId: "test-session-id",
          data: {
            name: "Test User",
            phone: "+966501234567",
            address: "Riyadh, Saudi Arabia",
          },
          source: "storefront",
        }
      );
    });

    expect(saveLocalCustomer).toHaveBeenCalledWith({
      name: "Test User",
      phone: "+966501234567",
      address: "Riyadh, Saudi Arabia",
    });

    expect(mockOnComplete).toHaveBeenCalledWith({
      name: "Test User",
      phone: "+966501234567",
      address: "Riyadh, Saudi Arabia",
    });
  });

  it("يجب أن يعرض حالة التحميل أثناء التقديم", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(axios.post).mockReturnValueOnce(promise);

    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    const submitButton = screen.getByText("متابعة");
    await user.click(submitButton);

    expect(screen.getByText("جارٍ الحفظ...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    resolvePromise!({ data: {} });
    await waitFor(() => {
      expect(screen.getByText("متابعة")).toBeInTheDocument();
    });
  });

  it("يجب أن يتعامل مع الأخطاء بشكل صحيح", async () => {
    const user = userEvent.setup();
    vi.mocked(axios.post).mockRejectedValueOnce(new Error("Network error"));

    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    const submitButton = screen.getByText("متابعة");
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("يجب أن يتحقق من الحقول المطلوبة", async () => {
    const user = userEvent.setup();
    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    const nameInput = screen.getByLabelText("الاسم");
    const phoneInput = screen.getByLabelText("رقم الجوال");
    const addressInput = screen.getByLabelText("العنوان");

    // مسح جميع الحقول
    await user.clear(nameInput);
    await user.clear(phoneInput);
    await user.clear(addressInput);

    // التحقق من أن الحقول مطلوبة
    expect(nameInput).toBeRequired();
    expect(phoneInput).toBeRequired();
    expect(addressInput).toBeRequired();
  });

  it("يجب أن يستخدم البيانات الجديدة عند التقديم", async () => {
    const user = userEvent.setup();
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });

    render(<CustomerInfoForm merchantId={merchantId} onComplete={mockOnComplete} />);

    const nameInput = screen.getByLabelText("الاسم");
    const phoneInput = screen.getByLabelText("رقم الجوال");
    const addressInput = screen.getByLabelText("العنوان");

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.clear(phoneInput);
    await user.type(phoneInput, "+966509876543");
    await user.clear(addressInput);
    await user.type(addressInput, "Updated Address");

    const submitButton = screen.getByText("متابعة");
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `/storefront/merchant/${merchantId}/leads`,
        {
          sessionId: "test-session-id",
          data: {
            name: "Updated Name",
            phone: "+966509876543",
            address: "Updated Address",
          },
          source: "storefront",
        }
      );
    });
  });
});
