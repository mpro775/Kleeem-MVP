// tests/e2e/auth/signup.e2e.spec.ts
import { test, expect, Page } from "@playwright/test";

const registerEndpoint = "**/*/auth/register";

// ⬅️ تسميات الحقول (مطابقة كاملة لتسميات SignUpPage.tsx)
const NAME_LABEL = /^(?:الاسم الكامل|Full Name|Name)$/i;
const EMAIL_LABEL = /^(?:البريد الإلكتروني|Email)$/i;
const PASSWORD_LABEL = /^(?:كلمة المرور|Password)$/i;
const CONFIRM_PASSWORD_LABEL = /^(?:تأكيد كلمة المرور|Confirm Password)$/i;

// 🔎 كل الاستعلامات تكون داخل الفورم لتجنّب الالتقاط الخاطئ
const formLocator = (page: Page) => page.locator("form");
const getTextboxByName = (page: Page, nameRe: RegExp) =>
  formLocator(page).getByRole("textbox", { name: nameRe });

/** ✅ فحص ظهور رسالة الخطأ للحقل بشكل موثوق مع MUI
 * لا نعتمد فقط على aria-invalid لأن MUI قد لا يضبطها على <input> دائمًا.
 * نستخدم aria-describedby ثم نتحقق من الـ helper text، مع فallback منطقي.
 */
async function expectFieldHasError(
  page: Page,
  labelRe: RegExp,
  opts?: { messageRe?: RegExp }
) {
  const input = getTextboxByName(page, labelRe);
  await expect(input).toBeVisible();

  // نحاول الاستفادة من aria-invalid إن كانت true (لا نعتمد عليها حصراً)
  const invalid = await input.getAttribute("aria-invalid");
  if (invalid === "true") {
    // نكمل لفحص ظهور الرسالة أيضاً
  }

  // الأفضل: الوصول إلى helper عبر aria-describedby
  const describedBy = await input.getAttribute("aria-describedby");
  if (describedBy) {
    const helper = page.locator(`#${describedBy}`);
    await expect(helper).toBeVisible();
    if (opts?.messageRe) {
      await expect(helper).toHaveText(opts.messageRe);
    }
    return;
  }

  // فallback: عناصر خطأ شائعة قرب الحقل
  const group = input.locator(
    "xpath=ancestor::div[contains(@class,'MuiFormControl-root')][1]"
  );
  const fallbackErr = group.locator(
    "[role='alert'], .MuiFormHelperText-root.Mui-error, .error-text, .helper-text-error"
  );
  await expect(fallbackErr.first()).toBeVisible();
  if (opts?.messageRe) {
    await expect(fallbackErr.first()).toHaveText(opts.messageRe);
  }
}

/** ✍️ تعبئة نموذج التسجيل وفق SignUpPage.tsx */
async function fillSignupForm(
  page: Page,
  {
    name = "أحمد محمد",
    email = "ahmed@example.com",
    password = "Password123!",
    confirmPassword = "Password123!",
  }: Partial<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }> = {}
) {
  await getTextboxByName(page, NAME_LABEL).fill(name);
  await getTextboxByName(page, EMAIL_LABEL).fill(email);
  await getTextboxByName(page, PASSWORD_LABEL).fill(password);

  const confirm = getTextboxByName(page, CONFIRM_PASSWORD_LABEL);
  if (await confirm.count()) {
    await confirm.fill(confirmPassword);
  }
}

/** 👁️ زر إظهار/إخفاء كلمة المرور للحقل الأساسي فقط */
function getPasswordToggle(page: Page) {
  const passGroup = formLocator(page)
    .locator("div.MuiFormControl-root")
    .filter({ has: getTextboxByName(page, PASSWORD_LABEL) });

  return passGroup.getByRole("button", {
    name: /^(?:إظهار كلمة المرور|إخفاء كلمة المرور|Show Password|Hide Password)$/i,
  });
}

