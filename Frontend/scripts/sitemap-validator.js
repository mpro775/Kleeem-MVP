#!/usr/bin/env node

/**
 * مدقق خريطة الموقع لكليم
 * يتحقق من صحة sitemap.xml ويقوم بفحص الروابط
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// إعدادات
const SITEMAP_PATH = 'public/sitemap.xml';
const BASE_URL = 'https://kaleem-ai.com';
const TIMEOUT = 10000; // 10 ثواني

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// دالة للطباعة الملونة
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// دالة لفحص رابط واحد
function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.get(url, { timeout: TIMEOUT }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        valid: res.statusCode >= 200 && res.statusCode < 400
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        error: error.message,
        valid: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        error: 'Timeout',
        valid: false
      });
    });
  });
}

// دالة لتحليل XML
function parseXML(xmlContent) {
  const urls = [];
  const urlRegex = /<loc>(.*?)<\/loc>/g;
  let match;

  while ((match = urlRegex.exec(xmlContent)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

// دالة للتحقق من صحة XML
function validateXMLStructure(xmlContent) {
  const errors = [];
  
  // فحص XML declaration
  if (!xmlContent.includes('<?xml version="1.0"')) {
    errors.push('XML declaration missing or invalid');
  }
  
  // فحص namespace
  if (!xmlContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    errors.push('Sitemap namespace missing or invalid');
  }
  
  // فحص وجود urls
  if (!xmlContent.includes('<urlset>') || !xmlContent.includes('</urlset>')) {
    errors.push('urlset tags missing or invalid');
  }
  
  // فحص عدد الروابط
  const urlCount = (xmlContent.match(/<url>/g) || []).length;
  if (urlCount === 0) {
    errors.push('No URLs found in sitemap');
  }
  
  return { valid: errors.length === 0, errors, urlCount };
}

// دالة رئيسية للتحقق
async function validateSitemap() {
  log('🔍 بدء التحقق من خريطة الموقع لكليم...', 'cyan');
  
  try {
    // فحص وجود الملف
    if (!fs.existsSync(SITEMAP_PATH)) {
      log(`❌ ملف خريطة الموقع غير موجود: ${SITEMAP_PATH}`, 'red');
      log('💡 قم بتشغيل: npm run seo:generate-sitemap', 'yellow');
      return;
    }

    // قراءة الملف
    const xmlContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
    log(`✅ تم قراءة ملف خريطة الموقع: ${SITEMAP_PATH}`, 'green');

    // التحقق من بنية XML
    log('\n📋 التحقق من بنية XML...', 'blue');
    const xmlValidation = validateXMLStructure(xmlContent);
    
    if (xmlValidation.valid) {
      log(`✅ بنية XML صحيحة - عدد الروابط: ${xmlValidation.urlCount}`, 'green');
    } else {
      log('❌ أخطاء في بنية XML:', 'red');
      xmlValidation.errors.forEach(error => log(`   - ${error}`, 'red'));
      return;
    }

    // استخراج الروابط
    const urls = parseXML(xmlContent);
    log(`\n🔗 تم العثور على ${urls.length} رابط`, 'blue');

    // فحص الروابط
    log('\n🌐 فحص الروابط...', 'blue');
    const results = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      process.stdout.write(`\r   فحص الرابط ${i + 1}/${urls.length}: ${url}`);
      
      const result = await checkUrl(url);
      results.push(result);
      
      if (result.valid) {
        validCount++;
      } else {
        invalidCount++;
      }
      
      // تأخير صغير لتجنب الضغط على الخادم
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n'); // سطر جديد بعد progress bar

    // عرض النتائج
    log('\n📊 نتائج الفحص:', 'blue');
    log(`   ✅ روابط صحيحة: ${validCount}`, 'green');
    log(`   ❌ روابط معطلة: ${invalidCount}`, 'red');
    log(`   📈 نسبة النجاح: ${((validCount / urls.length) * 100).toFixed(1)}%`, 'cyan');

    // عرض الروابط المعطلة
    if (invalidCount > 0) {
      log('\n❌ الروابط المعطلة:', 'red');
      results
        .filter(r => !r.valid)
        .forEach(result => {
          if (result.error) {
            log(`   - ${result.url}: ${result.error}`, 'red');
          } else {
            log(`   - ${result.url}: ${result.status} ${result.statusText}`, 'red');
          }
        });
    }

    // عرض الروابط البطيئة
    const slowUrls = results.filter(r => r.valid && r.headers && r.headers['content-length']);
    if (slowUrls.length > 0) {
      log('\n🐌 الروابط البطيئة (أكبر من 1MB):', 'yellow');
      slowUrls
        .filter(r => parseInt(r.headers['content-length']) > 1000000)
        .forEach(result => {
          const size = (parseInt(result.headers['content-length']) / 1000000).toFixed(2);
          log(`   - ${result.url}: ${size}MB`, 'yellow');
        });
    }

    // توصيات
    log('\n💡 توصيات:', 'magenta');
    if (invalidCount > 0) {
      log('   - قم بإصلاح الروابط المعطلة', 'yellow');
    }
    if (slowUrls.length > 0) {
      log('   - قم بتحسين حجم الصفحات البطيئة', 'yellow');
    }
    if (validCount === urls.length) {
      log('   - خريطة الموقع ممتازة! 🎉', 'green');
    }

  } catch (error) {
    log(`❌ خطأ في التحقق من خريطة الموقع: ${error.message}`, 'red');
    process.exit(1);
  }
}

// تشغيل المدقق إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSitemap();
}

export { validateSitemap, checkUrl, validateXMLStructure };
