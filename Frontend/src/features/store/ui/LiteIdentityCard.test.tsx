import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LiteIdentityCard from "./LiteIdentityCard";

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

import axiosInstance from "@/shared/api/axios";
import { saveLocalCustomer } from "@/shared/utils/customer";

describe("LiteIdentityCard", () => {
  const merchantId = "test-merchant-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يعرض النموذج مع البيانات المحفوظة مسبقاً", () => {
    render(<LiteIdentityCard merchantId={merchantId} />);

    expect(screen.getByLabelText("الاسم")).toHaveValue("Test User");
    expect(screen.getByLabelText("الجوال")).toHaveValue("+966501234567");
    expect(screen.getByLabelText("العنوان")).toHaveValue("Riyadh, Saudi Arabia");
  });

  it("يجب أن يحدث الحقول عند الكتابة", async () => {
    const user = userEvent.setup();
    render(<LiteIdentityCard merchantId={merchantId} />);

    const nameInput = screen.getByLabelText("الاسم");
    const phoneInput = screen.getByLabelText("الجوال");
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

  it("يجب أن يكون زر الحفظ معطل عندما يكون رقم الجوال فارغاً", () => {
    render(<LiteIdentityCard merchantId={merchantId} />);

    const phoneInput = screen.getByLabelText("الجوال");
    const saveButton = screen.getByText("حفظ");

    fireEvent.change(phoneInput, { target: { value: "" } });

    expect(saveButton).toBeDisabled();
  });

  it("يجب أن يرسل البيانات عند الضغط على حفظ", async () => {
    const user = userEvent.setup();
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({ data: {} });

    render(<LiteIdentityCard merchantId={merchantId} />);

    const saveButton = screen.getByText("حفظ");
    await user.click(saveButton);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        `/storefront/merchant/${merchantId}/leads`,
        {
          sessionId: "test-session-id",
          data: {
            name: "Test User",
            phone: "+966501234567",
            address: "Riyadh, Saudi Arabia",
          },
          source: "mini-store",
        }
      );
    });

    expect(saveLocalCustomer).toHaveBeenCalledWith({
      name: "Test User",
      phone: "+966501234567",
      address: "Riyadh, Saudi Arabia",
    });
  });

  it("يجب أن يعرض رسالة نجاح بعد الحفظ", async () => {
    const user = userEvent.setup();
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({ data: {} });

    render(<LiteIdentityCard merchantId={merchantId} />);

    const saveButton = screen.getByText("حفظ");
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("تم حفظ بياناتك—سنظهر طلباتك تلقائيًا.")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض حالة التحميل أثناء الحفظ", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(axiosInstance.post).mockReturnValueOnce(promise);

    render(<LiteIdentityCard merchantId={merchantId} />);

    const saveButton = screen.getByText("حفظ");
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();

    resolvePromise!({ data: {} });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it("يجب أن يتعامل مع الأخطاء بشكل صحيح", async () => {
    const user = userEvent.setup();
    vi.mocked(axiosInstance.post).mockRejectedValueOnce(new Error("Network error"));

    render(<LiteIdentityCard merchantId={merchantId} />);

    const saveButton = screen.getByText("حفظ");
    await user.click(saveButton);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});
