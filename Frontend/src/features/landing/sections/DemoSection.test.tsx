import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import DemoSection from "./DemoSection";
import { vi } from "vitest";

// Mock the chat components
vi.mock("@/features/landing/chatKaleem", () => ({
  ChatHeader: ({ title }: { title: string }) => <div data-testid="chat-header">{title}</div>,
  ChatBubble: ({ msg }: { msg: any }) => (
    <div data-testid={msg.isBot ? "bot-message" : "user-message"}>{msg.text}</div>
  ),
  LiveChat: ({ messagesContainerRef }: { messagesContainerRef: any }) => (
    <div data-testid="live-chat">
      <button>Live Chat Started</button>
    </div>
  ),
  DEMO_MESSAGES: [
    { id: 1, text: "مرحباً، كيف يمكنني مساعدتك؟", isBot: true },
    { id: 2, text: "أريد معرفة المزيد عن المنتجات", isBot: false },
    { id: 3, text: "...", isBot: true },
  ],
  KLEEM_COLORS: {
    primary: "#1976d2",
    primaryHover: "#1565c0",
    secondary: "#dc004e",
  },
}));

describe("DemoSection", () => {
  test("يعرض عنوان القسم الرئيسي", () => {
    renderWithProviders(<DemoSection />);
    
    // البحث عن العنوان في عنصر h1 محدد
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain("تحدث مع");
    expect(heading.textContent).toContain("كَلِيم");
    expect(heading.textContent).toContain("الآن");
  });

  test("يعرض واجهة المحادثة التوضيحية", () => {
    renderWithProviders(<DemoSection />);
    
    expect(screen.getByTestId("chat-header")).toBeInTheDocument();
    expect(screen.getByText("اليوم")).toBeInTheDocument();
  });

  test("يعرض رسائل المحادثة التوضيحية", () => {
    renderWithProviders(<DemoSection />);
    
    expect(screen.getByText("مرحباً، كيف يمكنني مساعدتك؟")).toBeInTheDocument();
    expect(screen.getByText("أريد معرفة المزيد عن المنتجات")).toBeInTheDocument();
  });

  test("يحتوي على زر بدء المحادثة التفاعلية", () => {
    renderWithProviders(<DemoSection />);
    
    expect(screen.getByText("ابدأ المحادثة الآن")).toBeInTheDocument();
  });

  test("يفعل المحادثة التفاعلية عند الضغط على الزر", async () => {
    renderWithProviders(<DemoSection />);
    
    const interactiveButton = screen.getByText("ابدأ المحادثة الآن");
    fireEvent.click(interactiveButton);
    
    await waitFor(() => {
      expect(screen.getByTestId("live-chat")).toBeInTheDocument();
    });
  });

  test("يعرض رسالة اليوم في المحادثة", () => {
    renderWithProviders(<DemoSection />);
    
    expect(screen.getByText("اليوم")).toBeInTheDocument();
  });

  test("يعرض رسائل المحادثة مع التخطيط الصحيح", () => {
    renderWithProviders(<DemoSection />);
    
    // التحقق من وجود رسائل المحادثة
    expect(screen.getByText("مرحباً، كيف يمكنني مساعدتك؟")).toBeInTheDocument();
    expect(screen.getByText("أريد معرفة المزيد عن المنتجات")).toBeInTheDocument();
  });

  test("يحتوي على زر بدء المحادثة مع التصميم الصحيح", () => {
    renderWithProviders(<DemoSection />);
    
    const button = screen.getByText("ابدأ المحادثة الآن");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });
});
