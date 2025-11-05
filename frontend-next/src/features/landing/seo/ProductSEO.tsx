// src/components/landing/seo/ProductSEO.tsx
import { useEffect, useCallback } from "react";
import JsonLd from "./JsonLd";

interface ProductSEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  product: {
    name: string;
    description: string;
    price: number;
    currency: string;
    availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
    brand: string;
    category: string;
    images: string[];
    rating?: number;
    reviewCount?: number;
    sku?: string;
    mpn?: string;
    gtin?: string;
    condition?: 'New' | 'Used' | 'Refurbished';
    color?: string;
    size?: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  };
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export default function ProductSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  noIndex = false,
  product,
  breadcrumbs
}: ProductSEOProps) {
  
  // دالة مساعدة لتحديث meta tags
  const updateMetaTag = useCallback((name: string, content: string) => {
    let metaTag = document.querySelector(`meta[name="${name}"]`) || 
                  document.querySelector(`meta[property="${name}"]`);
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (name.startsWith('og:') || name.startsWith('twitter:')) {
        metaTag.setAttribute('property', name);
      } else {
        metaTag.setAttribute('name', name);
      }
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', content);
  }, []);

  // دالة مساعدة لتحديث canonical
  const updateCanonical = useCallback((url: string) => {
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);
  }, []);

  // دالة مساعدة لإضافة Structured Data
  const addStructuredData = useCallback((data: object) => {
    // إزالة Structured Data القديم
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // إضافة Structured Data الجديد
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }, []);

  // دالة مساعدة لإضافة Breadcrumbs
  const addBreadcrumbs = useCallback((breadcrumbs: Array<{ name: string; url: string }>) => {
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };
    
    addStructuredData(breadcrumbData);
  }, [addStructuredData]);

  // دالة مساعدة لإضافة Structured Data للمنتج
  const addProductStructuredData = useCallback(() => {
    const productData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.images,
      "brand": {
        "@type": "Brand",
        "name": product.brand
      },
      "category": product.category,
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": product.currency,
        "availability": `https://schema.org/${product.availability}`,
        "condition": `https://schema.org/${product.condition || 'New'}`,
        "url": canonical || (typeof window !== 'undefined' ? window.location.href : '')
      },
      "aggregateRating": product.rating && product.reviewCount ? {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviewCount,
        "bestRating": "5",
        "worstRating": "1"
      } : undefined,
      "sku": product.sku,
      "mpn": product.mpn,
      "gtin": product.gtin,
      "color": product.color,
      "size": product.size,
      "weight": product.weight ? {
        "@type": "QuantitativeValue",
        "value": product.weight,
        "unitCode": "KGM"
      } : undefined,
      "dimensions": product.dimensions ? {
        "@type": "QuantitativeValue",
        "length": product.dimensions.length,
        "width": product.dimensions.width,
        "height": product.dimensions.height,
        "unitCode": "CMT"
      } : undefined
    };
    
    // إزالة القيم undefined
    const cleanProductData = JSON.parse(JSON.stringify(productData));
    addStructuredData(cleanProductData);
  }, [product, canonical, addStructuredData]);

  useEffect(() => {
    // تحديث عنوان الصفحة
    document.title = title;
    
    // تحديث meta description
    updateMetaTag('description', description);
    
    // تحديث meta keywords
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }
    
    // تحديث canonical
    if (canonical) {
      updateCanonical(canonical);
    }
    
    // تحديث robots
    updateMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    
    // تحديث Open Graph للمنتج
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', 'product');
    updateMetaTag('og:image', ogImage || product.images[0]);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:alt', product.name);
    
    // إضافة بيانات المنتج لـ Open Graph
    updateMetaTag('og:product:price:amount', product.price.toString());
    updateMetaTag('og:product:price:currency', product.currency);
    updateMetaTag('og:product:availability', product.availability.toLowerCase());
    updateMetaTag('og:product:condition', product.condition?.toLowerCase() || 'new');
    
    // تحديث Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage || product.images[0]);
    
    // إضافة Breadcrumbs إذا كانت موجودة
    if (breadcrumbs && breadcrumbs.length > 0) {
      addBreadcrumbs(breadcrumbs);
    }
    
    // إضافة Structured Data للمنتج
    addProductStructuredData();
    
  }, [title, description, keywords, canonical, ogImage, noIndex, product, breadcrumbs, updateMetaTag, updateCanonical, addBreadcrumbs, addProductStructuredData]);

  return (
    <>
      {/* إضافة JsonLd للمنتج */}
      <JsonLd 
        type="Product" 
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description,
          "image": product.images,
          "brand": product.brand,
          "category": product.category,
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": product.currency,
            "availability": `https://schema.org/${product.availability}`
          }
        }} 
      />
    </>
  );
}