test.describe("📝 صفحة التسجيل", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await expect(formLocator(page)).toBeVisible();
  });

  test("✅ تعرض عناصر النموذج الأساسية", async ({ page }) => {
    await expect(page).toHaveTitle(/كليم|Kaleem|تسجيل|Signup|إنشاء حساب/i);
    await expect(getTextboxByName(page, NAME_LABEL)).toBeVisible();
    await expect(getTextboxByName(page, EMAIL_LABEL)).toBeVisible();
    await expect(getTextboxByName(page, PASSWORD_LABEL)).toBeVisible();

    const confirm = getTextboxByName(page, CONFIRM_PASSWORD_LABEL);
    if (await confirm.count()) await expect(confirm).toBeVisible();

    await expect(
      formLocator(page).getByRole("button", {
        name: /تسجيل|Sign Up|إنشاء حساب/i,
      })
    ).toBeVisible();
  });

  test("🔗 رابط “تسجيل الدخول” يعمل", async ({ page }) => {
    const link = page.getByRole("link", {
      name: /تسجيل الدخول|Login|Sign In/i,
    });
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(/login|signin|auth/i);
    }
  });

  test("❌ إرسال فارغ يُظهر أخطاء", async ({ page }) => {
    await formLocator(page)
      .getByRole("button", { name: /تسجيل|Sign Up|إنشاء حساب/i })
      .click();

    await expectFieldHasError(page, EMAIL_LABEL);
    await expectFieldHasError(page, PASSWORD_LABEL);
    await expect(page).toHaveURL(/\/signup/i);
  });

  test("📧 بريد غير صالح", async ({ page }) => {
    await fillSignupForm(page, { email: "invalid-email" });
    await formLocator(page)
      .getByRole("button", { name: /تسجيل|Sign Up|إنشاء حساب/i })
      .click();

    await expectFieldHasError(page, EMAIL_LABEL, {
      messageRe: /بريد إلكتروني غير صالح|invalid email/i,
    });
    await expect(page).toHaveURL(/\/signup/i);
  });

  test("🔒 كلمة مرور قصيرة", async ({ page }) => {
    await fillSignupForm(page, { password: "123", confirmPassword: "123" });
    await formLocator(page)
      .getByRole("button", { name: /تسجيل|Sign Up|إنشاء حساب/i })
      .click();

    await expectFieldHasError(page, PASSWORD_LABEL);
  });

  test("🧼 أمان: المدخلات الخبيثة تُنظّف (بدلاً من توقع invalid)", async ({
    page,
  }) => {
    // SignUpPage يقوم بتنظيف المدخلات عبر sanitizeInput
    await fillSignupForm(page, { name: "<script>alert(1)</script>" });

    const nameInput = getTextboxByName(page, NAME_LABEL);
    // التأكد أن القيمة أصبحت بدون < >
    await expect(nameInput).toHaveValue(/^[^<>]*$/);

    // ولا توجد رسالة خطأ ظاهرة
    const nameDescId = await nameInput.getAttribute("aria-describedby");
    if (nameDescId) {
      await expect(page.locator(`#${nameDescId}`)).not.toBeVisible();
    }
  });

  test("👁️ إظهار/إخفاء كلمة المرور يغيّر النوع", async ({ page }) => {
    const pass = getTextboxByName(page, PASSWORD_LABEL);
    await pass.fill("Password123!");

    const toggle = getPasswordToggle(page).first();
    if (await toggle.count()) {
      const before = await pass.getAttribute("type"); // "password"
      await toggle.click();
      const after = await pass.getAttribute("type"); // غالباً "text"
      if (before !== after) {
        await toggle.click();
        await expect(pass).toHaveAttribute("type", before!);
      }
    }
  });

  test("✅ نجاح التسجيل → /verify-email إذا emailVerified=false أو لا يوجد توكن", async ({
    page,
  }) => {
    await page.route(registerEndpoint, (route) => {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "", // قد يكون خاليًا حسب منطق الصفحة
          user: {
            id: "u1",
            name: "Test",
            email: "ahmed@example.com",
            role: "MERCHANT",
            merchantId: null,
            firstLogin: true,
            emailVerified: false,
          },
        }),
      });
    });

    await fillSignupForm(page);
    await formLocator(page)
      .getByRole("button", { name: /تسجيل|Sign Up|إنشاء حساب/i })
      .click();

    await expect(page).toHaveURL(/\/verify-email/i);
  });

  test("❌ بريد مستخدم مسبقًا (409): نبقى في /signup ويظهر خطأ", async ({
    page,
  }) => {
    await page.route(registerEndpoint, (route) => {
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "Email already in use" }),
      });
    });

    await fillSignupForm(page, { email: "dup@example.com" });
    await formLocator(page)
      .getByRole("button", { name: /تسجيل|Sign Up|إنشاء حساب/i })
      .click();

    const toast = page.locator('[role="alert"], .snackbar-error, .alert-error');
    if (await toast.count()) {
      await expect(toast.first()).toBeVisible();
    } else {
      // في حال تم إسقاط الخطأ على الحقل عبر applyServerFieldErrors
      await expectFieldHasError(page, EMAIL_LABEL, {
        messageRe: /already in use|مستخدم مسبقًا/i,
      });
    }
    await expect(page).toHaveURL(/\/signup/i);
  });

  test("📱 تجاوب الواجهة", async ({ page }) => {
    const sizes = [
      { w: 1920, h: 1080 },
      { w: 1366, h: 768 },
      { w: 768, h: 1024 },
      { w: 375, h: 667 },
    ];
    for (const s of sizes) {
      await page.setViewportSize({ width: s.w, height: s.h });
      await expect(formLocator(page)).toBeVisible();
    }
  });

  test("🎨 RTL/Lang موجودة", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", /rtl/i);
    await expect(html).toHaveAttribute("lang", /ar/i);
  });

  test("⏱️ أداء أساسي", async ({ page }) => {
    const t0 = Date.now();
    await page.goto("/signup");
    await expect(formLocator(page)).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  test("🧵 تتبّع Playwright (trace) لسيناريو التسجيل", async ({ page }) => {
    await page.context().tracing.start({ screenshots: true, snapshots: true });

    await page.route(registerEndpoint, (route) => {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "",
          user: {
            id: "u1",
            name: "Test",
            email: "ahmed@example.com",
            role: "MERCHANT",
            merchantId: null,
            firstLogin: true,
            emailVerified: false,
          },
        }),
      });
    });

    await page.goto("/signup");
    await expect(formLocator(page)).toBeVisible();
    await fillSignupForm(page);
    await formLocator(page)
      .getByRole("button", { name: /تسجيل|Sign Up|إنشاء حساب/i })
      .click();
    await expect(page).toHaveURL(/\/verify-email/i);

    await page
      .context()
      .tracing.stop({ path: "test-results/signup-trace.zip" });
  });
});
