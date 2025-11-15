import { describe, it, expect } from "vitest";
import type { SystemNotification, ChatNotification, AdminNotification } from "./notification";

describe("Notification Types", () => {
  describe("SystemNotification", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const notification: SystemNotification = {
        kind: "system",
        id: "notification-123",
        type: "embeddings.completed",
        title: "اكتملت الـ Embeddings",
        body: "تم معالجة جميع النصوص بنجاح",
        severity: "success",
        data: { processedCount: 1000 },
        ts: 1234567890,
      };

      expect(notification.kind).toBe("system");
      expect(notification.id).toBe("notification-123");
      expect(notification.type).toBe("embeddings.completed");
      expect(notification.title).toBe("اكتملت الـ Embeddings");
      expect(notification.body).toBe("تم معالجة جميع النصوص بنجاح");
      expect(notification.severity).toBe("success");
      expect(notification.data).toEqual({ processedCount: 1000 });
      expect(notification.ts).toBe(1234567890);
    });

    it("يجب أن يدعم الخصائص الاختيارية", () => {
      const notification: SystemNotification = {
        kind: "system",
        id: "notification-123",
        type: "general",
        title: "إشعار عام",
        ts: 1234567890,
      };

      expect(notification.body).toBeUndefined();
      expect(notification.severity).toBeUndefined();
      expect(notification.data).toBeUndefined();
    });

    it("يجب أن يدعم جميع أنواع الشدة", () => {
      const severities = ["info", "success", "warning", "error"] as const;
      
      severities.forEach((severity) => {
        const notification: SystemNotification = {
          kind: "system",
          id: `notification-${severity}`,
          type: "test",
          title: "Test",
          severity,
          ts: 1234567890,
        };

        expect(notification.severity).toBe(severity);
      });
    });

    it("يجب أن يدعم أنواع مختلفة من البيانات", () => {
      const notification: SystemNotification = {
        kind: "system",
        id: "notification-123",
        type: "catalog.sync.completed",
        title: "اكتملت المزامنة",
        data: {
          products: 150,
          categories: 10,
          errors: 0,
          duration: "2m 30s",
        },
        ts: 1234567890,
      };

      expect(notification.data.products).toBe(150);
      expect(notification.data.categories).toBe(10);
      expect(notification.data.errors).toBe(0);
      expect(notification.data.duration).toBe("2m 30s");
    });
  });

  describe("ChatNotification", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const notification: ChatNotification = {
        kind: "chat",
        sessionId: "session-123",
        message: { text: "مرحباً، أحتاج مساعدة" },
        channel: "webchat",
        ts: 1234567890,
      };

      expect(notification.kind).toBe("chat");
      expect(notification.sessionId).toBe("session-123");
      expect(notification.message.text).toBe("مرحباً، أحتاج مساعدة");
      expect(notification.channel).toBe("webchat");
      expect(notification.ts).toBe(1234567890);
    });

    it("يجب أن يدعم جميع القنوات", () => {
      const channels = ["whatsapp", "telegram", "webchat"] as const;
      
      channels.forEach((channel) => {
        const notification: ChatNotification = {
          kind: "chat",
          sessionId: `session-${channel}`,
          message: { text: "رسالة تجريبية" },
          channel,
          ts: 1234567890,
        };

        expect(notification.channel).toBe(channel);
      });
    });

    it("يجب أن يدعم رسائل مختلفة", () => {
      const messages = [
        "مرحباً",
        "أحتاج مساعدة في المنتج",
        "كيف يمكنني إلغاء طلبي؟",
        "شكراً لك",
      ];

      messages.forEach((text) => {
        const notification: ChatNotification = {
          kind: "chat",
          sessionId: "session-123",
          message: { text },
          channel: "webchat",
          ts: 1234567890,
        };

        expect(notification.message.text).toBe(text);
      });
    });
  });

  describe("AdminNotification", () => {
    it("يجب أن يدعم إشعارات النظام", () => {
      const systemNotification: AdminNotification = {
        kind: "system",
        id: "notification-123",
        type: "embeddings.completed",
        title: "اكتملت الـ Embeddings",
        severity: "success",
        ts: 1234567890,
      };

      expect(systemNotification.kind).toBe("system");
      expect(systemNotification.id).toBe("notification-123");
    });

    it("يجب أن يدعم إشعارات المحادثة", () => {
      const chatNotification: AdminNotification = {
        kind: "chat",
        sessionId: "session-123",
        message: { text: "مرحباً" },
        channel: "webchat",
        ts: 1234567890,
      };

      expect(chatNotification.kind).toBe("chat");
      expect(chatNotification.sessionId).toBe("session-123");
    });

    it("يجب أن يميز بين نوعي الإشعارات", () => {
      const notifications: AdminNotification[] = [
        {
          kind: "system",
          id: "system-123",
          type: "general",
          title: "إشعار نظام",
          ts: 1234567890,
        },
        {
          kind: "chat",
          sessionId: "chat-123",
          message: { text: "رسالة محادثة" },
          channel: "whatsapp",
          ts: 1234567890,
        },
      ];

      expect(notifications[0].kind).toBe("system");
      expect(notifications[1].kind).toBe("chat");

      // التحقق من الخصائص المحددة لكل نوع
      if (notifications[0].kind === "system") {
        expect(notifications[0].id).toBe("system-123");
        expect(notifications[0].type).toBe("general");
      }

      if (notifications[1].kind === "chat") {
        expect(notifications[1].sessionId).toBe("chat-123");
        expect(notifications[1].channel).toBe("whatsapp");
      }
    });

    it("يجب أن يدعم مصفوفة مختلطة من الإشعارات", () => {
      const mixedNotifications: AdminNotification[] = [
        {
          kind: "system",
          id: "sync-completed",
          type: "catalog.sync.completed",
          title: "اكتملت المزامنة",
          severity: "success",
          data: { products: 100 },
          ts: 1234567890,
        },
        {
          kind: "chat",
          sessionId: "customer-session",
          message: { text: "أريد معرفة حالة طلبي" },
          channel: "telegram",
          ts: 1234567890,
        },
        {
          kind: "system",
          id: "webhook-failed",
          type: "webhook.failed",
          title: "فشل Webhook",
          severity: "error",
          data: { endpoint: "/api/webhook", error: "Timeout" },
          ts: 1234567890,
        },
      ];

      expect(mixedNotifications).toHaveLength(3);
      expect(mixedNotifications[0].kind).toBe("system");
      expect(mixedNotifications[1].kind).toBe("chat");
      expect(mixedNotifications[2].kind).toBe("system");
    });
  });

  describe("Type Safety", () => {
    it("يجب أن يضمن أن إشعارات النظام تحتوي على معرف", () => {
      const systemNotification: SystemNotification = {
        kind: "system",
        id: "required-id",
        type: "test",
        title: "Test",
        ts: 1234567890,
      };

      expect(systemNotification.id).toBeDefined();
    });

    it("يجب أن يضمن أن إشعارات المحادثة تحتوي على معرف الجلسة", () => {
      const chatNotification: ChatNotification = {
        kind: "chat",
        sessionId: "required-session-id",
        message: { text: "Test" },
        channel: "webchat",
        ts: 1234567890,
      };

      expect(chatNotification.sessionId).toBeDefined();
    });

    it("يجب أن يضمن أن الرسائل تحتوي على نص", () => {
      const chatNotification: ChatNotification = {
        kind: "chat",
        sessionId: "session-123",
        message: { text: "required text" },
        channel: "webchat",
        ts: 1234567890,
      };

      expect(chatNotification.message.text).toBeDefined();
    });
  });
});
