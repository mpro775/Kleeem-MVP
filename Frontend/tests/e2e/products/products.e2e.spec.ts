import { test, expect } from '@playwright/test';

// 🎭 اختبارات E2E للمنتجات - Kaleem Frontend

test.describe('🛍️ المنتجات', () => {
  test.beforeEach(async ({ page }) => {
    // الانتقال إلى صفحة المنتجات
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
  });

  test('✅ عرض صفحة المنتجات بشكل صحيح', async ({ page }) => {
    // التحقق من عنوان الصفحة
    await expect(page).toHaveTitle(/المنتجات|Products|المتجر|Store/);
    
    // التحقق من وجود قائمة المنتجات
    const productsList = page.locator('.products-list, .products-grid, [data-testid="products-list"], .products');
    await expect(productsList.first()).toBeVisible();
    
    // التحقق من وجود فلترات البحث
    const filters = page.locator('.filters, .search-filters, [data-testid="filters"], .product-filters');
    if (await filters.count() > 0) {
      await expect(filters.first()).toBeVisible();
    }
    
    // التحقق من وجود شريط البحث
    const searchBar = page.locator('.search-bar, .product-search, [data-testid="search"], input[type="search"]');
    if (await searchBar.count() > 0) {
      await expect(searchBar.first()).toBeVisible();
    }
  });

  test('🔍 اختبار البحث عن المنتجات', async ({ page }) => {
    // البحث عن حقل البحث
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"], input[placeholder*="Search"], .search-input');
    
    if (await searchInput.count() > 0) {
      // كتابة نص في حقل البحث
      await searchInput.fill('كليم');
      
      // النقر على زر البحث
      const searchButton = page.locator('button[type="submit"], button[aria-label*="بحث"], button[aria-label*="Search"], .search-button');
      
      if (await searchButton.count() > 0) {
        await searchButton.click();
      } else {
        // إذا لم يكن هناك زر بحث، استخدم Enter
        await searchInput.press('Enter');
      }
      
      // انتظار نتائج البحث
      await page.waitForTimeout(2000);
      
      // التحقق من تغيير URL أو ظهور نتائج البحث
      const searchResults = page.locator('.search-results, .results, [data-testid="search-results"], .products');
      if (await searchResults.count() > 0) {
        await expect(searchResults.first()).toBeVisible();
      }
      
      // التحقق من أن النتائج تحتوي على الكلمة المبحوثة
      const productTitles = page.locator('.product-title, .product-name, h3, h4');
      if (await productTitles.count() > 0) {
        const firstTitle = await productTitles.first().textContent();
        expect(firstTitle).toMatch(/كليم|Kaleem/i);
      }
    }
  });

  test('🔧 اختبار الفلاتر', async ({ page }) => {
    // اختبار فلتر الفئة
    const categoryFilter = page.locator('select[name="category"], .category-filter, [data-testid="category-filter"]');
    
    if (await categoryFilter.count() > 0) {
      // اختيار فئة معينة
      await categoryFilter.selectOption({ value: 'electronics' });
      
      // انتظار تحديث النتائج
      await page.waitForTimeout(2000);
      
      // التحقق من تحديث URL
      expect(page.url()).toContain('category=electronics');
    }
    
    // اختبار فلتر السعر
    const priceFilter = page.locator('input[name="minPrice"], input[name="maxPrice"], .price-filter, [data-testid="price-filter"]');
    
    if (await priceFilter.count() > 0) {
      // تعيين حد أدنى للسعر
      const minPriceInput = priceFilter.first();
      await minPriceInput.fill('100');
      
      // انتظار تحديث النتائج
      await page.waitForTimeout(2000);
      
      // التحقق من تحديث URL
      expect(page.url()).toContain('minPrice=100');
    }
    
    // اختبار فلتر التقييم
    const ratingFilter = page.locator('input[name="rating"], .rating-filter, [data-testid="rating-filter"]');
    
    if (await ratingFilter.count() > 0) {
      // اختيار تقييم معين
      await ratingFilter.first().click();
      
      // انتظار تحديث النتائج
      await page.waitForTimeout(2000);
      
      // التحقق من تحديث URL
      expect(page.url()).toContain('rating=');
    }
  });

  test('📱 اختبار التصميم المتجاوب للمنتجات', async ({ page }) => {
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
      
      // التحقق من أن قائمة المنتجات تظهر
      const productsList = page.locator('.products-list, .products-grid, [data-testid="products-list"], .products');
      await expect(productsList.first()).toBeVisible();
      
      // التحقق من أن الفلاتر تظهر
      const filters = page.locator('.filters, .search-filters, [data-testid="filters"], .product-filters');
      if (await filters.count() > 0) {
        await expect(filters.first()).toBeVisible();
      }
    }
  });

  test('🎨 اختبار التصميم RTL للمنتجات', async ({ page }) => {
    // التحقق من اتجاه النص RTL
    const body = page.locator('body, html');
    await expect(body).toHaveAttribute('dir', 'rtl');
    
    // التحقق من لغة الصفحة
    await expect(body).toHaveAttribute('lang', 'ar');
    
    // التحقق من أن المنتجات تظهر بشكل صحيح
    const productsList = page.locator('.products-list, .products-grid, [data-testid="products-list"], .products');
    await expect(productsList.first()).toBeVisible();
  });

  test('♿ اختبار إمكانية الوصول للمنتجات', async ({ page }) => {
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

  test('🛒 اختبار إضافة المنتجات للسلة', async ({ page }) => {
    // البحث عن أزرار إضافة للسلة
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      // النقر على أول زر إضافة للسلة
      const firstButton = addToCartButtons.first();
      await firstButton.click();
      
      // انتظار رسالة التأكيد
      await page.waitForTimeout(2000);
      
      // التحقق من وجود رسالة تأكيد
      const successMessage = page.locator('.success, .success-message, [data-testid="success"], .alert-success');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible();
      }
      
      // التحقق من تحديث عداد السلة
      const cartCounter = page.locator('.cart-counter, .cart-count, [data-testid="cart-count"], .cart-badge');
      if (await cartCounter.count() > 0) {
        await expect(cartCounter.first()).toBeVisible();
      }
    }
  });

  test('❤️ اختبار المفضلة', async ({ page }) => {
    // البحث عن أزرار المفضلة
    const favoriteButtons = page.locator('button[aria-label*="مفضل"], button[aria-label*="Favorite"], button[aria-label*="Like"], .favorite-button, .like-button');
    
    if (await favoriteButtons.count() > 0) {
      // النقر على أول زر مفضلة
      const firstButton = favoriteButtons.first();
      await firstButton.click();
      
      // انتظار تحديث الحالة
      await page.waitForTimeout(1000);
      
      // التحقق من تغيير الحالة
      const isFavorited = await firstButton.getAttribute('aria-pressed');
      if (isFavorited !== null) {
        expect(isFavorited).toBe('true');
      }
      
      // النقر مرة أخرى لإلغاء المفضلة
      await firstButton.click();
      
      // انتظار تحديث الحالة
      await page.waitForTimeout(1000);
      
      // التحقق من إلغاء المفضلة
      const isNotFavorited = await firstButton.getAttribute('aria-pressed');
      if (isNotFavorited !== null) {
        expect(isNotFavorited).toBe('false');
      }
    }
  });

  test('📊 اختبار الترتيب', async ({ page }) => {
    // اختبار ترتيب حسب السعر
    const sortByPrice = page.locator('select[name="sort"], .sort-select, [data-testid="sort"], .sorting');
    
    if (await sortByPrice.count() > 0) {
      // اختيار ترتيب حسب السعر (من الأقل للأعلى)
      await sortByPrice.selectOption({ value: 'price-asc' });
      
      // انتظار تحديث النتائج
      await page.waitForTimeout(2000);
      
      // التحقق من تحديث URL
      expect(page.url()).toContain('sort=price-asc');
      
      // التحقق من ترتيب الأسعار
      const prices = page.locator('.product-price, .price, [data-testid="price"]');
      if (await prices.count() > 1) {
        const firstPrice = await prices.first().textContent();
        const lastPrice = await prices.last().textContent();
        
        // استخراج الأرقام من النص
        const firstPriceNum = parseFloat((firstPrice || '').replace(/[^\d.]/g, ''));
        const lastPriceNum = parseFloat((lastPrice || '').replace(/[^\d.]/g, ''));
        
        // التحقق من أن السعر الأول أقل من الأخير
        expect(firstPriceNum).toBeLessThanOrEqual(lastPriceNum);
      }
    }
  });

  test('📄 اختبار الصفحات', async ({ page }) => {
    // البحث عن أزرار التنقل بين الصفحات
    const paginationButtons = page.locator('.pagination, .page-numbers, [data-testid="pagination"], .pager');
    
    if (await paginationButtons.count() > 0) {
      // النقر على الصفحة الثانية
      const secondPageButton = page.locator('a:has-text("2"), button:has-text("2"), .page-2');
      
      if (await secondPageButton.count() > 0) {
        await secondPageButton.click();
        
        // انتظار تحميل الصفحة
        await page.waitForLoadState('networkidle');
        
        // التحقق من تحديث URL
        expect(page.url()).toContain('page=2');
        
        // التحقق من أن المنتجات تظهر
        const productsList = page.locator('.products-list, .products-grid, [data-testid="products-list"], .products');
        await expect(productsList.first()).toBeVisible();
      }
    }
  });

  test('🔍 اختبار تفاصيل المنتج', async ({ page }) => {
    // البحث عن أول منتج
    const firstProduct = page.locator('.product-item, .product-card, [data-testid="product"], .product').first();
    
    if (await firstProduct.count() > 0) {
      // النقر على المنتج لفتح تفاصيله
      await firstProduct.click();
      
      // انتظار تحميل صفحة التفاصيل
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).toMatch(/product|item|detail/);
      
      // التحقق من وجود تفاصيل المنتج
      const productDetails = page.locator('.product-details, .product-info, [data-testid="product-details"], .details');
      await expect(productDetails.first()).toBeVisible();
      
      // العودة لصفحة المنتجات
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
    }
  });

  test('📊 اختبار الأداء', async ({ page }) => {
    // قياس وقت تحميل الصفحة
    const startTime = Date.now();
    
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // التحقق من أن وقت التحميل أقل من 5 ثوانٍ
    expect(loadTime).toBeLessThan(5000);
    
    // قياس وقت البحث
    const searchStartTime = Date.now();
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"], input[placeholder*="Search"], .search-input');
    if (await searchInput.count() > 0) {
      await searchInput.fill('كليم');
      await searchInput.press('Enter');
      
      await page.waitForTimeout(2000);
      
      const searchTime = Date.now() - searchStartTime;
      
      // التحقق من أن وقت البحث أقل من 3 ثوانٍ
      expect(searchTime).toBeLessThan(3000);
    }
  });

  test('🔒 اختبار الروابط المحمية', async ({ page }) => {
    // محاولة الوصول لصفحة محمية
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    
    // التحقق من إعادة التوجيه لصفحة تسجيل الدخول
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login|auth|signin/);
    
    // العودة لصفحة المنتجات
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
  });

  test('📊 اختبار التتبع', async ({ page }) => {
    // تفعيل التتبع
    await page.context().tracing.start({ screenshots: true, snapshots: true });
    
    // تنفيذ سيناريو المنتجات
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // البحث عن منتج
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"], input[placeholder*="Search"], .search-input');
    if (await searchInput.count() > 0) {
      await searchInput.fill('كليم');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // التمرير لأسفل الصفحة
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // إيقاف التتبع
    await page.context().tracing.stop({ path: 'test-results/products-trace.zip' });
    
    // التحقق من إنشاء ملف التتبع
    const fs = require('fs');
    expect(fs.existsSync('test-results/products-trace.zip')).toBe(true);
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
        expect(page.url()).not.toBe('http://localhost:3000/products');
        
        // العودة لصفحة المنتجات
        await page.goto('/products');
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
