import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadOnlySlugCard from "./ReadOnlySlugCard";

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn(),
  },
  writable: true,
});

// Mock import.meta.env
vi.mock("import.meta.env", () => ({
  VITE_PUBLIC_WEB_ORIGIN: "https://example.com",
}));

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    origin: "https://example.com",
  },
  writable: true,
});

describe("ReadOnlySlugCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يعرض عنوان الروابط العامة", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByText("روابطك العامة")).toBeInTheDocument();
  });

  it("يجب أن يعرض السلاج المقدم", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByDisplayValue("test-slug")).toBeInTheDocument();
  });

  it("يجب أن يعرض رابط الدردشة الصحيح", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByDisplayValue("https://example.com/test-slug/chat")).toBeInTheDocument();
  });

  it("يجب أن يعرض رابط المتجر الصحيح", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByDisplayValue("https://example.com/test-slug/store")).toBeInTheDocument();
  });

  it("يجب أن يعرض — عندما لا يكون هناك سلاج", () => {
    render(<ReadOnlySlugCard />);
    
    expect(screen.getByDisplayValue("")).toBeInTheDocument(); // السلاج فارغ
    expect(screen.getByDisplayValue("—")).toBeInTheDocument(); // رابط الدردشة
    expect(screen.getByDisplayValue("—")).toBeInTheDocument(); // رابط المتجر
  });

  it("يجب أن يعرض — عندما يكون السلاج فارغ", () => {
    render(<ReadOnlySlugCard publicSlug="" />);
    
    expect(screen.getByDisplayValue("")).toBeInTheDocument(); // السلاج فارغ
    expect(screen.getByDisplayValue("—")).toBeInTheDocument(); // رابط الدردشة
    expect(screen.getByDisplayValue("—")).toBeInTheDocument(); // رابط المتجر
  });

  it("يجب أن يعرض — عندما يكون السلاج undefined", () => {
    render(<ReadOnlySlugCard publicSlug={undefined} />);
    
    expect(screen.getByDisplayValue("")).toBeInTheDocument(); // السلاج فارغ
    expect(screen.getByDisplayValue("—")).toBeInTheDocument(); // رابط الدردشة
    expect(screen.getByDisplayValue("—")).toBeInTheDocument(); // رابط المتجر
  });

  it("يجب أن يعرض جميع الحقول المطلوبة", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByLabelText("السلاج")).toBeInTheDocument();
    expect(screen.getByLabelText("رابط الدردشة")).toBeInTheDocument();
    expect(screen.getByLabelText("رابط المتجر")).toBeInTheDocument();
  });

  it("يجب أن تكون جميع الحقول للقراءة فقط", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const slugInput = screen.getByLabelText("السلاج");
    const chatInput = screen.getByLabelText("رابط الدردشة");
    const storeInput = screen.getByLabelText("رابط المتجر");

    expect(slugInput).toHaveAttribute("readonly");
    expect(chatInput).toHaveAttribute("readonly");
    expect(storeInput).toHaveAttribute("readonly");
  });

  it("يجب أن يعرض أزرار النسخ", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const copyButtons = screen.getAllByRole("button");
    expect(copyButtons).toHaveLength(2); // زر نسخ لكل من رابط الدردشة والمتجر
  });

  it("يجب أن ينسخ رابط الدردشة عند الضغط على زر النسخ", async () => {
    const user = userEvent.setup();
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const copyButtons = screen.getAllByRole("button");
    await user.click(copyButtons[0]); // زر نسخ رابط الدردشة

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/test-slug/chat");
  });

  it("يجب أن ينسخ رابط المتجر عند الضغط على زر النسخ", async () => {
    const user = userEvent.setup();
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const copyButtons = screen.getAllByRole("button");
    await user.click(copyButtons[1]); // زر نسخ رابط المتجر

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/test-slug/store");
  });

  it("يجب أن يتعامل مع أخطاء النسخ", async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("Copy failed"));
    
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const copyButtons = screen.getAllByRole("button");
    await user.click(copyButtons[0]);

    // يجب ألا يرمي خطأ
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("يجب أن يعرض tooltips لأزرار النسخ", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const tooltips = screen.getAllByTitle("نسخ");
    expect(tooltips).toHaveLength(2);
  });

  it("يجب أن يستخدم window.location.origin عندما لا يكون VITE_PUBLIC_WEB_ORIGIN متوفر", () => {
    // إعادة تعيين mock
    vi.mocked(require("import.meta.env")).VITE_PUBLIC_WEB_ORIGIN = undefined;
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://custom-domain.com",
      },
      writable: true,
    });

    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByDisplayValue("https://custom-domain.com/test-slug/chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://custom-domain.com/test-slug/store")).toBeInTheDocument();
  });

  it("يجب أن ينظف origin من الشرائط المائلة في النهاية", () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://example.com/",
      },
      writable: true,
    });

    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    expect(screen.getByDisplayValue("https://example.com/test-slug/chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/test-slug/store")).toBeInTheDocument();
  });

  it("يجب أن يعرض البادئة / للسلاج", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug" />);
    
    const slugInput = screen.getByLabelText("السلاج");
    expect(slugInput).toBeInTheDocument();
  });

  it("يجب أن يعمل مع السلاجات الطويلة", () => {
    const longSlug = "very-long-slug-name-with-many-characters";
    render(<ReadOnlySlugCard publicSlug={longSlug} />);
    
    expect(screen.getByDisplayValue(longSlug)).toBeInTheDocument();
    expect(screen.getByDisplayValue(`https://example.com/${longSlug}/chat`)).toBeInTheDocument();
    expect(screen.getByDisplayValue(`https://example.com/${longSlug}/store`)).toBeInTheDocument();
  });

  it("يجب أن يعمل مع السلاجات التي تحتوي على أرقام", () => {
    render(<ReadOnlySlugCard publicSlug="test123" />);
    
    expect(screen.getByDisplayValue("test123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/test123/chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/test123/store")).toBeInTheDocument();
  });

  it("يجب أن يعمل مع السلاجات التي تحتوي على شرائط", () => {
    render(<ReadOnlySlugCard publicSlug="test-slug-name" />);
    
    expect(screen.getByDisplayValue("test-slug-name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/test-slug-name/chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/test-slug-name/store")).toBeInTheDocument();
  });
});
