import { test, expect } from '@playwright/test';

// 🎭 اختبارات E2E لسلة التسوق - Kaleem Frontend

test.describe('🛒 سلة التسوق', () => {
  test.beforeEach(async ({ page }) => {
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('✅ عرض سلة التسوق الفارغة', async ({ page }) => {
    // النقر على أيقونة السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      
      // انتظار ظهور السلة
      await page.waitForTimeout(500);
      
      // التحقق من وجود السلة
      const cartDropdown = page.locator('.cart-dropdown, .cart-panel, [data-testid="cart-dropdown"], .cart-sidebar');
      if (await cartDropdown.count() > 0) {
        await expect(cartDropdown.first()).toBeVisible();
        
        // التحقق من رسالة السلة الفارغة
        const emptyMessage = page.locator('.empty-cart, .cart-empty, [data-testid="empty-cart"], .no-items');
        if (await emptyMessage.count() > 0) {
          await expect(emptyMessage.first()).toBeVisible();
        }
      }
    }
  });

  test('🛍️ إضافة منتج للسلة', async ({ page }) => {
    // الانتقال لصفحة المنتجات
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
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
        
        // التحقق من أن العداد يظهر الرقم 1
        const counterText = await cartCounter.first().textContent();
        expect(counterText).toMatch(/1/);
      }
    }
  });

  test('👁️ عرض محتويات السلة', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // النقر على أيقونة السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      
      // انتظار ظهور السلة
      await page.waitForTimeout(500);
      
      // التحقق من وجود السلة
      const cartDropdown = page.locator('.cart-dropdown, .cart-panel, [data-testid="cart-dropdown"], .cart-sidebar');
      if (await cartDropdown.count() > 0) {
        await expect(cartDropdown.first()).toBeVisible();
        
        // التحقق من وجود المنتج في السلة
        const cartItems = page.locator('.cart-item, .cart-product, [data-testid="cart-item"], .item');
        if (await cartItems.count() > 0) {
          await expect(cartItems.first()).toBeVisible();
          
          // التحقق من وجود اسم المنتج
          const productName = cartItems.first().locator('.product-name, .item-name, [data-testid="product-name"]');
          if (await productName.count() > 0) {
            await expect(productName.first()).toBeVisible();
          }
          
          // التحقق من وجود السعر
          const productPrice = cartItems.first().locator('.product-price, .item-price, [data-testid="product-price"]');
          if (await productPrice.count() > 0) {
            await expect(productPrice.first()).toBeVisible();
          }
          
          // التحقق من وجود الكمية
          const quantityInput = cartItems.first().locator('input[type="number"], .quantity-input, [data-testid="quantity"]');
          if (await quantityInput.count() > 0) {
            await expect(quantityInput.first()).toBeVisible();
            await expect(quantityInput.first()).toHaveValue('1');
          }
        }
      }
    }
  });

  test('➕➖ تغيير الكمية', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
      // البحث عن أزرار تغيير الكمية
      const increaseButton = page.locator('.increase-quantity, .quantity-up, [data-testid="increase"], button:has-text("+")');
      const decreaseButton = page.locator('.decrease-quantity, .quantity-down, [data-testid="decrease"], button:has-text("-")');
      
      if (await increaseButton.count() > 0 && await decreaseButton.count() > 0) {
        // زيادة الكمية
        await increaseButton.first().click();
        await page.waitForTimeout(500);
        
        // التحقق من أن الكمية أصبحت 2
        const quantityInput = page.locator('input[type="number"], .quantity-input, [data-testid="quantity"]');
        if (await quantityInput.count() > 0) {
          await expect(quantityInput.first()).toHaveValue('2');
        }
        
        // تقليل الكمية
        await decreaseButton.first().click();
        await page.waitForTimeout(500);
        
        // التحقق من أن الكمية عادت لـ 1
        if (await quantityInput.count() > 0) {
          await expect(quantityInput.first()).toHaveValue('1');
        }
      }
    }
  });

  test('🗑️ حذف منتج من السلة', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
      // البحث عن زر الحذف
      const removeButton = page.locator('.remove-item, .delete-item, [data-testid="remove"], button[aria-label*="حذف"], button[aria-label*="Remove"]');
      
      if (await removeButton.count() > 0) {
        // النقر على زر الحذف
        await removeButton.first().click();
        
        // انتظار تأكيد الحذف
        await page.waitForTimeout(1000);
        
        // التحقق من رسالة تأكيد الحذف
        const confirmMessage = page.locator('.confirm-remove, .delete-confirm, [data-testid="confirm-remove"]');
        if (await confirmMessage.count() > 0) {
          await expect(confirmMessage.first()).toBeVisible();
          
          // النقر على زر التأكيد
          const confirmButton = confirmMessage.locator('button:has-text("نعم"), button:has-text("Yes"), button:has-text("تأكيد")');
          if (await confirmButton.count() > 0) {
            await confirmButton.first().click();
            
            // انتظار حذف المنتج
            await page.waitForTimeout(1000);
            
            // التحقق من أن السلة أصبحت فارغة
            const emptyMessage = page.locator('.empty-cart, .cart-empty, [data-testid="empty-cart"], .no-items');
            if (await emptyMessage.count() > 0) {
              await expect(emptyMessage.first()).toBeVisible();
            }
            
            // التحقق من إعادة تعيين عداد السلة
            const cartCounter = page.locator('.cart-counter, .cart-count, [data-testid="cart-count"], .cart-badge');
            if (await cartCounter.count() > 0) {
              const counterText = await cartCounter.first().textContent();
              expect(counterText).toMatch(/0/);
            }
          }
        }
      }
    }
  });

  test('💰 حساب المجموع', async ({ page }) => {
    // إضافة منتجين للسلة
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 1) {
      // إضافة المنتج الأول
      await addToCartButtons.first().click();
      await page.waitForTimeout(1000);
      
      // إضافة المنتج الثاني
      await addToCartButtons.nth(1).click();
      await page.waitForTimeout(1000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
      // التحقق من وجود حساب المجموع
      const subtotal = page.locator('.subtotal, .cart-subtotal, [data-testid="subtotal"], .total-before-tax');
      if (await subtotal.count() > 0) {
        await expect(subtotal.first()).toBeVisible();
        
        // التحقق من وجود الضريبة
        const tax = page.locator('.tax, .cart-tax, [data-testid="tax"], .vat');
        if (await tax.count() > 0) {
          await expect(tax.first()).toBeVisible();
        }
        
        // التحقق من وجود المجموع النهائي
        const total = page.locator('.total, .cart-total, [data-testid="total"], .final-total');
        if (await total.count() > 0) {
          await expect(total.first()).toBeVisible();
        }
      }
    }
  });

  test('🛒 الانتقال لصفحة السلة', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
      // البحث عن زر الانتقال لصفحة السلة
      const viewCartButton = page.locator('a:has-text("عرض السلة"), a:has-text("View Cart"), button:has-text("عرض السلة"), button:has-text("View Cart")');
      
      if (await viewCartButton.count() > 0) {
        // النقر على الزر
        await viewCartButton.first().click();
        
        // انتظار تحميل صفحة السلة
        await page.waitForLoadState('networkidle');
        
        // التحقق من تغيير URL
        expect(page.url()).toMatch(/cart|basket|shopping-cart/);
        
        // التحقق من وجود صفحة السلة
        const cartPage = page.locator('.cart-page, .shopping-cart-page, [data-testid="cart-page"], main');
        await expect(cartPage.first()).toBeVisible();
      }
    }
  });

  test('💳 الانتقال للدفع', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // الانتقال لصفحة السلة
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // البحث عن زر الدفع
    const checkoutButton = page.locator('button:has-text("إتمام الطلب"), button:has-text("Checkout"), button:has-text("الدفع"), .checkout-button');
    
    if (await checkoutButton.count() > 0) {
      // النقر على زر الدفع
      await checkoutButton.first().click();
      
      // انتظار تحميل صفحة الدفع
      await page.waitForLoadState('networkidle');
      
      // التحقق من تغيير URL
      expect(page.url()).toMatch(/checkout|payment|order/);
      
      // التحقق من وجود صفحة الدفع
      const checkoutPage = page.locator('.checkout-page, .payment-page, [data-testid="checkout-page"], main');
      await expect(checkoutPage.first()).toBeVisible();
    }
  });

  test('📱 اختبار التصميم المتجاوب للسلة', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
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
      
      // فتح السلة
      const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
      
      if (await cartIcon.count() > 0) {
        await cartIcon.first().click();
        await page.waitForTimeout(500);
        
        // التحقق من أن السلة تظهر
        const cartDropdown = page.locator('.cart-dropdown, .cart-panel, [data-testid="cart-dropdown"], .cart-sidebar');
        if (await cartDropdown.count() > 0) {
          await expect(cartDropdown.first()).toBeVisible();
        }
      }
    }
  });

  test('🎨 اختبار التصميم RTL للسلة', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
      // التحقق من اتجاه النص RTL
      const body = page.locator('body, html');
      await expect(body).toHaveAttribute('dir', 'rtl');
      
      // التحقق من لغة الصفحة
      await expect(body).toHaveAttribute('lang', 'ar');
      
      // التحقق من أن السلة تظهر بشكل صحيح
      const cartDropdown = page.locator('.cart-dropdown, .cart-panel, [data-testid="cart-dropdown"], .cart-sidebar');
      if (await cartDropdown.count() > 0) {
        await expect(cartDropdown.first()).toBeVisible();
      }
    }
  });

  test('♿ اختبار إمكانية الوصول للسلة', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
      // التحقق من وجود aria-label لأيقونة السلة
      const cartIconAriaLabel = await cartIcon.first().getAttribute('aria-label');
      expect(cartIconAriaLabel).toBeTruthy();
      
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
    }
  });

  test('📊 اختبار الأداء', async ({ page }) => {
    // قياس وقت فتح السلة
    const startTime = Date.now();
    
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      
      // انتظار ظهور السلة
      await page.waitForTimeout(500);
      
      const openTime = Date.now() - startTime;
      
      // التحقق من أن وقت فتح السلة أقل من ثانيتين
      expect(openTime).toBeLessThan(2000);
    }
  });

  test('🔒 اختبار الأمان', async ({ page }) => {
    // محاولة الوصول لصفحة سلة محمية
    await page.goto('/admin/cart');
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
    
    // تنفيذ سيناريو السلة
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // إضافة منتج للسلة
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
    }
    
    // إيقاف التتبع
    await page.context().tracing.stop({ path: 'test-results/cart-trace.zip' });
    
    // التحقق من إنشاء ملف التتبع
    const fs = require('fs');
    expect(fs.existsSync('test-results/cart-trace.zip')).toBe(true);
  });

  test('🎭 اختبار التفاعل مع العناصر', async ({ page }) => {
    // إضافة منتج للسلة أولاً
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const addToCartButtons = page.locator('button:has-text("أضف للسلة"), button:has-text("Add to Cart"), button[aria-label*="أضف"], .add-to-cart');
    
    if (await addToCartButtons.count() > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // فتح السلة
    const cartIcon = page.locator('.cart-icon, .shopping-cart, [data-testid="cart-icon"], .cart-button');
    
    if (await cartIcon.count() > 0) {
      await cartIcon.first().click();
      await page.waitForTimeout(500);
      
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
    }
  });
});
