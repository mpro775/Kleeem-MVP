import { spawn } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";
import http from "node:http";
import puppeteer from "puppeteer";

const DIST = path.resolve("dist");
const PORT = 4173; // أي بورت فاضي
const ORIGIN = `http://localhost:${PORT}`;

// عدّل القائمة بالمسارات العامة فقط (بدون لوحات تحكم/مسارات خاصة)
const ROUTES = [
  "/", // الصفحة الرئيسية
  "/features",
  "/pricing",
  "/help",
  "/contact",
  // storefront العامة لو عندك صفحات ثابتة
  // '/store/demo',
];

// Helper: ابدأ سيرفر محلي يخدم dist
function serveDist() {
  // نستخدم "serve -s dist -l 4173"
  return spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["serve", "-s", "dist", "-l", String(PORT)],
    {
      stdio: "inherit",
    }
  );
}

// احفظ HTML كـ /dist/route/index.html
async function saveHtmlForRoute(route, html) {
  const outDir = path.join(DIST, route.replace(/^\//, ""), "/");
  const file = path.join(outDir, "index.html");
  await fs.ensureDir(outDir);
  await fs.writeFile(file, html, "utf8");
  console.log(`✔ saved ${file}`);
}

(async () => {
  // تأكد أن مجلد dist موجود (يعني شغّل vite build قبل هذا السكربت)
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist not found. Run "vite build" first.');
    process.exit(1);
  }

  // شغّل سيرفر ثابت لـ dist
  const server = serveDist();
  // انتظر السيرفر يشتغل
  await new Promise((res) => setTimeout(res, 1500));

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // مهم: User-Agent يشبه Googlebot (اختياري)
  await page.setUserAgent(
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  );

  // Prerender لكل Route
  for (const route of ROUTES) {
    const url = ORIGIN + route;
    console.log(`→ prerender: ${url}`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // انتظر أي تغييرات meta من SEOHead (CSR) تخلص
    await page.waitForTimeout(500); // لو تحتاج أكثر زوّدها

    // خذ الـ HTML النهائي (بما فيه <head> بعد useEffect)
    const html = await page.content();

    await saveHtmlForRoute(route, html);
  }

  await browser.close();

  // اقفل السيرفر
  server.kill("SIGTERM");
  console.log("🎉 Prerender done.");
})();
