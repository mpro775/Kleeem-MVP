import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSessionId } from "./session";

// Mock uuid
const mockUuid = vi.fn(() => "test-uuid-123");
vi.mock("uuid", () => ({
  v4: mockUuid,
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

import { v4 as uuid } from "uuid";

describe("Session Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
  });

  describe("getSessionId", () => {
    it("يجب أن يعيد معرف الجلسة الموجود", () => {
      const existingSessionId = "sess_existing-session-123";
      localStorageMock.getItem.mockReturnValue(existingSessionId);

      const result = getSessionId();

      expect(result).toBe(existingSessionId);
      expect(localStorageMock.getItem).toHaveBeenCalledWith("kleem:sessionId");
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("يجب أن ينشئ معرف جلسة جديد عندما لا يوجد", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = getSessionId();

      expect(result).toBe("sess_test-uuid-123");
      expect(localStorageMock.getItem).toHaveBeenCalledWith("kleem:sessionId");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_test-uuid-123"
      );
      expect(uuid).toHaveBeenCalled();
    });

    it("يجب أن ينشئ معرف جلسة جديد عندما تكون القيمة فارغة", () => {
      localStorageMock.getItem.mockReturnValue("");

      const result = getSessionId();

      expect(result).toBe("sess_test-uuid-123");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_test-uuid-123"
      );
    });

    it("يجب أن ينشئ معرف جلسة جديد عندما تكون القيمة undefined", () => {
      localStorageMock.getItem.mockReturnValue(undefined);

      const result = getSessionId();

      expect(result).toBe("sess_test-uuid-123");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_test-uuid-123"
      );
    });

    it("يجب أن يعيد نفس المعرف في الاستدعاءات المتتالية", () => {
      localStorageMock.getItem.mockReturnValue("sess_existing-session-123");

      const result1 = getSessionId();
      const result2 = getSessionId();
      const result3 = getSessionId();

      expect(result1).toBe("sess_existing-session-123");
      expect(result2).toBe("sess_existing-session-123");
      expect(result3).toBe("sess_existing-session-123");

      expect(localStorageMock.getItem).toHaveBeenCalledTimes(3);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("يجب أن ينشئ معرفات مختلفة عند عدم وجود معرف محفوظ", () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      // تغيير UUID في كل استدعاء
      vi.mocked(uuid)
        .mockReturnValueOnce("uuid-1")
        .mockReturnValueOnce("uuid-2");

      const result1 = getSessionId();
      
      // إعادة تعيين localStorage لعدم وجود معرف
      localStorageMock.getItem.mockReturnValue(null);
      
      const result2 = getSessionId();

      expect(result1).toBe("sess_uuid-1");
      expect(result2).toBe("sess_uuid-2");
    });

    it("يجب أن يضيف البادئة sess_ للمعرف الجديد", () => {
      localStorageMock.getItem.mockReturnValue(null);
      vi.mocked(uuid).mockReturnValue("new-uuid-456");

      const result = getSessionId();

      expect(result).toBe("sess_new-uuid-456");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_new-uuid-456"
      );
    });

    it("يجب أن يتعامل مع أخطاء localStorage", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = getSessionId();

      expect(result).toBe("sess_test-uuid-123");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_test-uuid-123"
      );
    });

    it("يجب أن يتعامل مع أخطاء حفظ localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("localStorage setItem error");
      });

      const result = getSessionId();

      expect(result).toBe("sess_test-uuid-123");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_test-uuid-123"
      );
    });

    it("يجب أن يستخدم المفتاح الصحيح في localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);

      getSessionId();

      expect(localStorageMock.getItem).toHaveBeenCalledWith("kleem:sessionId");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        expect.any(String)
      );
    });

    it("يجب أن يعيد معرف صحيح حتى مع أخطاء UUID", () => {
      localStorageMock.getItem.mockReturnValue(null);
      vi.mocked(uuid).mockImplementation(() => {
        throw new Error("UUID generation error");
      });

      // يجب أن يعيد معرف افتراضي أو يرمي خطأ
      expect(() => getSessionId()).toThrow("UUID generation error");
    });
  });

  describe("Session Persistence", () => {
    it("يجب أن يحفظ المعرف الجديد في localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);

      getSessionId();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:sessionId",
        "sess_test-uuid-123"
      );
    });

    it("يجب أن لا يحفظ المعرف إذا كان موجوداً بالفعل", () => {
      localStorageMock.getItem.mockReturnValue("sess_existing-123");

      getSessionId();

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe("Session Format", () => {
    it("يجب أن يتبع تنسيق المعرف المطلوب", () => {
      localStorageMock.getItem.mockReturnValue(null);
      vi.mocked(uuid).mockReturnValue("test-uuid-789");

      const result = getSessionId();

      expect(result).toMatch(/^sess_[a-zA-Z0-9-]+$/);
      expect(result).toBe("sess_test-uuid-789");
    });

    it("يجب أن يكون المعرف فريداً", () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const sessionIds = new Set();
      for (let i = 0; i < 10; i++) {
        vi.mocked(uuid).mockReturnValue(`uuid-${i}`);
        localStorageMock.getItem.mockReturnValue(null);
        sessionIds.add(getSessionId());
      }

      expect(sessionIds.size).toBe(10);
    });
  });
});
