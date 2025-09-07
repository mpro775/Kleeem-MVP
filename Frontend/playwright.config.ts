// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const E2E_BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173"; // غيّر لو تشغّل Vite على 3000
const WEB_SERVER_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.e2e.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/e2e-results.xml" }],
    ["json", { outputFile: "test-results/e2e-results.json" }],
  ],

  // دمج "use" في مكان واحد فقط
  use: {
    baseURL: E2E_BASE_URL,
    // مهلات
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    // لقطات وتتبع
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // العرض واللغة والمنطقة
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
    locale: "ar-SA",
    timezoneId: "Asia/Riyadh",
    // أمان
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    extraHTTPHeaders: {
      "Accept-Language": "ar-SA,ar;q=0.9,en;q=0.8",
      "X-Test-Mode": "true",
      "X-Playwright": "true",
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    // storageState: "tests/e2e/storage-state.json", // اختياري: لو تبي جلسة محفوظة
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
          slowMo: process.env.DEBUG ? 200 : 0,
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // تقدر تضيف الموبايل لو حاب
    // { name: 'iPhone 12', use: devices['iPhone 12'] },
    // { name: 'Pixel 5',   use: devices['Pixel 5']   },
  ],

  webServer: {
    // لو تستخدم Vite: الأفضل تمرير البورت هنا
    // مثال: "vite --port 5173"
    command: process.env.CI
      ? "npm run build && npm run preview"
      : "npm run dev -- --port 5173",
    url: WEB_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },

  outputDir: "test-results/",
  expect: { timeout: 10_000 },
  globalTimeout: 60 * 60 * 1000,
});
