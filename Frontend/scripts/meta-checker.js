#!/usr/bin/env node

/**
 * فاحص وسوم Meta لكليم
 * يتحقق من وجود وصحة وسوم SEO في الصفحات
 */

import fs from 'fs';
import path from 'path';

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

// وسوم Meta المطلوبة
const REQUIRED_META_TAGS = {
  'title': { required: true, maxLength: 60, description: 'عنوان الصفحة' },
  'description': { required: true, maxLength: 160, description: 'وصف الصفحة' },
  'keywords': { required: false, maxLength: 255, description: 'الكلمات المفتاحية' },
  'robots': { required: true, description: 'تعليمات محركات البحث' },
  'canonical': { required: true, description: 'الرابط الأساسي' },
  'og:title': { required: true, maxLength: 60, description: 'عنوان Open Graph' },
  'og:description': { required: true, maxLength: 160, description: 'وصف Open Graph' },
  'og:type': { required: true, description: 'نوع Open Graph' },
  'og:image': { required: true, description: 'صورة Open Graph' },
  'og:url': { required: true, description: 'رابط Open Graph' },
  'twitter:card': { required: true, description: 'نوع Twitter Card' },
  'twitter:title': { required: true, maxLength: 60, description: 'عنوان Twitter' },
  'twitter:description': { required: true, maxLength: 160, description: 'وصف Twitter' },
  'twitter:image': { required: true, description: 'صورة Twitter' }
};

// دالة لفحص ملف HTML واحد
function checkHTMLFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {
      file: path.basename(filePath),
      path: filePath,
      metaTags: {},
      issues: [],
      score: 0,
      totalRequired: 0,
      totalFound: 0
    };

    // فحص وسوم Meta
    Object.keys(REQUIRED_META_TAGS).forEach(tag => {
      const config = REQUIRED_META_TAGS[tag];
      results.totalRequired += config.required ? 1 : 0;
      
      let found = false;
      let value = '';
      let issue = '';

      if (tag.startsWith('og:') || tag.startsWith('twitter:')) {
        // فحص Open Graph و Twitter
        const regex = new RegExp(`<meta\\s+property=["']${tag}["']\\s+content=["']([^"']+)["']`, 'i');
        const match = content.match(regex);
        if (match) {
          found = true;
          value = match[1];
        }
      } else if (tag === 'title') {
        // فحص عنوان الصفحة
        const regex = /<title>([^<]+)<\/title>/i;
        const match = content.match(regex);
        if (match) {
          found = true;
          value = match[1];
        }
      } else if (tag === 'canonical') {
        // فحص الرابط الأساسي
        const regex = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i;
        const match = content.match(regex);
        if (match) {
          found = true;
          value = match[1];
        }
      } else {
        // فحص وسوم Meta العادية
        const regex = new RegExp(`<meta\\s+name=["']${tag}["']\\s+content=["']([^"']+)["']`, 'i');
        const match = content.match(regex);
        if (match) {
          found = true;
          value = match[1];
        }
      }

      // فحص الطول إذا كان مطلوباً
      if (found && config.maxLength && value.length > config.maxLength) {
        issue = `طويل جداً (${value.length}/${config.maxLength})`;
      }

      // فحص القيمة الفارغة
      if (found && value.trim() === '') {
        issue = 'قيمة فارغة';
        found = false;
      }

      results.metaTags[tag] = {
        found,
        value,
        issue,
        required: config.required,
        description: config.description
      };

      if (found && !issue) {
        results.totalFound++;
      }
    });

    // حساب النتيجة
    results.score = Math.round((results.totalFound / results.totalRequired) * 100);

    // تحديد المشاكل
    Object.keys(results.metaTags).forEach(tag => {
      const meta = results.metaTags[tag];
      if (meta.required && !meta.found) {
        results.issues.push(`❌ ${tag}: مفقود`);
      } else if (meta.required && meta.found && meta.issue) {
        results.issues.push(`⚠️  ${tag}: ${meta.issue}`);
      } else if (meta.found && meta.issue) {
        results.issues.push(`⚠️  ${tag}: ${meta.issue}`);
      }
    });

    return results;
  } catch (error) {
    return {
      file: path.basename(filePath),
      path: filePath,
      error: error.message,
      score: 0
    };
  }
}

