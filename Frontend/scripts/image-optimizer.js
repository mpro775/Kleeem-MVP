#!/usr/bin/env node

/**
 * محسن الصور لكليم
 * يتحقق من أحجام الصور ويقدم توصيات للتحسين
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

// إعدادات الصور
const IMAGE_CONFIG = {
  maxSizes: {
    'hero': { width: 1200, height: 630, maxSize: 200 }, // KB
    'thumbnail': { width: 300, height: 300, maxSize: 50 },
    'icon': { width: 192, height: 192, maxSize: 20 },
    'favicon': { width: 32, height: 32, maxSize: 5 }
  },
  supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'],
  excludedDirs: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']
};

// دالة لتحويل البايت إلى KB
function bytesToKB(bytes) {
  return (bytes / 1024).toFixed(2);
}

// دالة لتحويل KB إلى MB
function kbToMB(kb) {
  return (kb / 1024).toFixed(2);
}

// دالة لتحديد نوع الصورة
function getImageType(filename, width, height) {
  if (filename.includes('hero') || filename.includes('banner')) {
    return 'hero';
  } else if (filename.includes('thumb') || filename.includes('icon')) {
    return 'thumbnail';
  } else if (filename.includes('favicon')) {
    return 'favicon';
  } else if (width <= 32 && height <= 32) {
    return 'favicon';
  } else if (width <= 300 && height <= 300) {
    return 'thumbnail';
  } else if (width >= 800) {
    return 'hero';
  } else {
    return 'general';
  }
}

// دالة لفحص صورة واحدة
function analyzeImage(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const sizeKB = bytesToKB(size);
    
    // محاولة قراءة معلومات الصورة من اسم الملف
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // استخراج الأبعاد من اسم الملف إذا كانت موجودة
    const dimensionMatch = filename.match(/(\d+)x(\d+)/);
    let width = 0, height = 0;
    
    if (dimensionMatch) {
      width = parseInt(dimensionMatch[1]);
      height = parseInt(dimensionMatch[2]);
    }
    
    const imageType = getImageType(filename, width, height);
    const config = IMAGE_CONFIG.maxSizes[imageType];
    
    let issues = [];
    let recommendations = [];
    let score = 100;
    
    // فحص الحجم
    if (config && sizeKB > config.maxSize) {
      const sizeMB = kbToMB(sizeKB);
      const maxSizeMB = kbToMB(config.maxSize);
      issues.push(`الحجم كبير جداً: ${sizeMB}MB (الحد الأقصى: ${maxSizeMB}MB)`);
      score -= 30;
    }
    
    // فحص التنسيق
    if (!IMAGE_CONFIG.supportedFormats.includes(ext)) {
      issues.push(`تنسيق غير مدعوم: ${ext}`);
      score -= 20;
    }
    
    // فحص التنسيق الأمثل
    if (ext === '.jpg' || ext === '.jpeg') {
      if (sizeKB > 100) {
        recommendations.push('فكر في تحويل الصورة إلى WebP لتقليل الحجم');
      }
    } else if (ext === '.png') {
      if (sizeKB > 200) {
        recommendations.push('فكر في تحويل الصورة إلى WebP أو ضغط PNG');
      }
    }
    
    // فحص الأبعاد
    if (width > 0 && height > 0) {
      if (imageType === 'hero' && (width < 800 || height < 400)) {
        issues.push(`الأبعاد صغيرة جداً للصورة الرئيسية: ${width}x${height}`);
        score -= 15;
      }
      
      if (imageType === 'thumbnail' && (width > 500 || height > 500)) {
        issues.push(`الأبعاد كبيرة جداً للصورة المصغرة: ${width}x${height}`);
        score -= 10;
      }
    }
    
    // فحص اسم الملف
    if (!filename.match(/[a-zA-Z0-9-_]/)) {
      issues.push('اسم الملف يحتوي على أحرف غير مسموحة');
      score -= 5;
    }
    
    // فحص المسار
    const relativePath = path.relative(process.cwd(), filePath);
    if (relativePath.includes(' ')) {
      issues.push('المسار يحتوي على مسافات');
      score -= 5;
    }
    
    return {
      file: filename,
      path: relativePath,
      size: size,
      sizeKB: sizeKB,
      width: width,
      height: height,
      type: imageType,
      format: ext,
      issues: issues,
      recommendations: recommendations,
      score: Math.max(0, score)
    };
    
  } catch (error) {
    return {
      file: path.basename(filePath),
      path: path.relative(process.cwd(), filePath),
      error: error.message,
      score: 0
    };
  }
}

// دالة لمسح المجلدات
function scanImages(dir, basePath = '') {
  const images = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!IMAGE_CONFIG.excludedDirs.includes(item)) {
          images.push(...scanImages(fullPath, relativePath));
        }
      } else {
        const ext = path.extname(item).toLowerCase();
        if (IMAGE_CONFIG.supportedFormats.includes(ext)) {
          images.push(fullPath);
        }
      }
    });
  } catch (error) {
    console.warn(`تحذير: لا يمكن قراءة المجلد ${dir}:`, error.message);
  }
  
  return images;
}

// دالة رئيسية
async function optimizeImages() {
  log('🖼️  بدء فحص وتحسين الصور لكليم...', 'cyan');
  
  try {
    // البحث عن الصور
    log('\n📁 البحث عن الصور...', 'blue');
    const imageFiles = scanImages('public');
    const srcImages = scanImages('src');
    const allImages = [...imageFiles, ...srcImages];
    
    log(`   📸 الصور في public/: ${imageFiles.length}`, 'blue');
    log(`   📸 الصور في src/: ${srcImages.length}`, 'blue');
    log(`   📸 إجمالي الصور: ${allImages.length}`, 'blue');

    if (allImages.length === 0) {
      log('\n⚠️  لم يتم العثور على صور للفحص', 'yellow');
      return;
    }

    // فحص الصور
    log('\n🔍 فحص الصور...', 'blue');
    const results = [];
    let totalSize = 0;
    let totalScore = 0;
    
    for (let i = 0; i < allImages.length; i++) {
      const imagePath = allImages[i];
      process.stdout.write(`\r   فحص الصورة ${i + 1}/${allImages.length}: ${path.basename(imagePath)}`);
      
      const result = analyzeImage(imagePath);
      results.push(result);
      
      if (!result.error) {
        totalSize += result.size;
        totalScore += result.score;
      }
    }

    console.log('\n'); // سطر جديد بعد progress bar

    // عرض النتائج
    log('\n📊 نتائج فحص الصور:', 'blue');
    
    const validResults = results.filter(r => !r.error);
    const averageScore = validResults.length > 0 ? Math.round(totalScore / validResults.length) : 0;
    const totalSizeMB = kbToMB(totalSize / 1024);
    
    log(`   📊 النتيجة الإجمالية: ${averageScore}%`, averageScore >= 90 ? 'green' : averageScore >= 70 ? 'yellow' : 'red');
    log(`   💾 الحجم الإجمالي: ${totalSizeMB}MB`, 'cyan');
    log(`   📸 عدد الصور: ${validResults.length}`, 'cyan');

    // تصنيف الصور حسب النتيجة
    const excellent = validResults.filter(r => r.score >= 90);
    const good = validResults.filter(r => r.score >= 70 && r.score < 90);
    const needsImprovement = validResults.filter(r => r.score < 70);

    log(`\n🏆 الصور الممتازة: ${excellent.length}`, 'green');
    log(`✅ الصور الجيدة: ${good.length}`, 'yellow');
    log(`⚠️  الصور التي تحتاج تحسين: ${needsImprovement.length}`, 'red');

    // عرض الصور التي تحتاج تحسين
    if (needsImprovement.length > 0) {
      log('\n⚠️  الصور التي تحتاج تحسين:', 'red');
      needsImprovement.forEach(result => {
        log(`\n📸 ${result.file} (${result.score}%)`, 'red');
        log(`   📁 المسار: ${result.path}`, 'blue');
        log(`   💾 الحجم: ${result.sizeKB}KB`, 'cyan');
        if (result.width && result.height) {
          log(`   📐 الأبعاد: ${result.width}x${result.height}`, 'cyan');
        }
        if (result.issues.length > 0) {
          result.issues.forEach(issue => log(`   ❌ ${issue}`, 'red'));
        }
        if (result.recommendations.length > 0) {
          result.recommendations.forEach(rec => log(`   💡 ${rec}`, 'yellow'));
        }
      });
    }

    // إحصائيات إضافية
    log('\n📈 إحصائيات إضافية:', 'blue');
    
    const formatStats = {};
    const typeStats = {};
    
    validResults.forEach(result => {
      formatStats[result.format] = (formatStats[result.format] || 0) + 1;
      typeStats[result.type] = (typeStats[result.type] || 0) + 1;
    });

    log('   📊 التنسيقات:', 'cyan');
    Object.entries(formatStats).forEach(([format, count]) => {
      log(`      ${format}: ${count} صورة`, 'blue');
    });

    log('   📊 أنواع الصور:', 'cyan');
    Object.entries(typeStats).forEach(([type, count]) => {
      log(`      ${type}: ${count} صورة`, 'blue');
    });

    // توصيات عامة
    log('\n💡 توصيات عامة:', 'magenta');
    
    if (needsImprovement.length > 0) {
      log('   - قم بضغط الصور الكبيرة', 'yellow');
      log('   - حول الصور إلى تنسيق WebP', 'yellow');
      log('   - تأكد من الأبعاد المناسبة لكل نوع صورة', 'yellow');
    }
    
    if (totalSizeMB > 10) {
      log('   - الحجم الإجمالي كبير، فكر في تحسين الصور', 'yellow');
    }
    
    if (averageScore >= 90) {
      log('   - الصور ممتازة! 🎉', 'green');
    } else if (averageScore >= 70) {
      log('   - الصور جيدة، يمكن تحسينها أكثر', 'yellow');
    } else {
      log('   - الصور تحتاج تحسين عاجل', 'red');
    }

    // نصائح تقنية
    log('\n🔧 نصائح تقنية:', 'cyan');
    log('   - استخدم WebP للصور الحديثة', 'blue');
    log('   - اضغط الصور قبل رفعها', 'blue');
    log('   - استخدم الأبعاد المناسبة لكل سياق', 'blue');
    log('   - أضف alt text لجميع الصور', 'blue');
    log('   - استخدم lazy loading للصور', 'blue');

  } catch (error) {
    log(`❌ خطأ في فحص الصور: ${error.message}`, 'red');
    process.exit(1);
  }
}

// تشغيل المحسن إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeImages();
}

export { optimizeImages, analyzeImage, IMAGE_CONFIG };
