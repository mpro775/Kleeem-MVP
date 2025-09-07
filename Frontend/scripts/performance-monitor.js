import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceMonitor {
  constructor() {
    this.resultsDir = path.resolve(process.cwd(), 'test-performance');
    this.resultsFile = path.resolve(process.cwd(), 'test-results.json');
    if (!fs.existsSync(this.resultsDir)) fs.mkdirSync(this.resultsDir, { recursive: true });
    this.baseline = this.loadBaseline();
  }

  vitestBin() {
    const localBin = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest');
    if (fs.existsSync(localBin)) return `"${localBin}"`;
    // fallback إلى npx عبر shell (آمن على ويندوز)
    return 'npx vitest';
  }

  jestBin() {
    const localBin = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'jest.cmd' : 'jest');
    if (fs.existsSync(localBin)) return `"${localBin}"`;
    return 'npx jest';
  }

  detectRunner() {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
    const hasVitest = pkg.devDependencies?.vitest || pkg.dependencies?.vitest;
    const hasJest   = pkg.devDependencies?.jest   || pkg.dependencies?.jest;
    return { hasVitest, hasJest };
  }

  buildCommand() {
    const { hasVitest, hasJest } = this.detectRunner();
    const out = this.resultsFile.replace(/\\/g, '/');

    if (hasVitest) {
      // تشغيل لمرة واحدة + ريبورتر JSON + ملف مخرجات + pool=forks + no-color
      const bin = this.vitestBin();
      return `${bin} run --pool=forks --reporter=json --outputFile="${out}" --no-color`;
    }

    if (hasJest) {
      // يحتاج ريبورتر JSON مضاف في إعداداتك (jest-json-reporter أو ما شابهه)
      const bin = this.jestBin();
      return `${bin} --ci --reporters=default --reporters=jest-json-reporter --no-color`;
    }

    // آخر حل: سكربت المشروع، وسنضيف --run لو كان Vitest
    return `npm run test -- --run`;
  }

  runCmdShell(cmd, opts = {}) {
    // تنفيذ عبر shell لتفادي EINVAL مع npx.cmd على ويندوز
    return execSync(cmd, {
      ...opts,
      shell: true,                 // <-- مهم على ويندوز
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
      timeout: 300000,             // 5 دقائق
      maxBuffer: 16 * 1024 * 1024, // 16MB
      stdio: 'pipe',
    });
  }

  tryWriteResultsFromStdout(stdout) {
    if (!stdout) return;
    const s = String(stdout).trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a !== -1 && b !== -1 && b > a) {
      const maybe = s.slice(a, b + 1);
      try {
        const parsed = JSON.parse(maybe);
        fs.writeFileSync(this.resultsFile, JSON.stringify(parsed, null, 2));
        console.log('📝 تم استخراج JSON من stdout وكتابته في test-results.json');
      } catch { /* تجاهل */ }
    }
  }

  async runTests() {
    console.log('🧪 تشغيل الاختبارات...');
    const start = Date.now();
    const cmd = this.buildCommand();

    try {
      // 1) تشغيل مع اظهار حي للمخرجات في الطرفية
      //   - سنفصلها لخطوتين: أولاً بعرض مباشر ثم (إن لزم) إعادة تشغيل لالتقاط JSON
      // للعرض الحي، نستعمل execSync مع stdio=inherit عبر shell
      execSync(cmd, {
        shell: true,
        env: { ...process.env, CI: '1' },
        timeout: 300000,
        stdio: 'inherit',          // <-- ترى بالترمينال أي تحذيرات/اختبار عالق
      });

      // إن لم يُكتب ملف النتائج (بعض الإعدادات لا تكتب الملف رغم نجاح الخروج)
      if (!fs.existsSync(this.resultsFile)) {
        const out = this.runCmdShell(cmd, { stdio: 'pipe' });
        if (!fs.existsSync(this.resultsFile)) this.tryWriteResultsFromStdout(out);
      }

      if (!fs.existsSync(this.resultsFile)) {
        throw new Error('لم يتم توليد test-results.json. تأكد من reporter json وإزالة أي reporter مخصّص يتجاهل outputFile.');
      }

      console.log('✅ تم تشغيل الاختبارات (وانتهت العملية)');
      const totalTime = Date.now() - start;

      const analysis = this.analyzePerformance(totalTime);
      this.saveResults(analysis);
      this.generateReport(analysis);
      this.compareWithBaseline(analysis);
      return analysis;
    } catch (e) {
      console.error('❌ خطأ أثناء تشغيل الاختبارات:', e.message);

      // محاولة التقاط stdout مرة أخيرة لكتابة JSON
      try {
        const out = this.runCmdShell(cmd, { stdio: 'pipe' });
        if (!fs.existsSync(this.resultsFile)) this.tryWriteResultsFromStdout(out);
      } catch { /* تجاهل */ }

      if (fs.existsSync(this.resultsFile)) {
        const analysis = this.analyzePerformance(Date.now() - start);
        this.generateReport(analysis);
        return analysis;
      }
      throw e;
    }
  }

  parseTestTimes(results) {
    const list = [];
    const pushSuite = (obj, suiteName = '') => {
      if (!obj) return;
      if (Array.isArray(obj.tests)) {
        obj.tests.forEach((t) => {
          list.push({
            name: `${suiteName || obj.file || obj.name || 'suite'} > ${t.name || t.title || 'test'}`,
            duration: t.duration ?? t.time ?? 0,
            suite: suiteName || obj.file || obj.name || 'suite',
            status: t.result || t.state || t.status || 'unknown',
          });
        });
      }
      if (Array.isArray(obj.testResults)) {
        obj.testResults.forEach((t) => {
          if (Array.isArray(t.assertionResults)) {
            t.assertionResults.forEach((ar) => {
              list.push({
                name: `${t.name || suiteName || 'suite'} > ${ar.title || 'test'}`,
                duration: ar.duration ?? 0,
                suite: t.name || suiteName || 'suite',
                status: ar.status || 'unknown',
              });
            });
          } else {
            list.push({
              name: `${t.name || suiteName || 'suite'} > ${t.title || 'test'}`,
              duration: t.duration ?? t.time ?? 0,
              suite: t.name || suiteName || 'suite',
              status: t.status || 'unknown',
            });
          }
        });
      }
      if (Array.isArray(obj.suites)) obj.suites.forEach((s) => pushSuite(s, s.name || s.file || suiteName));
      if (Array.isArray(obj.children)) obj.children.forEach((c) => pushSuite(c, suiteName));
    };

    if (Array.isArray(results)) results.forEach((r) => pushSuite(r, r.name || r.file));
    else if (results) pushSuite(results, results.name || results.file);

    if (Array.isArray(results?.testResults) && list.length === 0) {
      results.testResults.forEach((suite) => {
        if (Array.isArray(suite.assertionResults)) {
          suite.assertionResults.forEach((test) => {
            list.push({
              name: `${suite.name} > ${test.title}`,
              duration: test.duration ?? 0,
              suite: suite.name,
              status: test.status,
            });
          });
        }
      });
    }
    return list;
  }

  analyzePerformance(totalTime) {
    let testTimes = [];
    try {
      if (fs.existsSync(this.resultsFile)) {
        const results = JSON.parse(fs.readFileSync(this.resultsFile, 'utf8'));
        testTimes = this.parseTestTimes(results);
      }
    } catch (e) {
      console.warn('⚠️ لا يمكن قراءة نتائج الاختبارات:', e.message);
    }

    const sorted = [...testTimes].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    const slow = sorted.filter((t) => (t.duration || 0) > 1000);
    const avg = testTimes.length
      ? Math.round(testTimes.reduce((s, t) => s + (t.duration || 0), 0) / testTimes.length)
      : 0;

    return {
      totalTests: testTimes.length,
      totalTime,
      averageTime: avg,
      slowTestsCount: slow.length,
      slowestTests: sorted.slice(0, 10),
      testDistribution: this.calculateTestDistribution(testTimes),
      performanceScore: this.calculatePerformanceScore(avg, slow.length),
      timestamp: new Date().toISOString(),
      recommendations: this.generateRecommendations(avg, slow.length, totalTime),
    };
  }

  calculateTestDistribution(testTimes) {
    const d = { fast: 0, medium: 0, slow: 0, verySlow: 0 };
    for (const t of testTimes) {
      const x = t.duration || 0;
      if (x < 100) d.fast++;
      else if (x < 500) d.medium++;
      else if (x < 1000) d.slow++;
      else d.verySlow++;
    }
    return d;
  }

  calculatePerformanceScore(averageTime, slowTestsCount) {
    let score = 100;
    if (averageTime > 500) score -= 20;
    if (averageTime > 1000) score -= 30;
    if (slowTestsCount > 5) score -= 15;
    if (slowTestsCount > 10) score -= 25;
    return Math.max(0, score);
  }

  generateRecommendations(averageTime, slowTestsCount, totalTime) {
    const tips = [];
    if (averageTime > 500) tips.push('⚡ متوسط وقت الاختبارات مرتفع (>500ms) - يحتاج تحسين');
    if (slowTestsCount > 5) tips.push('🐌 عدد الاختبارات البطيئة كبير (>5) - يحتاج تحسين');
    if (totalTime > 300000) tips.push('⏱️ الوقت الإجمالي طويل (>5 دقائق) - يحتاج تحسين');
    tips.push('🔧 تأكد من إغلاق أي HTTP server/Timers/DB connections في afterAll/afterEach.');
    tips.push('🔧 جرّب: CI=1 npx vitest run --pool=forks --reporter=verbose --no-color لاكتشاف الاختبار العالق.');
    return tips;
  }

  saveResults(a) {
    const filename = `test-performance-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(a, null, 2));
    console.log(`💾 تم حفظ النتائج في: ${filepath}`);
    const dashboardPath = path.join(this.resultsDir, 'dashboard-data.json');
    let data = [];
    try { if (fs.existsSync(dashboardPath)) data = JSON.parse(fs.readFileSync(dashboardPath, 'utf8')); } catch {}
    data.push({ timestamp: a.timestamp, totalTime: a.totalTime, averageTime: a.averageTime, performanceScore: a.performanceScore });
    fs.writeFileSync(dashboardPath, JSON.stringify(data, null, 2));
  }

  createMarkdownReport(a) {
    const date = new Date().toLocaleDateString('ar-SA');
    return `# 📊 تقرير أداء الاختبارات - ${date}

## 📈 الإحصائيات
- **إجمالي الاختبارات:** ${a.totalTests}
- **الوقت الإجمالي:** ${a.totalTime}ms (${(a.totalTime / 1000).toFixed(1)}s)
- **متوسط وقت الاختبار:** ${a.averageTime}ms
- **عدد الاختبارات البطيئة:** ${a.slowTestsCount}
- **درجة الأداء:** ${a.performanceScore}/100

## 📊 توزيع الاختبارات
- ⚡ سريع (<100ms): ${a.testDistribution.fast}
- 🟡 متوسط (100-500ms): ${a.testDistribution.medium}
- 🟠 بطيء (500-1000ms): ${a.testDistribution.slow}
- 🔴 بطيء جداً (>1000ms): ${a.testDistribution.verySlow}

## 🐌 أبطأ 10 اختبارات
${a.slowestTests.map((t, i) => `${i + 1}. **${t.name}**: ${t.duration}ms`).join('\n')}

## 🎯 التوصيات
${a.recommendations.map((r) => `- ${r}`).join('\n')}

## 📅 التاريخ
${a.timestamp}

---
*تم إنشاء هذا التقرير بواسطة نظام مراقبة الأداء الآلي* ⚡
`;
  }

  generateReport(a) {
    const md = this.createMarkdownReport(a);
    const file = path.join(this.resultsDir, `PERFORMANCE_REPORT_${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(file, md);
    console.log(`📊 تم إنشاء تقرير الأداء: ${file}`);
    this.displaySummary(a);
  }

  displaySummary(a) {
    console.log('\n📊 ملخص الأداء:');
    console.log(`- إجمالي الاختبارات: ${a.totalTests}`);
    console.log(`- الوقت الإجمالي: ${(a.totalTime / 1000).toFixed(1)}s`);
    console.log(`- متوسط وقت الاختبار: ${a.averageTime}ms`);
    console.log(`- الاختبارات البطيئة: ${a.slowTestsCount}`);
    console.log(`- درجة الأداء: ${a.performanceScore}/100`);
    if (a.slowestTests.length) {
      console.log('\n🐌 أبطأ الاختبارات:');
      a.slowestTests.slice(0, 3).forEach((t, i) => console.log(`  ${i + 1}. ${t.name}: ${t.duration}ms`));
    }
    console.log('\n🎯 التوصيات:');
    a.recommendations.forEach((r) => console.log(`  - ${r}`));
  }

  compareWithBaseline(a) {
    if (!this.baseline) {
      console.log('📝 لا يوجد baseline للمقارنة');
      return;
    }
    const pct = (x, b) => (b ? (((x - b) / b) * 100).toFixed(1) : '0.0');
    const timeChange = pct(a.totalTime, this.baseline.totalTime);
    const avgChange  = pct(a.averageTime, this.baseline.averageTime);
    console.log('\n📈 مقارنة مع Baseline:');
    console.log(`- الوقت الإجمالي: ${parseFloat(timeChange) > 0 ? '+' : ''}${timeChange}%`);
    console.log(`- متوسط الوقت: ${parseFloat(avgChange) > 0 ? '+' : ''}${avgChange}%`);
    if (parseFloat(timeChange) > 20) console.log('⚠️ تحذير: الأداء تدهور بشكل كبير!');
    else if (parseFloat(timeChange) < -20) console.log('🎉 ممتاز: الأداء تحسن بشكل كبير!');
  }

  loadBaseline() {
    try {
      const p = path.join(this.resultsDir, 'baseline.json');
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      console.warn('⚠️ لا يمكن تحميل baseline:', e.message);
    }
    return null;
  }

  setBaseline() {
    this.runTests()
      .then((a) => {
        const p = path.join(this.resultsDir, 'baseline.json');
        fs.writeFileSync(p, JSON.stringify(a, null, 2));
        console.log('✅ تم تعيين baseline جديد');
      })
      .catch(console.error);
  }
}

const monitor = new PerformanceMonitor();
const command = process.argv[2];
if (command === 'baseline') monitor.setBaseline();
else monitor.runTests().catch(console.error);

export default PerformanceMonitor;
