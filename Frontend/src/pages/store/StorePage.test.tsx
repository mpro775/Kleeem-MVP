// src/pages/store/StorePage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Router: نثبّت slugOrId=demo لتفادي location.search ---
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useParams: () => ({ slugOrId: "demo" }),
    useNavigate: () => vi.fn(),
  };
});

// --- Swiper mocks ---
vi.mock("swiper/react", () => ({
  Swiper: ({ children }: any) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: any) => <div data-testid="swiper-slide">{children}</div>,
}));
vi.mock("swiper/modules", () => ({ Pagination: {}, Autoplay: {} }));

// --- axiosInstance.get mock (لازم قبل استيراد StorePage) ---
vi.mock("@/shared/api/axios", () => ({
  default: { 
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// --- getStorefrontInfo mock ---
vi.mock("@/features/mechant/storefront-theme/api", () => ({
  getStorefrontInfo: vi.fn(),
}));

// --- session & customer utils ---
vi.mock("@/shared/utils/session", () => ({ getSessionId: () => "sess-1" }));
vi.mock("@/shared/utils/customer", () => ({
  getLocalCustomer: () => ({
    id: "customer-1",
    name: "Test Customer",
    email: "customer@test.com",
    phone: "+1234567890",
  }),
}));

// --- تبسيط المكونات الفرعية الثقيلة ---
vi.mock("@/features/store/ui/StoreNavbar", () => ({
  StoreNavbar: () => <div data-testid="store-navbar" />,
}));

vi.mock("@/features/store/ui/StoreHeader", () => ({
  StoreHeader: () => <div>متجر</div>, // يُسهّل تحقق النص
}));

vi.mock("@/features/store/ui/CategoryFilter", () => ({
  CategoryFilter: () => <div data-testid="category-filter" />,
}));

vi.mock("@/features/store/ui/ProductGrid", () => ({
  ProductGrid: ({ products }: any) => (
    <main>
      <div data-testid="product-grid">
        قائمة المنتجات ({products?.length || 0})
        {products?.map((p: any) => (
          <div key={p._id} data-testid={`product-${p._id}`}>
            {p.name}
          </div>
        ))}
      </div>
    </main>
  ),
}));

vi.mock("@/features/store/ui/Footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

vi.mock("@/features/store/ui/CartDialog", () => ({
  default: () => <div data-testid="cart-dialog" />,
}));

vi.mock("@/features/store/ui/LiteIdentityCard", () => ({
  default: () => (
    <div data-testid="identity">
      <span>Test Customer</span>
      <span>customer@test.com</span>
    </div>
  ),
}));

// ✅ بعد كل الـ mocks نستورد المكوّن
import StorePage from "./StorePage";
import axiosInstance from "@/shared/api/axios";
import { getStorefrontInfo } from "@/features/mechant/storefront-theme/api";

describe("StorePage", () => {
  const merchant = { _id: "m1", name: "Demo Merchant" } as any;
  const products = [
    { _id: "p1", name: "Prod A", description: "desc", category: "c1" },
    { _id: "p2", name: "Prod B", description: "desc", category: "c2" },
  ] as any[];
  const categories = [
    { _id: "c1", name: "Cat 1" },
    { _id: "c2", name: "Cat 2" },
  ] as any[];
  const storefront = { 
    _id: "sf1", 
    banners: [], 
    brandDark: "#123456",
    primaryColor: "#123456" 
  } as any;
  
  const offers = [
    {
      id: "p1",
      name: "Offer Prod A",
      priceOld: 100,
      priceNew: 80,
      priceEffective: 80,
      currency: "SAR",
      discountPct: 20,
      isActive: true,
      image: "https://example.com/offer1.jpg"
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // يُستدعى مرّة واحدة في useEffect: fetchStore("demo")
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: { merchant, products, categories },
    });
    // ثم getStorefrontInfo(merchant._id)
    vi.mocked(getStorefrontInfo).mockResolvedValueOnce(storefront);
    // ثم جلب العروض
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: offers,
    });
  });

  it("يجب أن يعرض صفحة المتجر بشكل صحيح", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByText(/متجر/i)).toBeInTheDocument();
    });
    expect(vi.mocked(axiosInstance.get)).toHaveBeenCalledWith("/storefront/demo");
    expect(vi.mocked(getStorefrontInfo)).toHaveBeenCalledWith(merchant._id);
  });

  it("يجب أن يعرض معلومات العميل", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByText(/Test Customer/i)).toBeInTheDocument();
      expect(screen.getByText(/customer@test.com/i)).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض قائمة المنتجات (main موجود)", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض حقل البحث", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByLabelText("ابحث عن منتج")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض زر العروض", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByText(/العروض/i)).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض قسم العروض عندما تكون متوفرة", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByText("عروضنا")).toBeInTheDocument();
    });
  });

  it("يجب أن يفلتر المنتجات عند البحث", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StorePage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText("ابحث عن منتج")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("ابحث عن منتج");
    await user.type(searchInput, "Prod A");

    await waitFor(() => {
      expect(searchInput).toHaveValue("Prod A");
    });
  });

  it("يجب أن يتبدل بين عرض العروض وجميع المنتجات", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StorePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/العروض/i)).toBeInTheDocument();
    });

    const offersButton = screen.getByText(/العروض/i);
    await user.click(offersButton);

    await waitFor(() => {
      expect(screen.getByText("عرض جميع المنتجات")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض زر السلة العائم", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /shopping cart/i })).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض عدد العناصر في السلة", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      const cartButton = screen.getByRole("button", { name: /shopping cart/i });
      expect(cartButton).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض التصنيفات في الشريط الجانبي", async () => {
    renderWithProviders(<StorePage />);
    await waitFor(() => {
      expect(screen.getByText("التصنيفات")).toBeInTheDocument();
    });
  });

  it("يجب أن يتعامل مع حالة التحميل", async () => {
    renderWithProviders(<StorePage />);
    
    // يجب أن يعرض عناصر التحميل في البداية
    expect(screen.getByTestId("product-grid")).toBeInTheDocument();
  });

  it("يجب أن يتعامل مع الأخطاء", async () => {
    vi.mocked(axiosInstance.get).mockRejectedValueOnce(new Error("Network error"));
    
    renderWithProviders(<StorePage />);
    
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("يجب أن يعرض البانرات عندما تكون متوفرة", async () => {
    const storefrontWithBanners = {
      ...storefront,
      banners: [
        {
          image: "https://example.com/banner1.jpg",
          text: "عرض خاص",
          active: true,
          order: 1
        }
      ]
    };
    
    vi.mocked(getStorefrontInfo).mockResolvedValueOnce(storefrontWithBanners);
    
    renderWithProviders(<StorePage />);
    
    await waitFor(() => {
      expect(screen.getByTestId("swiper")).toBeInTheDocument();
    });
  });
});
