import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadBannerImages } from "./api";

// Mock axios
vi.mock("@/shared/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import axios from "@/shared/api/axios";

describe("Store API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadBannerImages", () => {
    const merchantId = "test-merchant-id";
    const mockFiles = [
      new File(["test1"], "banner1.jpg", { type: "image/jpeg" }),
      new File(["test2"], "banner2.png", { type: "image/png" }),
    ];

    it("يجب أن يرسل الملفات بشكل صحيح", async () => {
      const mockResponse = {
        urls: ["https://example.com/banner1.jpg", "https://example.com/banner2.png"],
        accepted: 2,
        remaining: 8,
        max: 10,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await uploadBannerImages(merchantId, mockFiles);

      expect(axios.post).toHaveBeenCalledWith(
        `/storefront/by-merchant/${merchantId}/banners/upload`,
        expect.any(FormData),
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it("يجب أن يضيف الملفات إلى FormData", async () => {
      const mockResponse = {
        urls: ["https://example.com/banner1.jpg"],
        accepted: 1,
        remaining: 9,
        max: 10,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      await uploadBannerImages(merchantId, [mockFiles[0]]);

      const formDataCall = vi.mocked(axios.post).mock.calls[0][1] as FormData;
      
      // التحقق من أن FormData يحتوي على الملف
      const entries = Array.from(formDataCall.entries());
      expect(entries).toHaveLength(1);
      expect(entries[0][0]).toBe("files");
      expect(entries[0][1]).toBe(mockFiles[0]);
    });

    it("يجب أن يتعامل مع الملفات المتعددة", async () => {
      const mockResponse = {
        urls: ["https://example.com/banner1.jpg", "https://example.com/banner2.png"],
        accepted: 2,
        remaining: 8,
        max: 10,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      await uploadBannerImages(merchantId, mockFiles);

      const formDataCall = vi.mocked(axios.post).mock.calls[0][1] as FormData;
      const entries = Array.from(formDataCall.entries());
      
      expect(entries).toHaveLength(2);
      expect(entries[0][1]).toBe(mockFiles[0]);
      expect(entries[1][1]).toBe(mockFiles[1]);
    });

    it("يجب أن يتعامل مع الأخطاء", async () => {
      const error = new Error("Upload failed");
      vi.mocked(axios.post).mockRejectedValueOnce(error);

      await expect(uploadBannerImages(merchantId, mockFiles)).rejects.toThrow("Upload failed");
    });

    it("يجب أن يتعامل مع المصفوفة الفارغة", async () => {
      const mockResponse = {
        urls: [],
        accepted: 0,
        remaining: 10,
        max: 10,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await uploadBannerImages(merchantId, []);

      expect(axios.post).toHaveBeenCalledWith(
        `/storefront/by-merchant/${merchantId}/banners/upload`,
        expect.any(FormData),
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it("يجب أن يعيد البيانات الصحيحة من الاستجابة", async () => {
      const mockResponse = {
        urls: ["https://example.com/banner1.jpg"],
        accepted: 1,
        remaining: 5,
        max: 6,
      };

      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await uploadBannerImages(merchantId, [mockFiles[0]]);

      expect(result.urls).toEqual(["https://example.com/banner1.jpg"]);
      expect(result.accepted).toBe(1);
      expect(result.remaining).toBe(5);
      expect(result.max).toBe(6);
    });
  });
});
