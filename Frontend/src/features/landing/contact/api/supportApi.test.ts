import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildContactFormData, submitContact } from "./supportApi";
import type { ContactPayload } from "../types";

// Mock axios
vi.mock("@/shared/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import axios from "@/shared/api/axios";

describe("Support API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildContactFormData", () => {
    const mockPayload: ContactPayload = {
      name: "أحمد محمد",
      email: "ahmed@example.com",
      phone: "0501234567",
      topic: "sales" as any,
      subject: "استفسار عن الخدمات",
      message: "أريد معرفة المزيد عن خدماتكم",
      website: "",
    };

    it("يجب أن ينشئ FormData مع البيانات الأساسية", () => {
      const formData = buildContactFormData(mockPayload);

      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get("payload")).toBe(JSON.stringify(mockPayload));
    });

    it("يجب أن يضيف الملفات إلى FormData", () => {
      const mockFiles = [
        new File(["test1"], "file1.pdf", { type: "application/pdf" }),
        new File(["test2"], "file2.jpg", { type: "image/jpeg" }),
      ];

      const formData = buildContactFormData(mockPayload, mockFiles);

      expect(formData.get("payload")).toBe(JSON.stringify(mockPayload));
      expect(formData.getAll("files")).toHaveLength(2);
      expect(formData.get("files")).toBe(mockFiles[0]);
    });

    it("يجب أن يحد من عدد الملفات إلى 5", () => {
      const mockFiles = Array.from({ length: 7 }, (_, i) => 
        new File([`test${i}`], `file${i}.pdf`, { type: "application/pdf" })
      );

      const formData = buildContactFormData(mockPayload, mockFiles);

      expect(formData.getAll("files")).toHaveLength(5);
    });

    it("يجب أن يتعامل مع FileList", () => {
      const mockFileList = {
        0: new File(["test"], "file.pdf", { type: "application/pdf" }),
        1: new File(["test2"], "file2.jpg", { type: "image/jpeg" }),
        length: 2,
        item: (index: number) => mockFileList[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) {
            yield this[i];
          }
        },
      } as FileList;

      const formData = buildContactFormData(mockPayload, mockFileList);

      expect(formData.getAll("files")).toHaveLength(2);
    });

    it("يجب أن يتعامل مع null أو undefined للملفات", () => {
      const formData1 = buildContactFormData(mockPayload, null);
      const formData2 = buildContactFormData(mockPayload, undefined);

      expect(formData1.get("payload")).toBe(JSON.stringify(mockPayload));
      expect(formData1.getAll("files")).toHaveLength(0);
      expect(formData2.get("payload")).toBe(JSON.stringify(mockPayload));
      expect(formData2.getAll("files")).toHaveLength(0);
    });

    it("يجب أن يحافظ على جميع البيانات في payload", () => {
      const complexPayload: ContactPayload = {
        name: "أحمد محمد",
        email: "ahmed@example.com",
        phone: "0501234567",
        topic: "support" as any,
        subject: "مشكلة تقنية",
        message: "لدي مشكلة في النظام",
        website: "",
      };

      const formData = buildContactFormData(complexPayload);

      const payloadData = JSON.parse(formData.get("payload") as string);
      expect(payloadData).toEqual(complexPayload);
    });
  });

  describe("submitContact", () => {
    const mockPayload: ContactPayload = {
      name: "أحمد محمد",
      email: "ahmed@example.com",
      phone: "0501234567",
      topic: "sales" as any,
      subject: "استفسار عن الخدمات",
      message: "أريد معرفة المزيد عن خدماتكم",
      website: "",
    };

    const mockResponse = {
      id: "contact-123",
      status: "success",
      message: "تم استلام رسالتك بنجاح",
    };

    it("يجب أن يرسل البيانات إلى النقطة الصحيحة", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await submitContact(mockPayload);

      expect(axios.post).toHaveBeenCalledWith(
        "/support/contact",
        expect.any(FormData),
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it("يجب أن يرسل البيانات مع الملفات", async () => {
      const mockFiles = [
        new File(["test"], "file.pdf", { type: "application/pdf" }),
      ];

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      await submitContact(mockPayload, mockFiles);

      const formData = vi.mocked(axios.post).mock.calls[0][1] as FormData;
      expect(formData.get("payload")).toBe(JSON.stringify(mockPayload));
      expect(formData.getAll("files")).toHaveLength(1);
    });

    it("يجب أن يعيد البيانات من الاستجابة", async () => {
      const customResponse = {
        id: "custom-123",
        status: "pending",
        message: "جاري معالجة طلبك",
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: customResponse });

      const result = await submitContact(mockPayload);

      expect(result).toEqual(customResponse);
    });

    it("يجب أن يتعامل مع الأخطاء", async () => {
      const errorMessage = "حدث خطأ في الخادم";
      vi.mocked(axios.post).mockRejectedValueOnce(new Error(errorMessage));

      await expect(submitContact(mockPayload)).rejects.toThrow(errorMessage);
    });

    it("يجب أن يستخدم Content-Type الصحيح", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      await submitContact(mockPayload);

      expect(axios.post).toHaveBeenCalledWith(
        "/support/contact",
        expect.any(FormData),
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
    });

    it("يجب أن يتعامل مع payload فارغ", async () => {
      const emptyPayload: ContactPayload = {
        name: "",
        email: "",
        phone: "",
        topic: "sales" as any,
        subject: "",
        message: "",
        website: "",
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      await submitContact(emptyPayload);

      const formData = vi.mocked(axios.post).mock.calls[0][1] as FormData;
      expect(formData.get("payload")).toBe(JSON.stringify(emptyPayload));
    });
  });
});