// دالة لفحص مجلد
function scanDirectory(dir, basePath = '') {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // تجاهل المجلدات المستبعدة
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
          results.push(...scanDirectory(fullPath, relativePath));
        }
      } else if (item.endsWith('.html') || item.endsWith('.tsx') || item.endsWith('.jsx')) {
        results.push(fullPath);
      }
    });
  } catch (error) {
    console.warn(`تحذير: لا يمكن قراءة المجلد ${dir}:`, error.message);
  }
  
  return results;
}

// دالة رئيسية
async function checkMetaTags() {
  log('🔍 بدء فحص وسوم Meta لكليم...', 'cyan');
  
  try {
    // البحث عن الملفات
    log('\n📁 البحث عن الملفات...', 'blue');
    const files = scanDirectory('src');
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    const reactFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
    
    log(`   📄 ملفات HTML: ${htmlFiles.length}`, 'blue');
    log(`   ⚛️  ملفات React: ${reactFiles.length}`, 'blue');

    // فحص الملفات
    log('\n🔍 فحص وسوم Meta...', 'blue');
    const results = [];
    
    // فحص ملف index.html
    if (fs.existsSync('index.html')) {
      results.push(checkHTMLFile('index.html'));
    }

    // فحص ملفات HTML الأخرى
    htmlFiles.forEach(file => {
      if (file !== 'index.html') {
        results.push(checkHTMLFile(file));
      }
    });

    // عرض النتائج
    log('\n📊 نتائج الفحص:', 'blue');
    
    let totalScore = 0;
    let totalFiles = 0;
    
    results.forEach(result => {
      if (result.error) {
        log(`\n❌ ${result.file}: ${result.error}`, 'red');
        return;
      }

      totalScore += result.score;
      totalFiles++;

      // عرض النتيجة
      const scoreColor = result.score >= 90 ? 'green' : result.score >= 70 ? 'yellow' : 'red';
      const scoreIcon = result.score >= 90 ? '✅' : result.score >= 70 ? '⚠️' : '❌';
      
      log(`\n${scoreIcon} ${result.file}: ${result.score}%`, scoreColor);
      
      // عرض المشاكل
      if (result.issues.length > 0) {
        result.issues.forEach(issue => log(`   ${issue}`, 'red'));
      }
      
      // عرض الإحصائيات
      log(`   📊 ${result.totalFound}/${result.totalRequired} وسوم مطلوبة`, 'cyan');
    });

    // النتيجة الإجمالية
    if (totalFiles > 0) {
      const averageScore = Math.round(totalScore / totalFiles);
      log(`\n🎯 النتيجة الإجمالية: ${averageScore}%`, averageScore >= 90 ? 'green' : averageScore >= 70 ? 'yellow' : 'red');
    }

    // توصيات
    log('\n💡 توصيات:', 'magenta');
    
    if (totalFiles === 0) {
      log('   - لم يتم العثور على ملفات HTML للفحص', 'yellow');
    } else if (averageScore >= 90) {
      log('   - وسوم Meta ممتازة! 🎉', 'green');
    } else if (averageScore >= 70) {
      log('   - وسوم Meta جيدة، يمكن تحسينها', 'yellow');
    } else {
      log('   - وسوم Meta تحتاج تحسين عاجل', 'red');
    }

    // نصائح عامة
    log('\n📝 نصائح لتحسين SEO:', 'cyan');
    log('   - تأكد من وجود عنوان فريد لكل صفحة', 'blue');
    log('   - اكتب وصفاً جذاباً ومفيداً (150-160 حرف)', 'blue');
    log('   - استخدم كلمات مفتاحية مناسبة', 'blue');
    log('   - أضف صور Open Graph جذابة', 'blue');
    log('   - تأكد من صحة الروابط الأساسية', 'blue');

  } catch (error) {
    log(`❌ خطأ في فحص وسوم Meta: ${error.message}`, 'red');
    process.exit(1);
  }
}

// تشغيل الفاحص إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  checkMetaTags();
}

export { checkMetaTags, checkHTMLFile, REQUIRED_META_TAGS };
