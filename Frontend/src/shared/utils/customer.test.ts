import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLocalCustomer, saveLocalCustomer, type LiteCustomer } from "./customer";

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

describe("Customer Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
  });

  describe("getLocalCustomer", () => {
    it("يجب أن يعيد كائن فارغ عندما لا توجد بيانات محفوظة", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = getLocalCustomer();

      expect(result).toEqual({});
      expect(localStorageMock.getItem).toHaveBeenCalledWith("kleem:customer");
    });

    it("يجب أن يعيد كائن فارغ عندما تكون البيانات فارغة", () => {
      localStorageMock.getItem.mockReturnValue("");

      const result = getLocalCustomer();

      expect(result).toEqual({});
    });

    it("يجب أن يعيد بيانات العميل المحفوظة", () => {
      const customerData: LiteCustomer = {
        name: "أحمد محمد",
        phone: "+966501234567",
        address: "الرياض، المملكة العربية السعودية",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(customerData));

      const result = getLocalCustomer();

      expect(result).toEqual(customerData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith("kleem:customer");
    });

    it("يجب أن يعيد كائن فارغ عند حدوث خطأ في تحليل JSON", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const result = getLocalCustomer();

      expect(result).toEqual({});
    });

    it("يجب أن يعيد كائن فارغ عند حدوث خطأ في localStorage", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = getLocalCustomer();

      expect(result).toEqual({});
    });

    it("يجب أن يعيد البيانات الجزئية", () => {
      const partialData = { name: "أحمد محمد" };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialData));

      const result = getLocalCustomer();

      expect(result).toEqual(partialData);
    });
  });

  describe("saveLocalCustomer", () => {
    it("يجب أن يحفظ بيانات العميل الكاملة", () => {
      const customerData: LiteCustomer = {
        name: "أحمد محمد",
        phone: "+966501234567",
        address: "الرياض، المملكة العربية السعودية",
      };

      saveLocalCustomer(customerData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify(customerData)
      );
    });

    it("يجب أن يحفظ البيانات الجزئية", () => {
      const partialData = { name: "أحمد محمد" };

      saveLocalCustomer(partialData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify(partialData)
      );
    });

    it("يجب أن يحفظ كائن فارغ عند تمرير null", () => {
      saveLocalCustomer(null as any);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify({})
      );
    });

    it("يجب أن يحفظ كائن فارغ عند تمرير undefined", () => {
      saveLocalCustomer(undefined as any);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify({})
      );
    });

    it("يجب أن يحفظ كائن فارغ عند تمرير كائن فارغ", () => {
      saveLocalCustomer({});

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify({})
      );
    });

    it("يجب أن يتعامل مع البيانات المعقدة", () => {
      const complexData: LiteCustomer = {
        name: "أحمد محمد علي",
        phone: "+966-50-123-4567",
        address: "شارع الملك فهد، حي النزهة، الرياض 12345",
      };

      saveLocalCustomer(complexData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify(complexData)
      );
    });

    it("يجب أن يتعامل مع البيانات التي تحتوي على رموز خاصة", () => {
      const specialData: LiteCustomer = {
        name: "أحمد محمد (محمد)",
        phone: "+966-50-123-4567",
        address: "شارع الملك فهد، حي النزهة، الرياض 12345، المملكة العربية السعودية",
      };

      saveLocalCustomer(specialData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "kleem:customer",
        JSON.stringify(specialData)
      );
    });
  });

  describe("Integration", () => {
    it("يجب أن يحفظ ويعيد البيانات بشكل صحيح", () => {
      const customerData: LiteCustomer = {
        name: "أحمد محمد",
        phone: "+966501234567",
        address: "الرياض، المملكة العربية السعودية",
      };

      // محاكاة حفظ البيانات
      localStorageMock.setItem.mockImplementation((key, value) => {
        if (key === "kleem:customer") {
          localStorageMock.getItem.mockReturnValue(value);
        }
      });

      saveLocalCustomer(customerData);
      const retrieved = getLocalCustomer();

      expect(retrieved).toEqual(customerData);
    });

    it("يجب أن يتعامل مع التحديثات المتتالية", () => {
      const initialData: LiteCustomer = { name: "أحمد" };
      const updatedData: LiteCustomer = { 
        name: "أحمد محمد", 
        phone: "+966501234567" 
      };

      // محاكاة حفظ البيانات
      localStorageMock.setItem.mockImplementation((key, value) => {
        if (key === "kleem:customer") {
          localStorageMock.getItem.mockReturnValue(value);
        }
      });

      saveLocalCustomer(initialData);
      expect(getLocalCustomer()).toEqual(initialData);

      saveLocalCustomer(updatedData);
      expect(getLocalCustomer()).toEqual(updatedData);
    });
  });
});
