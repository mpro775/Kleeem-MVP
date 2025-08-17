import { test, expect } from '@playwright/test';

test('merchant onboarding → webhook → conversation appears', async ({ page }) => {
  // 1) الدخول للوحة التحكم
  await page.goto(process.env.FRONT_BASE || 'http://localhost:5173');
  await page.getByLabel('البريد الإلكتروني').fill('admin@kaleem.com');
  await page.getByLabel('كلمة المرور').fill('password');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // 2) تهيئة قناة Telegram (افتراضيًا صفحة الإعدادات)
  await page.getByRole('link', { name: 'القنوات' }).click();
  await page.getByRole('button', { name: /ربط Telegram/i }).click();
  await expect(page.getByText(/تم الربط بنجاح/i)).toBeVisible();

  // 3) التحقق من ظهور محادثة بعد وصول Webhook (يفترض seed أو webhook محاكى)
  await page.getByRole('link', { name: 'المحادثات' }).click();
  await expect(page.locator('[data-testid="conversation-item"]').first()).toBeVisible();

  // 4) إرسال رد والتأكد من البث
  await page.getByPlaceholder('اكتب ردك...').fill('أهلاً! كيف أساعدك؟');
  await page.getByRole('button', { name: 'إرسال' }).click();
  await expect(page.getByText('أهلاً! كيف أساعدك؟')).toBeVisible();
});
