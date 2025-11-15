import { test, expect } from "@playwright/test";

const loginEndpointGlob = "**/*/auth/login**";

test.describe("🔐 تسجيل الدخول", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto("/login"); // عندك المسار /login وليس /auth/login
    await expect(page.locator("form")).toBeVisible();
  });

  test("✅ الصفحة تعرض عناصر النموذج", async ({ page }) => {
    await expect(page).toHaveTitle(/تسجيل الدخول|Login/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /تسجيل الدخول|Login/i })
    ).toBeVisible();
  });

  test("❌ رسائل أخطاء للحقول الفارغة", async ({ page }) => {
    await page.getByRole("button", { name: /تسجيل الدخول|Login/i }).click();
    await expect(page.locator('.Mui-error, [role="alert"]')).toBeVisible();
  });

  test("📧 بريد غير صالح", async ({ page }) => {
    await page.locator('input[name="email"]').fill("invalid-email");
    await page.locator('input[name="password"]').fill("password123");
    await page.getByRole("button", { name: /تسجيل الدخول|Login/i }).click();
    await expect(page.locator('.Mui-error, [role="alert"]')).toBeVisible();
  });

  test("🔒 كلمة مرور قصيرة", async ({ page }) => {
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="password"]').fill("123");
    await page.getByRole("button", { name: /تسجيل الدخول|Login/i }).click();
    await expect(page.locator('.Mui-error, [role="alert"]')).toBeVisible();
  });

  test("👁️ إظهار/إخفاء كلمة المرور", async ({ page }) => {
    await page.locator('input[name="password"]').fill("password123");
    // زر الإظهار في تطبيقك عنده aria-label عربي
    const toggle = page.getByRole("button", {
      name: /إظهار كلمة المرور|إخفاء كلمة المرور/,
    });
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('input[name="password"]')).toHaveAttribute(
        "type",
        "text"
      );
      await toggle.click();
      await expect(page.locator('input[name="password"]')).toHaveAttribute(
        "type",
        "password"
      );
    }
  });

  test("🔗 الذهاب إلى إنشاء حساب", async ({ page }) => {
    // رابط إنشئ حساب موجود بـ SignUpPage
    await page.getByRole("link", { name: /أنشئ حساب|Sign/i }).click();
    await expect(page).toHaveURL(/\/signup/i);
  });

  test("🔗 الذهاب إلى نسيت كلمة المرور (إن وُجد)", async ({ page }) => {
    const link = page.getByRole("link", {
      name: /نسيت كلمة المرور|Forgot password/i,
    });
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(/forgot-password|reset-password/i);
    }
  });

  test("🔒 تسجيل دخول ناجح → يوجّه حسب emailVerified=false إلى /verify-email", async ({
    page,
  }) => {
    await page.route(loginEndpointGlob, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-token",
          user: {
            id: "u1",
            name: "Test",
            email: "test@example.com",
            role: "MERCHANT",
            merchantId: null,
            firstLogin: true,
            emailVerified: false,
          },
        }),
      });
    });

    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="password"]').fill("password123");
    await page.getByRole("button", { name: /تسجيل الدخول|Login/i }).click();

    // AuthContext يحوّل إلى /verify-email
    await expect(page).toHaveURL(/\/verify-email/i);
  });

  test("✅ تسجيل دخول ناجح → emailVerified=true يوجّه إلى /dashboard", async ({
    page,
  }) => {
    await page.route(loginEndpointGlob, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-token",
          user: {
            id: "u1",
            name: "Test",
            email: "test@example.com",
            role: "MERCHANT",
            merchantId: "m1",
            firstLogin: false,
            emailVerified: true,
          },
        }),
      });
    });

    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="password"]').fill("password123");
    await page.getByRole("button", { name: /تسجيل الدخول|Login/i }).click();

    await expect(page).toHaveURL(/\/dashboard/i);
  });

  test("❌ تسجيل دخول فاشل (401)", async ({ page }) => {
    await page.route(loginEndpointGlob, (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid credentials" }),
      });
    });

    await page.locator('input[name="email"]').fill("wrong@example.com");
    await page.locator('input[name="password"]').fill("wrongpass");
    await page.getByRole("button", { name: /تسجيل الدخول|Login/i }).click();

    await expect(
      page.locator('.Mui-error, [role="alert"], .alert-error')
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/i);
  });
});
