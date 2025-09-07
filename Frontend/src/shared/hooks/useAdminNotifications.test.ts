import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAdminNotifications } from "./useAdminNotifications";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock auth context
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
    user: {
      id: "test-user-id",
      merchantId: "test-merchant-id",
    },
  }),
}));

// Mock environment variables
vi.mock("import.meta.env", () => ({
  VITE_WS_ORIGIN: "ws://localhost:3000",
  VITE_WS_PATH: "/api/kleem/ws",
}));

import { io } from "socket.io-client";

describe("useAdminNotifications", () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockOnNewMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(io).mockReturnValue(mockSocket as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("يجب أن ينشئ اتصال socket عند توفر التوكن", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    expect(io).toHaveBeenCalledWith("ws://localhost:3000", {
      path: "/api/kleem/ws",
      transports: ["websocket", "polling"],
      auth: { token: "test-token" },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });
  });

  it("يجب أن يشترك في قناة التاجر عند الاتصال", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback الاتصال
    const connectCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "connect"
    )?.[1];

    expect(connectCallback).toBeDefined();

    // محاكاة الاتصال
    connectCallback?.();

    expect(mockSocket.emit).toHaveBeenCalledWith("admin:subscribe", {
      merchantId: "test-merchant-id",
      userId: "test-user-id",
      version: "v1",
    });
  });

  it("يجب أن يعالج إشعارات المحادثة", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback الإشعارات
    const notificationCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "admin:notification"
    )?.[1];

    expect(notificationCallback).toBeDefined();

    // محاكاة إشعار محادثة
    const chatNotification = {
      sessionId: "session-123",
      message: { text: "مرحباً" },
      channel: "webchat",
      ts: 1234567890,
    };

    notificationCallback?.(chatNotification);

    expect(mockOnNewMessage).toHaveBeenCalledWith({
      kind: "chat",
      sessionId: "session-123",
      message: { text: "مرحباً" },
      channel: "webchat",
      ts: 1234567890,
    });
  });

  it("يجب أن يعالج إشعارات النظام", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback الإشعارات
    const notificationCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "admin:notification"
    )?.[1];

    expect(notificationCallback).toBeDefined();

    // محاكاة إشعار نظام
    const systemNotification = {
      id: "notification-123",
      type: "sync_completed",
      title: "اكتملت المزامنة",
      body: "تم مزامنة المنتجات بنجاح",
      severity: "success",
      data: { productCount: 100 },
      ts: 1234567890,
    };

    notificationCallback?.(systemNotification);

    expect(mockOnNewMessage).toHaveBeenCalledWith({
      kind: "system",
      id: "notification-123",
      type: "sync_completed",
      title: "اكتملت المزامنة",
      body: "تم مزامنة المنتجات بنجاح",
      severity: "success",
      data: { productCount: 100 },
      ts: 1234567890,
    });
  });

  it("يجب أن يعالج الإشعارات بدون معرف", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback الإشعارات
    const notificationCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "admin:notification"
    )?.[1];

    expect(notificationCallback).toBeDefined();

    // محاكاة إشعار بدون معرف
    const notificationWithoutId = {
      type: "general",
      title: "إشعار عام",
      body: "محتوى الإشعار",
    };

    notificationCallback?.(notificationWithoutId);

    expect(mockOnNewMessage).toHaveBeenCalledWith({
      kind: "system",
      id: expect.any(String), // يجب أن يُنشئ معرف عشوائي
      type: "general",
      title: "إشعار عام",
      body: "محتوى الإشعار",
      severity: "info",
      data: undefined,
      ts: expect.any(Number),
    });
  });

  it("يجب أن يدعم الحدث القديم للتوافقية", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // التحقق من تسجيل الحدث القديم
    const oldEventCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === "admin_new_message"
    );

    expect(oldEventCall).toBeDefined();
  });

  it("يجب أن يعالج أخطاء الاتصال", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback أخطاء الاتصال
    const connectErrorCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "connect_error"
    )?.[1];

    expect(connectErrorCallback).toBeDefined();

    // محاكاة خطأ اتصال
    const error = new Error("Connection failed");
    connectErrorCallback?.(error);

    expect(consoleSpy).toHaveBeenCalledWith("ws connect_error:", "Connection failed");
    
    consoleSpy.mockRestore();
  });

  it("يجب أن يعالج أخطاء Socket العامة", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback الأخطاء العامة
    const errorCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "error"
    )?.[1];

    expect(errorCallback).toBeDefined();

    // محاكاة خطأ عام
    const error = new Error("Socket error");
    errorCallback?.(error);

    expect(consoleSpy).toHaveBeenCalledWith("ws error:", error);
    
    consoleSpy.mockRestore();
  });

  it("يجب أن ينظف الاتصال عند إلغاء الاشتراك", () => {
    const { unmount } = renderHook(() => useAdminNotifications(mockOnNewMessage));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith("admin:notification", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("admin_new_message", expect.any(Function));
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("يجب أن يتجاهل الأخطاء في معالجة الإشعارات", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    // الحصول على callback الإشعارات
    const notificationCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "admin:notification"
    )?.[1];

    expect(notificationCallback).toBeDefined();

    // جعل callback الإشعارات يرمي خطأ
    mockOnNewMessage.mockImplementationOnce(() => {
      throw new Error("Processing error");
    });

    // محاكاة إشعار
    const notification = {
      id: "test-123",
      type: "test",
      title: "Test",
    };

    // يجب ألا يرمي خطأ
    expect(() => notificationCallback?.(notification)).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it("يجب أن يستخدم التوكن الحالي في الاتصال", () => {
    renderHook(() => useAdminNotifications(mockOnNewMessage));

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: "test-token" },
      })
    );
  });
});
