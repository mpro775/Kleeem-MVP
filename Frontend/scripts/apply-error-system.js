#!/usr/bin/env node

/**
 * سكريبت لتطبيق نظام معالجة الأخطاء تلقائياً في الملفات
 * الاستخدام: node scripts/apply-error-system.js
 */

import fs from 'fs';
import path from 'path';

// قائمة الملفات التي تحتاج تطبيق النظام
const filesToUpdate = [
  // صفحات التاجر
  'src/pages/merchant/PromptStudio.tsx',
  'src/pages/merchant/KnowledgePage.tsx',
  'src/pages/merchant/LeadsManagerPage.tsx',
  'src/pages/merchant/CategoriesPage.tsx',
  'src/pages/merchant/SupportCenterPage.tsx',
  'src/pages/merchant/SettingsAdvancedPage.tsx',
  'src/pages/merchant/ChatSettingsPage.tsx',
  'src/pages/merchant/MissingResponsesPage.tsx',
  
  // صفحات الإدارة
  'src/pages/admin/kleem/ConversationsPage.tsx',
  'src/pages/admin/kleem/ConversationView.tsx',
  'src/pages/admin/kleem/ChatSettingsPage.tsx',
  'src/pages/admin/kleem/KleemMissingResponsesPage.tsx',
  'src/pages/admin/kleem/KleemRatingsPage.tsx',
  
  // صفحات المتجر
  'src/pages/store/StorePage.tsx',
  'src/pages/store/ProductDetailsPage.tsx',
  'src/pages/store/OrderDetailsPage.tsx',
  'src/pages/store/AboutPage.tsx',
  
  // صفحات أخرى
  'src/pages/ChatPage.tsx',
  'src/pages/onboarding/OnboardingPage.tsx',
  'src/pages/onboarding/SourceSelectPage.tsx',
  'src/pages/onboarding/SyncPage.tsx',
  
  // مكونات المنتجات
  'src/features/mechant/products/ui/ProductsTable.tsx',
  'src/features/mechant/products/ui/AddProductDialog.tsx',
  'src/features/mechant/products/ui/EditProductDialog.tsx',
];

// قوالب التحديث
const templates = {
  import: "import { useErrorHandler } from '@/shared/errors';",
  hook: "const { handleError } = useErrorHandler();",
  errorHandling: `
    } catch (error) {
      handleError(error);
    }
  `,
  apiErrorHandling: `
      .catch(handleError)
  `,
};

// دالة لتحديث ملف واحد
function updateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  الملف غير موجود: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // إضافة استيراد useErrorHandler إذا لم يكن موجوداً
    if (!content.includes("useErrorHandler")) {
      const importIndex = content.lastIndexOf("import");
      if (importIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', importIndex);
        content = content.slice(0, nextLineIndex + 1) + 
                 templates.import + '\n' + 
                 content.slice(nextLineIndex + 1);
        updated = true;
      }
    }

    // إضافة hook useErrorHandler إذا لم يكن موجوداً
    if (!content.includes("useErrorHandler()")) {
      const functionMatch = content.match(/export default function (\w+)/);
      if (functionMatch) {
        const functionName = functionMatch[1];
        const functionStart = content.indexOf(`export default function ${functionName}`);
        const braceIndex = content.indexOf('{', functionStart);
        if (braceIndex !== -1) {
          const nextLineIndex = content.indexOf('\n', braceIndex);
          content = content.slice(0, nextLineIndex + 1) + 
                   '  ' + templates.hook + '\n' + 
                   content.slice(nextLineIndex + 1);
          updated = true;
        }
      }
    }

    // إضافة معالجة الأخطاء في catch blocks
    if (!content.includes("handleError(error)")) {
      content = content.replace(
        /} catch \(/g,
        templates.errorHandling + '  } catch ('
      );
      updated = true;
    }

    // إضافة معالجة الأخطاء في API calls
    if (!content.includes(".catch(handleError)")) {
      content = content.replace(
        /\.finally\(/g,
        templates.apiErrorHandling + '      .finally('
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ تم تحديث: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  لا يحتاج تحديث: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ خطأ في تحديث ${filePath}:`, error.message);
    return false;
  }
}

// دالة رئيسية
function main() {
  console.log('🚀 بدء تطبيق نظام معالجة الأخطاء...\n');
  
  let updatedCount = 0;
  let totalCount = filesToUpdate.length;

  filesToUpdate.forEach(filePath => {
    if (updateFile(filePath)) {
      updatedCount++;
    }
  });

  console.log(`\n📊 ملخص النتائج:`);
  console.log(`- إجمالي الملفات: ${totalCount}`);
  console.log(`- الملفات المحدثة: ${updatedCount}`);
  console.log(`- الملفات التي لم تحتج تحديث: ${totalCount - updatedCount}`);
  
  if (updatedCount > 0) {
    console.log('\n🎉 تم تطبيق النظام بنجاح!');
    console.log('💡 تذكر مراجعة الملفات المحدثة للتأكد من صحة التطبيق.');
  } else {
    console.log('\nℹ️  جميع الملفات محدثة بالفعل.');
  }
}

// تشغيل السكريبت
main();
