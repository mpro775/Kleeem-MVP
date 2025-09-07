// tests/e2e/password-reset.e2e.spec.ts
import { test, expect } from "@playwright/test";

const REQUEST_RESET = "**/*/auth/request-password-reset";
const VALIDATE_RESET = "**/*/auth/validate-password-reset";
const RESET_PASSWORD = "**/*/auth/reset-password";

test.describe("🔑 إعادة تعيين كلمة المرور", () => {
  test("📧 طلب إعادة تعيين ينجح ويعرض إشعارًا", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("form")).toBeVisible();

    await page.route(REQUEST_RESET, (route) =>
      route.fulfill({ status: 204, contentType: "application/json", body: "" })
    );

    const email = page
      .getByLabel(/البريد الإلكتروني|Email/i)
      .or(page.locator('input[type="email"], input[name="email"]'));
    await email.fill("user@example.com");

    const submit = page.getByRole("button", {
      name: /إرسال|Send|Submit|إعادة تعيين/i,
    });
    await submit.click();

    await expect(
      page.locator('.alert-success, .MuiAlert-filledSuccess, [role="alert"]')
    ).toBeVisible();
  });

  test("✅ توكن صالح → تعيين كلمة مرور جديدة وتحوّل إلى /login", async ({
    page,
  }) => {
    const params = new URLSearchParams({
      token: "t0k3n",
      email: "user@example.com",
    });
    await page.goto(`/reset-password?${params.toString()}`);

    // التحقق من صحة التوكن
    await page.route(VALIDATE_RESET, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "true",
      })
    );

    // إعادة التعيين
    await page.route(RESET_PASSWORD, (route) =>
      route.fulfill({ status: 204, contentType: "application/json", body: "" })
    );

    // انتظر ظهور النموذج
    await expect(page.locator("form")).toBeVisible();

    const newPass = page
      .getByLabel(/كلمة المرور الجديدة|New Password/i)
      .or(page.locator('input[name="newPassword"]'));
    const confirm = page
      .getByLabel(/تأكيد كلمة المرور|Confirm Password/i)
      .or(page.locator('input[name="confirmPassword"]'));

    await newPass.fill("NewPass123!");
    await confirm.fill("NewPass123!");

    await page.getByRole("button", { name: /تعيين|Reset|تغيير/i }).click();

    // بعد النجاح: غالبًا تحويل إلى /login
    // أو رسالة نجاح ثم زر "تسجيل الدخول"
    const success = page.locator(
      '.alert-success, .MuiAlert-filledSuccess, [role="alert"]'
    );
    if (await success.count()) {
      await expect(success.first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/login/i);
    }
  });

  test("❌ توكن غير صالح يعرض رسالة خطأ", async ({ page }) => {
    const params = new URLSearchParams({
      token: "bad",
      email: "user@example.com",
    });
    await page.goto(`/reset-password?${params.toString()}`);

    await page.route(VALIDATE_RESET, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "false",
      })
    );

    // تتوقع الواجهة: عرض رسالة خطأ أو تعطيل الزر
    await expect(
      page.locator(
        '.alert-error, .MuiAlert-filledError, .Mui-error, [role="alert"]'
      )
    ).toBeVisible();
    // ابقَ على نفس الصفحة
    await expect(page).toHaveURL(/\/reset-password/i);
  });
});
