"use client";
// src/components/landing/SEOHead.tsx
import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  noIndex?: boolean;
  structuredData?: object;
}

export default function SEOHead({
  title = "كليم — مساعد متاجر ذكي بالعربية | بوت ذكاء اصطناعي للتجارة الإلكترونية",
  description = "كليم هو مساعد ذكاء اصطناعي عربي متخصص في إدارة المتاجر الإلكترونية. يتكامل مع Salla وZid وShopify وWooCommerce. يرد على العملاء ويبيع عبر واتساب وتيليجرام والويب 24/7.",
  keywords = "كليم, مساعد متاجر, ذكاء اصطناعي, AI chatbot, تجارة إلكترونية, Salla, Zid, Shopify, WooCommerce, واتساب, تيليجرام, خدمة عملاء, مبيعات, متجر إلكتروني, عربي",
  canonical = "https://kaleem-ai.com/",
  ogImage = "https://kaleem-ai.com/og-image.jpg",
  ogType = "website",
  twitterCard = "summary_large_image",
  noIndex = false,
  structuredData
}: SEOHeadProps) {
  
  // دالة مساعدة لتحديث meta tags
  const updateMetaTag = (property: string, content: string) => {
    let metaTag = document.querySelector(`meta[property="${property}"]`) || 
                  document.querySelector(`meta[name="${property}"]`);
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (property.startsWith('og:')) {
        metaTag.setAttribute('property', property);
      } else if (property.startsWith('twitter:')) {
        metaTag.setAttribute('name', property);
      }
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', content);
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
  
  useEffect(() => {
    // تحديث lang و dir في HTML
    const html = document.documentElement;
    html.lang = "ar";
    html.dir = "rtl";
    
    // تحديث عنوان الصفحة
    document.title = title;
    
    // تحديث meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
    
    // تحديث meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);
    
    // تحديث canonical
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);
    
    // تحديث robots
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    
    // تحديث Open Graph
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', canonical);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:type', ogType);
    
    // تحديث Twitter Card
    updateMetaTag('twitter:card', twitterCard);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);
    
    // إضافة Structured Data إذا كان موجوداً
    if (structuredData) {
      addStructuredData(structuredData);
    }
    
  }, [title, description, keywords, canonical, ogImage, ogType, twitterCard, noIndex, structuredData]);

  return null; // هذا المكون لا يرجع JSX
}
