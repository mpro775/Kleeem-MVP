import { test, expect } from '@playwright/test';

// 🎭 اختبارات E2E للتنقل - Kaleem Frontend

test.describe('🧭 التنقل في التطبيق', () => {
  test.beforeEach(async ({ page }) => {
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('🏠 عرض الصفحة الرئيسية', async ({ page }) => {
    // التحقق من عنوان الصفحة
    await expect(page).toHaveTitle(/كليم|Kaleem|الرئيسية|Home/);
    
    // التحقق من وجود المحتوى الرئيسي
    const mainContent = page.locator('main, [role="main"], .main-content, #main');
    await expect(mainContent.first()).toBeVisible();
    
    // التحقق من وجود القائمة الرئيسية
    const mainMenu = page.locator('nav, [role="navigation"], .main-menu, .navbar');
    await expect(mainMenu.first()).toBeVisible();
  });

  test('🔗 التنقل بين الصفحات الرئيسية', async ({ page }) => {
    // البحث عن روابط التنقل الرئيسية
    const navLinks = page.locator('nav a, .main-menu a, .navbar a');
    
    // التحقق من وجود روابط التنقل
    await expect(navLinks.first()).toBeVisible();
    
    // النقر على أول رابط تنقل
    const firstLink = navLinks.first();
    const linkText = await firstLink.textContent();
    const linkHref = await firstLink.getAttribute('href');
    
    if (linkHref && !linkHref.startsWith('#')) {
      await firstLink.click();
      
      // انتظار تحميل الصفحة الجديدة
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).not.toBe('http://localhost:3000/');
      
      // العودة للصفحة الرئيسية
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }
  });

  test('📱 استجابة القائمة للأجهزة المحمولة', async ({ page }) => {
    // تغيير حجم النافذة إلى حجم الهاتف
    await page.setViewportSize({ width: 375, height: 667 });
    
    // البحث عن زر القائمة المحمولة
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button[data-testid="mobile-menu"], .mobile-menu-toggle, .hamburger');
    
    if (await mobileMenuButton.count() > 0) {
      // النقر على زر القائمة
      await mobileMenuButton.click();
      
      // انتظار ظهور القائمة
      await page.waitForTimeout(500);
      
      // التحقق من ظهور القائمة
      const mobileMenu = page.locator('.mobile-menu, .sidebar, [data-testid="mobile-menu"]');
      await expect(mobileMenu.first()).toBeVisible();
      
      // النقر مرة أخرى لإغلاق القائمة
      await mobileMenuButton.click();
      
      // انتظار إغلاق القائمة
      await page.waitForTimeout(500);
      
      // التحقق من إغلاق القائمة
      await expect(mobileMenu.first()).not.toBeVisible();
    }
  });

  test('🔍 البحث في الموقع', async ({ page }) => {
    // البحث عن حقل البحث
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"], input[aria-label*="بحث"], .search-input');
    
    if (await searchInput.count() > 0) {
      // كتابة نص في حقل البحث
      await searchInput.fill('كليم');
      
      // النقر على زر البحث
      const searchButton = page.locator('button[type="submit"], button[aria-label*="بحث"], .search-button');
      
      if (await searchButton.count() > 0) {
        await searchButton.click();
        
        // انتظار نتائج البحث
        await page.waitForTimeout(2000);
        
        // التحقق من تغيير URL أو ظهور نتائج البحث
        const searchResults = page.locator('.search-results, .results, [data-testid="search-results"]');
        if (await searchResults.count() > 0) {
          await expect(searchResults.first()).toBeVisible();
        }
      }
    }
  });

  test('🔗 الروابط الخارجية', async ({ page }) => {
    // البحث عن الروابط الخارجية
    const externalLinks = page.locator('a[href^="http"], a[target="_blank"]');
    
    if (await externalLinks.count() > 0) {
      // التحقق من وجود روابط خارجية
      await expect(externalLinks.first()).toBeVisible();
      
      // التحقق من أن الروابط الخارجية تفتح في نافذة جديدة
      const firstExternalLink = externalLinks.first();
      const target = await firstExternalLink.getAttribute('target');
      
      if (target === '_blank') {
        // إنشاء promise لانتظار فتح نافذة جديدة
        const pagePromise = page.context().waitForEvent('page');
        
        // النقر على الرابط
        await firstExternalLink.click();
        
        // انتظار فتح النافذة الجديدة
        const newPage = await pagePromise;
        
        // التحقق من فتح النافذة الجديدة
        expect(newPage).toBeTruthy();
        
        // إغلاق النافذة الجديدة
        await newPage.close();
      }
    }
  });

  test('⬆️ العودة للأعلى', async ({ page }) => {
    // التمرير لأسفل الصفحة
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // انتظار التمرير
    await page.waitForTimeout(1000);
    
    // البحث عن زر العودة للأعلى
    const backToTopButton = page.locator('button[aria-label*="أعلى"], button[data-testid="back-to-top"], .back-to-top, .scroll-top');
    
    if (await backToTopButton.count() > 0) {
      // التحقق من ظهور الزر
      await expect(backToTopButton.first()).toBeVisible();
      
      // النقر على الزر
      await backToTopButton.first().click();
      
      // انتظار العودة للأعلى
      await page.waitForTimeout(1000);
      
      // التحقق من العودة للأعلى
      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeLessThan(100);
    }
  });

  test('🍞 Breadcrumbs', async ({ page }) => {
    // البحث عن breadcrumbs
    const breadcrumbs = page.locator('.breadcrumbs, .breadcrumb, [aria-label*="breadcrumb"], nav[aria-label*="breadcrumb"]');
    
    if (await breadcrumbs.count() > 0) {
      // التحقق من وجود breadcrumbs
      await expect(breadcrumbs.first()).toBeVisible();
      
      // النقر على أول breadcrumb
      const firstBreadcrumb = breadcrumbs.locator('a').first();
      const breadcrumbText = await firstBreadcrumb.textContent();
      
      await firstBreadcrumb.click();
      
      // انتظار تحميل الصفحة
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).not.toBe('http://localhost:3000/');
    }
  });

  test('🔗 الروابط السريعة', async ({ page }) => {
    // البحث عن الروابط السريعة
    const quickLinks = page.locator('.quick-links, .shortcuts, [data-testid="quick-links"]');
    
    if (await quickLinks.count() > 0) {
      // التحقق من وجود الروابط السريعة
      await expect(quickLinks.first()).toBeVisible();
      
      // النقر على أول رابط سريع
      const firstQuickLink = quickLinks.locator('a').first();
      await firstQuickLink.click();
      
      // انتظار تحميل الصفحة
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).not.toBe('http://localhost:3000/');
    }
  });

  test('📱 اختبار التصميم المتجاوب', async ({ page }) => {
    // اختبار أحجام شاشات مختلفة
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Small' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 320, height: 568, name: 'Mobile Small' }
    ];
    
    for (const viewport of viewports) {
      // تغيير حجم النافذة
      await page.setViewportSize(viewport);
      
      // انتظار إعادة تخطيط الصفحة
      await page.waitForTimeout(500);
      
      // التحقق من أن المحتوى الرئيسي يظهر
      const mainContent = page.locator('main, [role="main"], .main-content, #main');
      await expect(mainContent.first()).toBeVisible();
      
      // التحقق من أن القائمة تظهر
      const mainMenu = page.locator('nav, [role="navigation"], .main-menu, .navbar');
      await expect(mainMenu.first()).toBeVisible();
    }
  });

  test('🎨 اختبار التصميم RTL', async ({ page }) => {
    // التحقق من اتجاه النص RTL
    const body = page.locator('body, html');
    await expect(body).toHaveAttribute('dir', 'rtl');
    
    // التحقق من لغة الصفحة
    await expect(body).toHaveAttribute('lang', 'ar');
    
    // التحقق من أن العناصر تظهر من اليمين لليسار
    const navItems = page.locator('nav li, .main-menu li, .navbar li');
    
    if (await navItems.count() > 1) {
      // التحقق من أن العناصر مرتبة من اليمين لليسار
      const firstItem = navItems.first();
      const lastItem = navItems.last();
      
      const firstRect = await firstItem.boundingBox();
      const lastRect = await lastItem.boundingBox();
      
      if (firstRect && lastRect) {
        // في التصميم RTL، العنصر الأول يجب أن يكون على اليمين
        expect(firstRect.x).toBeGreaterThan(lastRect.x);
      }
    }
  });

  test('♿ اختبار إمكانية الوصول', async ({ page }) => {
    // التحقق من وجود عنوان للصفحة
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // التحقق من وجود headings
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    if (await headings.count() > 0) {
      await expect(headings.first()).toBeVisible();
    }
    
    // التحقق من وجود alt text للصور
    const images = page.locator('img');
    for (let i = 0; i < await images.count(); i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // التحقق من وجود labels للحقول
    const inputs = page.locator('input, textarea, select');
    for (let i = 0; i < await inputs.count(); i++) {
      const input = inputs.nth(i);
      const label = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      
      if (id) {
        const labelElement = page.locator(`label[for="${id}"]`);
        if (await labelElement.count() > 0) {
          await expect(labelElement.first()).toBeVisible();
        }
      }
      
      if (!label && !id) {
        // التحقق من وجود placeholder أو aria-label
        const placeholder = await input.getAttribute('placeholder');
        const ariaLabel = await input.getAttribute('aria-label');
        expect(placeholder || ariaLabel).toBeTruthy();
      }
    }
  });

  test('⏱️ اختبار الأداء', async ({ page }) => {
    // قياس وقت تحميل الصفحة
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // التحقق من أن وقت التحميل أقل من 5 ثوانٍ
    expect(loadTime).toBeLessThan(5000);
    
    // قياس وقت التنقل
    const navStartTime = Date.now();
    
    // البحث عن رابط تنقل
    const navLink = page.locator('nav a, .main-menu a, .navbar a').first();
    
    if (await navLink.count() > 0) {
      await navLink.click();
      await page.waitForLoadState('networkidle');
      
      const navTime = Date.now() - navStartTime;
      
      // التحقق من أن وقت التنقل أقل من 3 ثوانٍ
      expect(navTime).toBeLessThan(3000);
    }
  });

  test('🔒 اختبار الروابط المحمية', async ({ page }) => {
    // محاولة الوصول لصفحة محمية
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // التحقق من إعادة التوجيه لصفحة تسجيل الدخول
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login|auth|signin/);
    
    // العودة للصفحة الرئيسية
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('📊 اختبار التتبع', async ({ page }) => {
    // تفعيل التتبع
    await page.context().tracing.start({ screenshots: true, snapshots: true });
    
    // تنفيذ سيناريو التنقل
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const navLink = page.locator('nav a, .main-menu a, .navbar a').first();
    if (await navLink.count() > 0) {
      await navLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    // إيقاف التتبع
    await page.context().tracing.stop({ path: 'test-results/navigation-trace.zip' });
    
    // التحقق من إنشاء ملف التتبع
    const fs = require('fs');
    expect(fs.existsSync('test-results/navigation-trace.zip')).toBe(true);
  });
});
