// src/components/landing/JsonLd.tsx
interface JsonLdProps {
  type?: 'SoftwareApplication' | 'Organization' | 'WebSite' | 'Product' | 'Service' | 'Article';
  data?: object;
}

export default function JsonLd({ 
  type = 'SoftwareApplication', 
  data 
}: JsonLdProps) {
  
  // البيانات الافتراضية للتطبيق
  const defaultData = {
    "@context": "https://schema.org",
    "@type": type,
    name: "كليم",
    alternateName: "Kleem",
    description: "مساعد متاجر ذكي بالعربية يتكامل مع منصات التجارة الإلكترونية",
    url: "https://kaleem-ai.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: ["ar", "en"],
    author: {
      "@type": "Organization",
      name: "كليم",
      url: "https://kaleem-ai.com",
      logo: "https://kaleem-ai.com/logo.png",
      sameAs: [
        "https://twitter.com/kleem_ai",
        "https://linkedin.com/company/kleem",
        "https://facebook.com/kleem.ai"
      ]
    },
    offers: {
      "@type": "Offer",
      price: "19",
      priceCurrency: "SAR",
      availability: "https://schema.org/InStock",
      validFrom: "2024-01-01",
      validThrough: "2025-12-31"
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1250",
      bestRating: "5",
      worstRating: "1"
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5"
        },
        author: {
          "@type": "Person",
          name: "أحمد محمد"
        },
        reviewBody: "أفضل مساعد ذكي للمتاجر الإلكترونية. يتكامل بسهولة مع Salla وZid."
      }
    ],
    featureList: [
      "بوت ذكاء اصطناعي عربي",
      "تكامل مع Salla وZid وShopify",
      "رد تلقائي على العملاء",
      "إدارة المبيعات عبر واتساب",
      "تحليلات متقدمة",
      "دعم 24/7"
    ],
    screenshot: [
      "https://kaleem-ai.com/screenshot-1.jpg",
      "https://kaleem-ai.com/screenshot-2.jpg"
    ],
    softwareVersion: "2.0.0",
    releaseNotes: "https://kaleem-ai.com/release-notes",
    downloadUrl: "https://kaleem-ai.com/signup",
    installUrl: "https://kaleem-ai.com/signup",
    softwareHelp: "https://kaleem-ai.com/help",
    softwareRequirements: "متصفح حديث يدعم JavaScript",
    permissions: "الوصول للمتجر الإلكتروني عبر API",
    maintainer: {
      "@type": "Organization",
      name: "كليم",
      url: "https://kaleem-ai.com"
    },
    funder: {
      "@type": "Organization",
      name: "كليم",
      url: "https://kaleem-ai.com"
    },
    creator: {
      "@type": "Organization",
      name: "كليم",
      url: "https://kaleem-ai.com"
    },
    publisher: {
      "@type": "Organization",
      name: "كليم",
      url: "https://kaleem-ai.com"
    },
    provider: {
      "@type": "Organization",
      name: "كليم",
      url: "https://kaleem-ai.com"
    },
    serviceType: "خدمة ذكاء اصطناعي للمتاجر الإلكترونية",
    areaServed: {
      "@type": "Country",
      name: "المملكة العربية السعودية"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "باقات كليم",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "الباقة الأساسية",
            description: "باقة أساسية للمتاجر الصغيرة"
          },
          price: "19",
          priceCurrency: "SAR"
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "الباقة المتقدمة",
            description: "باقة متقدمة للمتاجر المتوسطة"
          },
          price: "49",
          priceCurrency: "SAR"
        }
      ]
    }
  };

  // دمج البيانات المخصصة مع البيانات الافتراضية
  const finalData = data ? { ...defaultData, ...data } : defaultData;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(finalData, null, 2) }}
    />
  );
}
  