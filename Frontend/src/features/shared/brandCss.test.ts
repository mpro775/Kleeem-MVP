import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setBrandVars } from "./brandCss";

// Mock document.documentElement
const mockDocumentElement = {
  style: {
    setProperty: vi.fn(),
  },
};

Object.defineProperty(document, "documentElement", {
  value: mockDocumentElement,
  writable: true,
});

describe("Brand CSS Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setBrandVars", () => {
    it("يجب أن يضبط متغيرات CSS للون الأساسي", () => {
      const hexColor = "#FF5733";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#FF7A5C");
    });

    it("يجب أن يعمل مع الألوان السوداء", () => {
      const hexColor = "#000000";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#141414");
    });

    it("يجب أن يعمل مع الألوان البيضاء", () => {
      const hexColor = "#FFFFFF";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#FFFFFF");
    });

    it("يجب أن يعمل مع الألوان الرمادية", () => {
      const hexColor = "#808080";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#8A8A8A");
    });

    it("يجب أن يعمل مع الألوان الزرقاء", () => {
      const hexColor = "#0066CC";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#1A75D1");
    });

    it("يجب أن يعمل مع الألوان الخضراء", () => {
      const hexColor = "#00AA00";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#1AB31A");
    });

    it("يجب أن يعمل مع الألوان الحمراء", () => {
      const hexColor = "#CC0000";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#D11A1A");
    });

    it("يجب أن يعمل مع الألوان الصفراء", () => {
      const hexColor = "#FFCC00";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#FFD11A");
    });

    it("يجب أن يعمل مع الألوان البنفسجية", () => {
      const hexColor = "#9933CC";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#A33DD1");
    });

    it("يجب أن يعمل مع الألوان البرتقالية", () => {
      const hexColor = "#FF6600";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand-hover", "#FF751A");
    });

    it("يجب أن يضبط جميع المتغيرات المطلوبة", () => {
      const hexColor = "#123456";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledTimes(3);
      expect(mockDocumentElement.style.setProperty).toHaveBeenNthCalledWith(1, "--brand", hexColor);
      expect(mockDocumentElement.style.setProperty).toHaveBeenNthCalledWith(2, "--on-brand", "#FFFFFF");
      expect(mockDocumentElement.style.setProperty).toHaveBeenNthCalledWith(3, "--brand-hover", expect.any(String));
    });

    it("يجب أن يحسب لون hover بشكل صحيح", () => {
      const hexColor = "#FF0000";
      
      setBrandVars(hexColor);

      const hoverCall = mockDocumentElement.style.setProperty.mock.calls.find(
        call => call[0] === "--brand-hover"
      );
      
      expect(hoverCall).toBeDefined();
      expect(hoverCall![1]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe("Color Calculations", () => {
    it("يجب أن يحسب لون hover أفتح من اللون الأساسي", () => {
      const hexColor = "#000000";
      
      setBrandVars(hexColor);

      const hoverCall = mockDocumentElement.style.setProperty.mock.calls.find(
        call => call[0] === "--brand-hover"
      );
      
      expect(hoverCall![1]).toBe("#141414"); // أفتح من الأسود
    });

    it("يجب أن يحسب لون hover أفتح من اللون الرمادي", () => {
      const hexColor = "#808080";
      
      setBrandVars(hexColor);

      const hoverCall = mockDocumentElement.style.setProperty.mock.calls.find(
        call => call[0] === "--brand-hover"
      );
      
      expect(hoverCall![1]).toBe("#8A8A8A"); // أفتح من الرمادي
    });

    it("يجب أن يحسب لون hover أفتح من اللون الأزرق", () => {
      const hexColor = "#0066CC";
      
      setBrandVars(hexColor);

      const hoverCall = mockDocumentElement.style.setProperty.mock.calls.find(
        call => call[0] === "--brand-hover"
      );
      
      expect(hoverCall![1]).toBe("#1A75D1"); // أفتح من الأزرق
    });
  });

  describe("Edge Cases", () => {
    it("يجب أن يتعامل مع الألوان بدون #", () => {
      const hexColor = "FF5733";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
    });

    it("يجب أن يتعامل مع الألوان بثلاثة أرقام", () => {
      const hexColor = "#F53";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
    });

    it("يجب أن يتعامل مع الألوان بثمانية أرقام", () => {
      const hexColor = "#FF5733FF";
      
      setBrandVars(hexColor);

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith("--brand", hexColor);
    });
  });
});
