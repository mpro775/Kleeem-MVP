// tests/e2e/verify-email.e2e.spec.ts
import { test, expect } from "@playwright/test";

const VERIFY_ENDPOINT = "**/*/auth/verify-email";
const RESEND_ENDPOINT = "**/*/auth/resend-verification";
const ENSURE_MERCHANT = "**/*/auth/ensure-merchant";

async function seedAuthedUnverified(page: any) {
  await page.addInitScript(
    ([user, token]) => {
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
    },
    [
      {
        id: "u1",
        name: "Tester",
        email: "tester@example.com",
        role: "MERCHANT",
        merchantId: null,
        firstLogin: true,
        emailVerified: false,
      },
      "mock-token",
    ]
  );
}

async function fillOtp(page: any, code = "123456") {
  // 1) محاولـة 6 inputs (maxlength=1)
  const digitInputs = page.locator(
    'input[maxlength="1"], input[aria-label*="code"][maxlength="1"]'
  );
  if ((await digitInputs.count()) >= 6) {
    for (let i = 0; i < 6; i++) {
      await digitInputs.nth(i).fill(code[i]);
    }
    return;
  }
  // 2) حقل واحد
  const single = page.locator(
    'input[name="code"], input[placeholder*="رمز"], input[placeholder*="OTP"], input[aria-label*="رمز"], input[aria-label*="OTP"]'
  );
  if (await single.count()) {
    await single.first().fill(code);
    return;
  }
  // 3) fallback: أول input من النوع number/text
  await page
    .locator('input[type="tel"], input[type="text"], input[type="number"]')
    .first()
    .fill(code);
}

test.describe("📧 تفعيل البريد / OTP", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthedUnverified(page);
    await page.goto("/verify-email");
    await expect(page.locator("form")).toBeVisible();
  });

  test("🔁 إعادة إرسال الرمز تعمل وتظهر رسالة نجاح", async ({ page }) => {
    await page.route(RESEND_ENDPOINT, (route) =>
      route.fulfill({ status: 204, contentType: "application/json", body: "" })
    );

    const resend = page
      .getByRole("button", { name: /إعادة الإرسال|Resend/i })
      .or(page.getByRole("link", { name: /إعادة الإرسال|Resend/i }));
    if (await resend.count()) {
      await resend.first().click();
      await expect(
        page.locator('.alert-success, .MuiAlert-filledSuccess, [role="alert"]')
      ).toBeVisible();
    }
  });

  test("✅ إدخال OTP صحيح → نجاح وتوجيه لاحق", async ({ page }) => {
    await page.route(VERIFY_ENDPOINT, (route) =>
      route.fulfill({ status: 204, contentType: "application/json", body: "" })
    );

    // بعض الواجهات تستدعي ensure-merchant مباشرة بعد التفعيل
    await page.route(ENSURE_MERCHANT, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "new-token",
          user: {
            id: "u1",
            name: "Tester",
            email: "tester@example.com",
            role: "MERCHANT",
            merchantId: "m1",
            firstLogin: false,
            emailVerified: true,
          },
        }),
      })
    );

    await fillOtp(page, "123456");
    const submit = page
      .getByRole("button", { name: /تأكيد|تحقق|Verify|Submit/i })
      .first();
    await submit.click();

    // بعد النجاح: إمّا رسالة نجاح، أو تحويلة لـ /onboarding أو /dashboard
    const success = page.locator(
      '.alert-success, .MuiAlert-filledSuccess, [role="alert"][data-type="success"]'
    );
    if (await success.count()) {
      await expect(success.first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/(onboarding|dashboard)/i);
    }
  });

  test("❌ إدخال OTP خاطئ يظهر خطأ", async ({ page }) => {
    await page.route(VERIFY_ENDPOINT, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "رمز التفعيل غير صحيح" }),
      })
    );
    await fillOtp(page, "000000");
    await page.getByRole("button", { name: /تأكيد|Verify|Submit/i }).click();
    await expect(
      page.locator(
        '.alert-error, .MuiAlert-filledError, .Mui-error, [role="alert"]'
      )
    ).toBeVisible();
    await expect(page).toHaveURL(/\/verify-email/i);
  });
});
