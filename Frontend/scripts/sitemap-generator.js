#!/usr/bin/env node

/**
 * مولد خريطة الموقع التلقائي لكليم
 * يقوم بمسح المشروع وإنشاء sitemap.xml تلقائياً
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// الحصول على __dirname في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعدادات الموقع
const SITE_CONFIG = {
  baseUrl: 'https://kaleem-ai.com',
  outputFile: 'public/sitemap.xml',
  excludePatterns: [
    /^\/admin\//,
    /^\/merchant\//,
    /^\/onboarding\//,
    /^\/auth\//,
    /^\/api\//,
    /^\/_next\//,
    /^\/static\//,
    /^\/scripts\//,
    /^\/test\//,
    /^\/tests\//,
    /^\/node_modules\//,
    /^\/src\//,
    /\.(js|css|map|txt|xml|json)$/,
    /\/\*\.(tsx?|jsx?|css|scss|less)$/
  ],
  priorityMap: {
    '/': 1.0,
    '/store': 0.9,
    '/store/products': 0.8,
    '/store/about': 0.7,
    '/store/contact': 0.7,
    '/auth/login': 0.6,
    '/auth/signup': 0.6,
    '/integrations/salla': 0.8,
    '/integrations/zid': 0.8,
    '/integrations/shopify': 0.8,
    '/integrations/woocommerce': 0.8,
    '/help': 0.6,
    '/faq': 0.6,
    '/support': 0.6,
    '/privacy': 0.4,
    '/terms': 0.4,
    '/cookies': 0.4,
    '/blog': 0.7,
    '/pricing': 0.8,
    '/features': 0.8,
    '/features/chatbot': 0.7,
    '/features/analytics': 0.7,
    '/features/integrations': 0.7
  },
  changeFreqMap: {
    '/': 'daily',
    '/store': 'weekly',
    '/store/products': 'weekly',
    '/blog': 'weekly',
    '/features': 'monthly',
    '/integrations': 'monthly',
    '/help': 'monthly',
    '/faq': 'monthly',
    '/support': 'monthly',
    '/pricing': 'monthly',
    '/store/about': 'monthly',
    '/store/contact': 'monthly',
    '/auth/login': 'monthly',
    '/auth/signup': 'monthly',
    '/privacy': 'yearly',
    '/terms': 'yearly',
    '/cookies': 'yearly'
  }
};

// دالة لفحص ما إذا كان المسار مستبعد
function isExcluded(path) {
  return SITE_CONFIG.excludePatterns.some(pattern => pattern.test(path));
}

// دالة لتحديد الأولوية
function getPriority(url) {
  return SITE_CONFIG.priorityMap[url] || 0.5;
}

// دالة لتحديد تكرار التغيير
function getChangeFreq(url) {
  return SITE_CONFIG.changeFreqMap[url] || 'monthly';
}

// دالة لتوليد XML
function generateXML(urls) {
  const now = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `         xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
  xml += `         http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n\n`;
  
  urls.forEach(url => {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_CONFIG.baseUrl}${url}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${getChangeFreq(url)}</changefreq>\n`;
    xml += `    <priority>${getPriority(url)}</priority>\n`;
    xml += `  </url>\n\n`;
  });
  
  xml += `</urlset>`;
  return xml;
}

// دالة لمسح المجلدات والملفات
function scanDirectory(dir, basePath = '') {
  const urls = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // تجاهل المجلدات المستبعدة
        if (!isExcluded('/' + relativePath.replace(/\\/g, '/'))) {
          urls.push(...scanDirectory(fullPath, relativePath));
        }
      } else if (stat.isFile()) {
        // إضافة الملفات الصالحة
        const url = '/' + relativePath.replace(/\\/g, '/').replace(/\.(tsx?|jsx?|css|scss|less)$/, '');
        if (!isExcluded(url) && url !== '/index') {
          urls.push(url);
        }
      }
    });
  } catch (error) {
    console.warn(`تحذير: لا يمكن قراءة المجلد ${dir}:`, error.message);
  }
  
  return urls;
}

// دالة رئيسية
async function generateSitemap() {
  console.log('🚀 بدء توليد خريطة الموقع لكليم...');
  
  try {
    // مسح المجلدات
    const urls = scanDirectory('src/pages');
    
    // إضافة الصفحات الثابتة
    const staticUrls = [
      '/',
      '/store',
      '/store/products',
      '/store/about',
      '/store/contact',
      '/auth/login',
      '/auth/signup',
      '/integrations/salla',
      '/integrations/zid',
      '/integrations/shopify',
      '/integrations/woocommerce',
      '/help',
      '/faq',
      '/support',
      '/privacy',
      '/terms',
      '/cookies',
      '/blog',
      '/pricing',
      '/features',
      '/features/chatbot',
      '/features/analytics',
      '/features/integrations'
    ];
    
    // دمج URLs وإزالة التكرار
    const allUrls = [...new Set([...staticUrls, ...urls])].sort();
    
    // توليد XML
    const xml = generateXML(allUrls);
    
    // كتابة الملف
    fs.writeFileSync(SITE_CONFIG.outputFile, xml, 'utf8');
    
    console.log(`✅ تم إنشاء خريطة الموقع بنجاح!`);
    console.log(`📁 الملف: ${SITE_CONFIG.outputFile}`);
    console.log(`🔗 عدد الروابط: ${allUrls.length}`);
    console.log(`🌐 الرابط الأساسي: ${SITE_CONFIG.baseUrl}`);
    
    // عرض بعض الإحصائيات
    console.log('\n📊 إحصائيات خريطة الموقع:');
    console.log(`   - الصفحات عالية الأولوية (1.0): ${allUrls.filter(url => getPriority(url) === 1.0).length}`);
    console.log(`   - الصفحات متوسطة الأولوية (0.8): ${allUrls.filter(url => getPriority(url) === 0.8).length}`);
    console.log(`   - الصفحات منخفضة الأولوية (0.6): ${allUrls.filter(url => getPriority(url) === 0.6).length}`);
    
  } catch (error) {
    console.error('❌ خطأ في توليد خريطة الموقع:', error.message);
    process.exit(1);
  }
}

// تشغيل المولد إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap();
}

export { generateSitemap, SITE_CONFIG };
