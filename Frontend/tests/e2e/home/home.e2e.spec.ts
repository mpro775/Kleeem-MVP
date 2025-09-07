import { test, expect } from '@playwright/test';

// 🎭 اختبارات E2E للصفحة الرئيسية - Kaleem Frontend

test.describe('🏠 الصفحة الرئيسية', () => {
  test.beforeEach(async ({ page }) => {
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('✅ عرض الصفحة الرئيسية بشكل صحيح', async ({ page }) => {
    // التحقق من عنوان الصفحة
    await expect(page).toHaveTitle(/كليم|Kaleem|الرئيسية|Home/);
    
    // التحقق من وجود المحتوى الرئيسي
    const mainContent = page.locator('main, [role="main"], .main-content, #main');
    await expect(mainContent.first()).toBeVisible();
    
    // التحقق من وجود القائمة الرئيسية
    const mainMenu = page.locator('nav, [role="navigation"], .main-menu, .navbar');
    await expect(mainMenu.first()).toBeVisible();
    
    // التحقق من وجود Footer
    const footer = page.locator('footer, .footer, [role="contentinfo"]');
    await expect(footer.first()).toBeVisible();
  });

  test('🎯 عرض الأقسام الرئيسية', async ({ page }) => {
    // التحقق من وجود Hero Section
    const heroSection = page.locator('.hero, .hero-section, [data-testid="hero"], section:has-text("كليم")');
    if (await heroSection.count() > 0) {
      await expect(heroSection.first()).toBeVisible();
    }
    
    // التحقق من وجود قسم الميزات
    const featuresSection = page.locator('.features, .features-section, [data-testid="features"], section:has-text("الميزات")');
    if (await featuresSection.count() > 0) {
      await expect(featuresSection.first()).toBeVisible();
    }
    
    // التحقق من وجود قسم "لماذا كليم"
    const whyKaleemSection = page.locator('.why-kaleem, .why-section, [data-testid="why-kaleem"], section:has-text("لماذا كليم")');
    if (await whyKaleemSection.count() > 0) {
      await expect(whyKaleemSection.first()).toBeVisible();
    }
    
    // التحقق من وجود قسم الشهادات
    const testimonialsSection = page.locator('.testimonials, .testimonials-section, [data-testid="testimonials"], section:has-text("الشهادات")');
    if (await testimonialsSection.count() > 0) {
      await expect(testimonialsSection.first()).toBeVisible();
    }
  });

  test('🔗 اختبار الروابط الرئيسية', async ({ page }) => {
    // اختبار رابط "ابدأ الآن"
    const startNowButton = page.locator('a:has-text("ابدأ الآن"), a:has-text("Start Now"), button:has-text("ابدأ الآن"), button:has-text("Start Now")');
    if (await startNowButton.count() > 0) {
      await expect(startNowButton.first()).toBeVisible();
      
      // النقر على الزر
      await startNowButton.first().click();
      
      // انتظار تحميل الصفحة الجديدة
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).not.toBe('http://localhost:3000/');
      
      // العودة للصفحة الرئيسية
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }
    
    // اختبار رابط "تعرف علينا"
    const aboutUsButton = page.locator('a:has-text("تعرف علينا"), a:has-text("About Us"), button:has-text("تعرف علينا"), button:has-text("About Us")');
    if (await aboutUsButton.count() > 0) {
      await expect(aboutUsButton.first()).toBeVisible();
      
      // النقر على الزر
      await aboutUsButton.first().click();
      
      // انتظار تحميل الصفحة الجديدة
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).not.toBe('http://localhost:3000/');
      
      // العودة للصفحة الرئيسية
      await page.goto('/');
      await page.waitForLoadState('networkidle');
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
      
      // التحقق من أن Footer يظهر
      const footer = page.locator('footer, .footer, [role="contentinfo"]');
      await expect(footer.first()).toBeVisible();
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

  test('🔍 اختبار البحث', async ({ page }) => {
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

  test('📧 اختبار النشرة الإخبارية', async ({ page }) => {
    // البحث عن نموذج النشرة الإخبارية
    const newsletterForm = page.locator('form:has(input[type="email"]), .newsletter-form, [data-testid="newsletter"]');
    
    if (await newsletterForm.count() > 0) {
      // البحث عن حقل البريد الإلكتروني
      const emailInput = newsletterForm.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      
      // ملء البريد الإلكتروني
      await emailInput.fill('test@example.com');
      
      // البحث عن زر الاشتراك
      const subscribeButton = newsletterForm.locator('button[type="submit"], button:has-text("اشتراك"), button:has-text("Subscribe")');
      
      if (await subscribeButton.count() > 0) {
        await expect(subscribeButton.first()).toBeVisible();
        
        // النقر على زر الاشتراك
        await subscribeButton.first().click();
        
        // انتظار رسالة التأكيد
        await page.waitForTimeout(2000);
        
        // التحقق من وجود رسالة تأكيد
        const successMessage = page.locator('.success, .success-message, [data-testid="success"], .alert-success');
        if (await successMessage.count() > 0) {
          await expect(successMessage.first()).toBeVisible();
        }
      }
    }
  });

  test('📱 اختبار القائمة المحمولة', async ({ page }) => {
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

  test('🔗 اختبار الروابط الاجتماعية', async ({ page }) => {
    // البحث عن روابط وسائل التواصل الاجتماعي
    const socialLinks = page.locator('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="linkedin"], .social-links a');
    
    if (await socialLinks.count() > 0) {
      // التحقق من وجود الروابط الاجتماعية
      await expect(socialLinks.first()).toBeVisible();
      
      // اختبار أول رابط اجتماعي
      const firstSocialLink = socialLinks.first();
      const href = await firstSocialLink.getAttribute('href');
      
      if (href && href.startsWith('http')) {
        // إنشاء promise لانتظار فتح نافذة جديدة
        const pagePromise = page.context().waitForEvent('page');
        
        // النقر على الرابط
        await firstSocialLink.click();
        
        // انتظار فتح النافذة الجديدة
        const newPage = await pagePromise;
        
        // التحقق من فتح النافذة الجديدة
        expect(newPage).toBeTruthy();
        
        // إغلاق النافذة الجديدة
        await newPage.close();
      }
    }
  });

  test('📊 اختبار الأداء', async ({ page }) => {
    // قياس وقت تحميل الصفحة
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // التحقق من أن وقت التحميل أقل من 5 ثوانٍ
    expect(loadTime).toBeLessThan(5000);
    
    // قياس وقت التمرير
    const scrollStartTime = Date.now();
    
    // التمرير لأسفل الصفحة
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const scrollTime = Date.now() - scrollStartTime;
    
    // التحقق من أن وقت التمرير أقل من ثانيتين
    expect(scrollTime).toBeLessThan(2000);
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
    
    // تنفيذ سيناريو الصفحة الرئيسية
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // التمرير لأسفل الصفحة
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // العودة للأعلى
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    // إيقاف التتبع
    await page.context().tracing.stop({ path: 'test-results/home-trace.zip' });
    
    // التحقق من إنشاء ملف التتبع
    const fs = require('fs');
    expect(fs.existsSync('test-results/home-trace.zip')).toBe(true);
  });

  test('🎭 اختبار التفاعل مع العناصر', async ({ page }) => {
    // اختبار النقر على الأزرار
    const buttons = page.locator('button, .btn, [role="button"]');
    
    if (await buttons.count() > 0) {
      // النقر على أول زر
      const firstButton = buttons.first();
      await firstButton.click();
      
      // انتظار استجابة
      await page.waitForTimeout(1000);
      
      // التحقق من عدم حدوث خطأ
      const errorMessages = page.locator('.error, .error-message, [data-testid="error"]');
      expect(await errorMessages.count()).toBe(0);
    }
    
    // اختبار النقر على الروابط
    const links = page.locator('a[href]:not([href^="#"])');
    
    if (await links.count() > 0) {
      // النقر على أول رابط
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      
      if (href && !href.startsWith('#')) {
        await firstLink.click();
        
        // انتظار تحميل الصفحة
        await page.waitForLoadState('networkidle');
        
        // التحقق من تغيير URL
        expect(page.url()).not.toBe('http://localhost:3000/');
        
        // العودة للصفحة الرئيسية
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
