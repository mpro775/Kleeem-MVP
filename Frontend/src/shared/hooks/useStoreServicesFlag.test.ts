import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStoreServicesFlag } from "./useStoreServicesFlag";

// Mock auth context
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
  }),
}));

// Mock integrations API
vi.mock("@/features/integtarions/api/integrationsApi", () => ({
  getIntegrationsStatus: vi.fn(),
}));

import { getIntegrationsStatus, type IntegrationsStatus } from "@/features/integtarions/api/integrationsApi";

describe("useStoreServicesFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يعيد true كقيمة افتراضية", () => {
    const { result } = renderHook(() => useStoreServicesFlag());
    
    expect(result.current).toBe(true);
  });

  it("يجب أن يعيد true عندما لا يكون هناك توكن", () => {
    vi.mocked(require("@/context/AuthContext").useAuth).mockReturnValue({
      token: null,
    });

    const { result } = renderHook(() => useStoreServicesFlag());
    
    expect(result.current).toBe(true);
  });

  it("يجب أن يعيد false عندما يكون سلة متصل", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: true, connected: true },
      zid: { active: false, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    expect(getIntegrationsStatus).toHaveBeenCalledWith("test-token");
  });

  it("يجب أن يعيد false عندما يكون زد متصل", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: false, connected: false },
      zid: { active: true, connected: true },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    expect(getIntegrationsStatus).toHaveBeenCalledWith("test-token");
  });

  it("يجب أن يعيد false عندما يكون كلا المزودين متصلين", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: true, connected: true },
      zid: { active: true, connected: true },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("يجب أن يعيد true عندما لا يكون أي مزود متصل", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: false, connected: false },
      zid: { active: false, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يعيد true عندما يكون سلة فعال ولكن غير متصل", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: true, connected: false },
      zid: { active: false, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يعيد true عندما يكون زد فعال ولكن غير متصل", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: false, connected: false },
      zid: { active: true, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يعيد true عند حدوث خطأ في الاستعلام", async () => {
    vi.mocked(getIntegrationsStatus).mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يعيد true عند فشل الاستعلام", async () => {
    vi.mocked(getIntegrationsStatus).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يتعامل مع البيانات غير المكتملة", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: undefined,
      zid: { active: false, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يتعامل مع البيانات الفارغة", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({});

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يتعامل مع البيانات null", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({} as IntegrationsStatus);

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يتعامل مع البيانات undefined", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({} as IntegrationsStatus);

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("يجب أن يتحقق من حالة الاتصال فقط", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: false, connected: true },
      zid: { active: false, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("يجب أن يتحقق من حالة الفعالية فقط", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: true, connected: false },
      zid: { active: false, connected: false },
    });

    const { result } = renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("يجب أن يستخدم التوكن الصحيح في الاستعلام", async () => {
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: false, connected: false },
      zid: { active: false, connected: false },
    });

    renderHook(() => useStoreServicesFlag());

    await waitFor(() => {
      expect(getIntegrationsStatus).toHaveBeenCalledWith("test-token");
    });
  });

  it("يجب أن يتعامل مع تغيير التوكن", async () => {
    const mockUseAuth = vi.mocked(require("@/context/AuthContext").useAuth);
    
    // أول استدعاء بدون توكن
    mockUseAuth.mockReturnValue({ token: null });
    
    const { result, rerender } = renderHook(() => useStoreServicesFlag());
    
    expect(result.current).toBe(true);

    // تغيير التوكن
    mockUseAuth.mockReturnValue({ token: "new-token" });
    vi.mocked(getIntegrationsStatus).mockResolvedValue({
      salla: { active: true, connected: true },
      zid: { active: false, connected: false },
    });

    rerender();

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    expect(getIntegrationsStatus).toHaveBeenCalledWith("new-token");
  });
});
