import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import PageSEO from "./PageSEO";

// Mock JsonLd component
vi.mock("./JsonLd", () => ({
  default: ({ type, data }: any) => (
    <div data-testid="json-ld" data-type={type}>
      {JSON.stringify(data)}
    </div>
  ),
}));

describe("PageSEO", () => {
  beforeEach(() => {
    // Clear document head before each test
    document.head.innerHTML = "";
    document.title = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يحدث عنوان الصفحة", () => {
    const title = "كليم - منصة الدردشة الذكية";
    render(<PageSEO title={title} description="وصف تجريبي" />);

    expect(document.title).toBe(title);
  });

  it("يجب أن يحدث meta description", () => {
    const description = "وصف تجريبي للصفحة";
    render(<PageSEO title="عنوان تجريبي" description={description} />);

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute("content", description);
  });

  it("يجب أن يحدث meta keywords عند توفرها", () => {
    const keywords = "دردشة، ذكاء اصطناعي، دعم العملاء";
    render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        keywords={keywords} 
      />
    );

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    expect(metaKeywords).toHaveAttribute("content", keywords);
  });

  it("يجب أن يحدث canonical URL عند توفرها", () => {
    const canonical = "https://kaleem.com/contact";
    render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        canonical={canonical} 
      />
    );

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    expect(canonicalLink).toHaveAttribute("href", canonical);
  });

  it("يجب أن يحدث robots meta tag", () => {
    render(<PageSEO title="عنوان تجريبي" description="وصف تجريبي" />);

    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).toHaveAttribute(
      "content", 
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    );
  });

  it("يجب أن يحدث robots meta tag إلى noindex عند noIndex=true", () => {
    render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        noIndex={true} 
      />
    );

    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).toHaveAttribute("content", "noindex, nofollow");
  });

  it("يجب أن يحدث Open Graph tags", () => {
    const title = "عنوان تجريبي";
    const description = "وصف تجريبي";
    const ogImage = "https://example.com/image.jpg";
    const ogType = "article";

    render(
      <PageSEO 
        title={title} 
        description={description} 
        ogImage={ogImage}
        ogType={ogType}
      />
    );

    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute("content", title);
    expect(document.querySelector('meta[property="og:description"]')).toHaveAttribute("content", description);
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute("content", ogType);
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute("content", ogImage);
  });

  it("يجب أن يحدث Twitter Card tags", () => {
    const title = "عنوان تجريبي";
    const description = "وصف تجريبي";
    const twitterCard = "summary";

    render(
      <PageSEO 
        title={title} 
        description={description} 
        twitterCard={twitterCard}
      />
    );

    expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute("content", twitterCard);
    expect(document.querySelector('meta[name="twitter:title"]')).toHaveAttribute("content", title);
    expect(document.querySelector('meta[name="twitter:description"]')).toHaveAttribute("content", description);
  });

  it("يجب أن يضيف بيانات المقال عند توفرها", () => {
    const articleData = {
      author: "أحمد محمد",
      publishedTime: "2024-01-15T10:00:00Z",
      modifiedTime: "2024-01-16T10:00:00Z",
      section: "التقنية",
      tags: ["ذكاء اصطناعي", "دردشة"],
    };

    render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        ogType="article"
        articleData={articleData}
      />
    );

    expect(document.querySelector('meta[property="og:article:author"]')).toHaveAttribute("content", articleData.author);
    expect(document.querySelector('meta[property="og:article:published_time"]')).toHaveAttribute("content", articleData.publishedTime);
    expect(document.querySelector('meta[property="og:article:modified_time"]')).toHaveAttribute("content", articleData.modifiedTime);
    expect(document.querySelector('meta[property="og:article:section"]')).toHaveAttribute("content", articleData.section);
  });

  it("يجب أن يضيف breadcrumbs عند توفرها", () => {
    const breadcrumbs = [
      { name: "الرئيسية", url: "https://kaleem.com" },
      { name: "الدعم", url: "https://kaleem.com/support" },
      { name: "اتصل بنا", url: "https://kaleem.com/contact" },
    ];

    render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        breadcrumbs={breadcrumbs}
      />
    );

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    expect(structuredDataScript).toBeInTheDocument();
    
    const structuredData = JSON.parse(structuredDataScript!.textContent!);
    expect(structuredData["@type"]).toBe("BreadcrumbList");
    expect(structuredData.itemListElement).toHaveLength(3);
  });

  it("يجب أن يضيف structured data عند توفرها", () => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "كليم",
      "url": "https://kaleem.com",
    };

    render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        structuredData={structuredData}
      />
    );

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    expect(structuredDataScript).toBeInTheDocument();
    
    const parsedData = JSON.parse(structuredDataScript!.textContent!);
    expect(parsedData["@type"]).toBe("Organization");
    expect(parsedData.name).toBe("كليم");
  });

  it("يجب أن يعرض JsonLd component عند توفر jsonLdType", () => {
    const { getByTestId } = render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        jsonLdType="Organization"
      />
    );

    expect(getByTestId("json-ld")).toBeInTheDocument();
    expect(getByTestId("json-ld")).toHaveAttribute("data-type", "Organization");
  });

  it("يجب أن يعرض JsonLd component عند توفر jsonLdData", () => {
    const jsonLdData = { name: "كليم", type: "Organization" };
    
    const { getByTestId } = render(
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        jsonLdData={jsonLdData}
      />
    );

    expect(getByTestId("json-ld")).toBeInTheDocument();
    expect(getByTestId("json-ld")).toHaveTextContent(JSON.stringify(jsonLdData));
  });

  it("يجب أن يستخدم القيم الافتراضية الصحيحة", () => {
    render(<PageSEO title="عنوان تجريبي" description="وصف تجريبي" />);

    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute("content", "https://kaleem-ai.com/og-image.jpg");
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute("content", "website");
    expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  });

  it("يجب أن يحدث meta tags الموجودة بدلاً من إنشاء جديدة", () => {
    // إضافة meta tag موجود مسبقاً
    const existingMeta = document.createElement('meta');
    existingMeta.setAttribute('name', 'description');
    existingMeta.setAttribute('content', 'وصف قديم');
    document.head.appendChild(existingMeta);

    render(<PageSEO title="عنوان تجريبي" description="وصف جديد" />);

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
      <PageSEO 
        title="عنوان تجريبي" 
        description="وصف تجريبي" 
        canonical="https://new-url.com"
      />
    );

    const canonicalLinks = document.querySelectorAll('link[rel="canonical"]');
    expect(canonicalLinks).toHaveLength(1);
    expect(canonicalLinks[0]).toHaveAttribute("href", "https://new-url.com");
  });
});
