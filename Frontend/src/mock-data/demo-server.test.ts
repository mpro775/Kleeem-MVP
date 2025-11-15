/**
 * اختبارات بسيطة للتحقق من عمل خادم البيانات الوهمية
 * هذه الاختبارات تتحقق من أن الـ handlers تم إنشاؤها بشكل صحيح
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { demoServer, startDemoServer, stopDemoServer } from "./demo-server";
import { isMockDataEnabled, enableMockData, disableMockData } from "./index";

describe("Mock Data System", () => {
  beforeAll(() => {
    startDemoServer();
  });

  afterAll(() => {
    stopDemoServer();
  });

  describe("Server Initialization", () => {
    it("should start demo server", () => {
      expect(demoServer).toBeDefined();
    });
  });

  describe("Mock Data Toggle", () => {
    it("should check if mock data is enabled", () => {
      const enabled = isMockDataEnabled();
      expect(typeof enabled).toBe("boolean");
    });

    it("should enable mock data", () => {
      enableMockData();
      expect(isMockDataEnabled()).toBe(true);
    });

    it("should disable mock data", () => {
      disableMockData();
      expect(isMockDataEnabled()).toBe(false);
    });
  });

  describe("Data Files", () => {
    it("should have mock users data", async () => {
      const mockUsers = await import("../../data/mock-users.json");
      expect(mockUsers.default).toBeDefined();
      expect(Array.isArray(mockUsers.default)).toBe(true);
      expect(mockUsers.default.length).toBeGreaterThan(0);
    });

    it("should have mock products data", async () => {
      const mockProducts = await import("../../data/mock-products.json");
      expect(mockProducts.default).toBeDefined();
      expect(Array.isArray(mockProducts.default)).toBe(true);
    });

    it("should have mock conversations data", async () => {
      const mockConversations = await import("../../data/mock-conversations.json");
      expect(mockConversations.default).toBeDefined();
      expect(Array.isArray(mockConversations.default)).toBe(true);
    });

    it("should have mock dashboard data", async () => {
      const mockDashboard = await import("../../data/mock-dashboard.json");
      expect(mockDashboard.default).toBeDefined();
      expect(typeof mockDashboard.default).toBe("object");
    });
  });
});

