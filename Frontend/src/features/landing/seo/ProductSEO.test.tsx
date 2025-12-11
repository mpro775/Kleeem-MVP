import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import ProductSEO from "./ProductSEO";

// Mock JsonLd component
vi.mock("./JsonLd", () => ({
  default: ({ type, data }: any) => (
    <div data-testid="json-ld" data-type={type}>
      {JSON.stringify(data)}
    </div>
  ),
}));

describe("ProductSEO", () => {
  const mockProduct = {
    name: "هاتف ذكي جديد",
    shortDescription: "هاتف ذكي متطور مع كاميرا عالية الجودة",
    richDescription: "<p>هاتف ذكي متطور مع كاميرا عالية الجودة</p>",
    price: 999.99,
    currency: "SAR",
    availability: "InStock" as const,
    brand: "أبل",
    category: "الإلكترونيات",
    images: [
      "https://example.com/phone1.jpg",
      "https://example.com/phone2.jpg",
    ],
    rating: 4.5,
    reviewCount: 128,
    sku: "PHONE-001",
    condition: "New" as const,
    color: "أسود",
    size: "6.1 بوصة",
    weight: 0.174,
    dimensions: {
      length: 15.1,
      width: 7.6,
      height: 0.8,
    },
  };

  beforeEach(() => {
    // Clear document head before each test
    document.head.innerHTML = "";
    document.title = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يحدث عنوان الصفحة", () => {
    const title = "هاتف ذكي جديد - أبل";
    render(
      <ProductSEO 
        title={title} 
        description="وصف تجريبي" 
        product={mockProduct}
      />
    );

    expect(document.title).toBe(title);
  });

  it("يجب أن يحدث meta description", () => {
    const description = "وصف تجريبي للمنتج";
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description={description} 
        product={mockProduct}
      />
    );

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute("content", description);
  });

  it("يجب أن يحدث meta keywords عند توفرها", () => {
    const keywords = "هاتف، ذكي، أبل، إلكترونيات";
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        keywords={keywords}
        product={mockProduct}
      />
    );

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    expect(metaKeywords).toHaveAttribute("content", keywords);
  });

  it("يجب أن يحدث canonical URL عند توفرها", () => {
    const canonical = "https://store.kaleem.com/product/phone-001";
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        canonical={canonical}
        product={mockProduct}
      />
    );

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    expect(canonicalLink).toHaveAttribute("href", canonical);
  });

  it("يجب أن يحدث robots meta tag", () => {
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={mockProduct}
      />
    );

    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).toHaveAttribute(
      "content", 
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    );
  });

  it("يجب أن يحدث robots meta tag إلى noindex عند noIndex=true", () => {
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        noIndex={true}
        product={mockProduct}
      />
    );

    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).toHaveAttribute("content", "noindex, nofollow");
  });

  it("يجب أن يحدث Open Graph tags للمنتج", () => {
    const title = "عنوان تجريبي";
    const description = "وصف تجريبي";
    const ogImage = "https://example.com/custom-image.jpg";

    render(
      <ProductSEO 
        title={title} 
        description={description} 
        ogImage={ogImage}
        product={mockProduct}
      />
    );

    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute("content", title);
    expect(document.querySelector('meta[property="og:description"]')).toHaveAttribute("content", description);
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute("content", "product");
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute("content", ogImage);
  });

  it("يجب أن يستخدم أول صورة من المنتج إذا لم يتم تحديد ogImage", () => {
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={mockProduct}
      />
    );

    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute("content", mockProduct.images[0]);
  });

  it("يجب أن يحدث بيانات المنتج في Open Graph", () => {
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={mockProduct}
      />
    );

    expect(document.querySelector('meta[property="og:product:price:amount"]')).toHaveAttribute("content", mockProduct.price.toString());
    expect(document.querySelector('meta[property="og:product:price:currency"]')).toHaveAttribute("content", mockProduct.currency);
    expect(document.querySelector('meta[property="og:product:availability"]')).toHaveAttribute("content", mockProduct.availability.toLowerCase());
    expect(document.querySelector('meta[property="og:product:condition"]')).toHaveAttribute("content", mockProduct.condition?.toLowerCase());
  });

  it("يجب أن يحدث Twitter Card tags", () => {
    const title = "عنوان تجريبي";
    const description = "وصف تجريبي";

    render(
      <ProductSEO 
        title={title} 
        description={description} 
        product={mockProduct}
      />
    );

    expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    expect(document.querySelector('meta[name="twitter:title"]')).toHaveAttribute("content", title);
    expect(document.querySelector('meta[name="twitter:description"]')).toHaveAttribute("content", description);
    expect(document.querySelector('meta[name="twitter:image"]')).toHaveAttribute("content", mockProduct.images[0]);
  });

  it("يجب أن يضيف breadcrumbs عند توفرها", () => {
    const breadcrumbs = [
      { name: "الرئيسية", url: "https://store.kaleem.com" },
      { name: "الإلكترونيات", url: "https://store.kaleem.com/electronics" },
      { name: "الهواتف", url: "https://store.kaleem.com/electronics/phones" },
    ];

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        breadcrumbs={breadcrumbs}
        product={mockProduct}
      />
    );

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    expect(structuredDataScript).toBeInTheDocument();
    
    const structuredData = JSON.parse(structuredDataScript!.textContent!);
    expect(structuredData["@type"]).toBe("BreadcrumbList");
    expect(structuredData.itemListElement).toHaveLength(3);
  });

  it("يجب أن يضيف structured data للمنتج", () => {
    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={mockProduct}
      />
    );

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    expect(structuredDataScript).toBeInTheDocument();
    
    const structuredData = JSON.parse(structuredDataScript!.textContent!);
    expect(structuredData["@type"]).toBe("Product");
    expect(structuredData.name).toBe(mockProduct.name);
    expect(structuredData.description).toBe(
      mockProduct.shortDescription || mockProduct.richDescription,
    );
    expect(structuredData.brand.name).toBe(mockProduct.brand);
    expect(structuredData.category).toBe(mockProduct.category);
  });

  it("يجب أن يتعامل مع المنتجات بدون تقييمات", () => {
    const productWithoutRating = {
      ...mockProduct,
      rating: undefined,
      reviewCount: undefined,
    };

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={productWithoutRating}
      />
    );

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    const structuredData = JSON.parse(structuredDataScript!.textContent!);
    
    expect(structuredData.aggregateRating).toBeUndefined();
  });

  it("يجب أن يتعامل مع المنتجات بدون أبعاد أو وزن", () => {
    const productWithoutDimensions = {
      ...mockProduct,
      weight: undefined,
      dimensions: undefined,
    };

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={productWithoutDimensions}
      />
    );

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    const structuredData = JSON.parse(structuredDataScript!.textContent!);
    
    expect(structuredData.weight).toBeUndefined();
    expect(structuredData.dimensions).toBeUndefined();
  });

  it("يجب أن يعرض JsonLd component مع بيانات المنتج", () => {
    const { getByTestId } = render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={mockProduct}
      />
    );

    expect(getByTestId("json-ld")).toBeInTheDocument();
    expect(getByTestId("json-ld")).toHaveAttribute("data-type", "Product");
    
    const jsonLdData = JSON.parse(getByTestId("json-ld").textContent!);
    expect(jsonLdData["@type"]).toBe("Product");
    expect(jsonLdData.name).toBe(mockProduct.name);
  });

  it("يجب أن يتعامل مع المنتجات المتوفرة وغير المتوفرة", () => {
    const outOfStockProduct = {
      ...mockProduct,
      availability: "OutOfStock" as const,
    };

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={outOfStockProduct}
      />
    );

    expect(document.querySelector('meta[property="og:product:availability"]')).toHaveAttribute("content", "outofstock");
  });

  it("يجب أن يتعامل مع المنتجات المستعملة", () => {
    const usedProduct = {
      ...mockProduct,
      condition: "Used" as const,
    };

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        product={usedProduct}
      />
    );

    expect(document.querySelector('meta[property="og:product:condition"]')).toHaveAttribute("content", "used");
  });

  it("يجب أن يحدث meta tags الموجودة بدلاً من إنشاء جديدة", () => {
    // إضافة meta tag موجود مسبقاً
    const existingMeta = document.createElement('meta');
    existingMeta.setAttribute('name', 'description');
    existingMeta.setAttribute('content', 'وصف قديم');
    document.head.appendChild(existingMeta);

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف جديد" 
        product={mockProduct}
      />
    );

    const metaTags = document.querySelectorAll('meta[name="description"]');
    expect(metaTags).toHaveLength(1);
    expect(metaTags[0]).toHaveAttribute("content", "وصف جديد");
  });

  it("يجب أن يحدث canonical link الموجود بدلاً من إنشاء جديد", () => {
    // إضافة canonical link موجود مسبقاً
    const existingCanonical = document.createElement('link');
    existingCanonical.setAttribute('rel', 'canonical');
    existingCanonical.setAttribute('href', 'https://old-url.com');
    document.head.appendChild(existingCanonical);

    render(
      <ProductSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        canonical="https://new-url.com"
        product={mockProduct}
      />
    );

    const canonicalLinks = document.querySelectorAll('link[rel="canonical"]');
    expect(canonicalLinks).toHaveLength(1);
    expect(canonicalLinks[0]).toHaveAttribute("href", "https://new-url.com");
  });
});
