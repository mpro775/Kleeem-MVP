// src/components/landing/seo/PageSEO.tsx
import { useEffect } from "react";
import JsonLd from "./JsonLd";

interface PageSEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product' | 'service';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  noIndex?: boolean;
  structuredData?: object;
  jsonLdType?: 'SoftwareApplication' | 'Organization' | 'WebSite' | 'Product' | 'Service';
  jsonLdData?: object;
  breadcrumbs?: Array<{ name: string; url: string }>;
  articleData?: {
    author: string;
    publishedTime: string;
    modifiedTime?: string;
    section: string;
    tags: string[];
  };
}

export default function PageSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = "https://kaleem-ai.com/og-image.jpg",
  ogType = "website",
  twitterCard = "summary_large_image",
  noIndex = false,
  structuredData,
  jsonLdType = "WebSite",
  jsonLdData,
  breadcrumbs,
  articleData
}: PageSEOProps) {
  
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
    
    // تحديث Open Graph
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', ogType);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:alt', title);
    
    // تحديث Twitter Card
    updateMetaTag('twitter:card', twitterCard);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);
    
    // إضافة بيانات المقال إذا كانت موجودة
    if (articleData && ogType === 'article') {
      updateMetaTag('og:article:author', articleData.author);
      updateMetaTag('og:article:published_time', articleData.publishedTime);
      if (articleData.modifiedTime) {
        updateMetaTag('og:article:modified_time', articleData.modifiedTime);
      }
      updateMetaTag('og:article:section', articleData.section);
      articleData.tags.forEach(tag => {
        updateMetaTag('og:article:tag', tag);
      });
    }
    
    // إضافة Breadcrumbs إذا كانت موجودة
    if (breadcrumbs && breadcrumbs.length > 0) {
      addBreadcrumbs(breadcrumbs);
    }
    
    // إضافة Structured Data إذا كان موجوداً
    if (structuredData) {
      addStructuredData(structuredData);
    }
    
  }, [title, description, keywords, canonical, ogImage, ogType, twitterCard, noIndex, structuredData, breadcrumbs, articleData]);

  // دالة مساعدة لتحديث meta tags
  const updateMetaTag = (name: string, content: string) => {
    let metaTag = document.querySelector(`meta[name="${name}"]`) || 
                  document.querySelector(`meta[property="${name}"]`);
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (name.startsWith('og:')) {
        metaTag.setAttribute('property', name);
      } else {
        metaTag.setAttribute('name', name);
      }
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', content);
  };

  // دالة مساعدة لتحديث canonical
  const updateCanonical = (url: string) => {
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);
  };

  // دالة مساعدة لإضافة Breadcrumbs
  const addBreadcrumbs = (breadcrumbs: Array<{ name: string; url: string }>) => {
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
  };

  // دالة مساعدة لإضافة Structured Data
  const addStructuredData = (data: object) => {
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
  };

  return (
    <>
      {/* إضافة JsonLd إذا كان مطلوباً */}
      {(jsonLdType || jsonLdData) && (
        <JsonLd 
          type={jsonLdType || undefined} 
          data={jsonLdData} 
        />
      )}
    </>
  );
}
