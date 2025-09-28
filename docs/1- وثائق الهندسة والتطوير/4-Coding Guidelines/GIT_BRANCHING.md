# Git Branching Strategy — Kaleem AI

> هدفنا تقليل وقت الدمج وتعقيد الفروع، ودعم الإصدارات السريعة مع مسار Hotfix واضح.

## 0) الملخص التنفيذي (TL;DR)
- **Backend**: `main` فقط (trunk-based) + `feat/*` قصيرة العمر
- **Frontend**: `main` فقط (trunk-based) + `feat/*` قصيرة العمر
- **Conventional Commits**: غير مطبق حالياً (commits حرة)
- **PR Reviews**: مطلوبة للـ main branch
- **CI/CD**: GitHub Actions (مستقبلي) + Docker deployment
- **Releases**: Manual tagging + Docker images
- **Hotfix**: مباشرة على main مع revert سريع

## 1) الاستراتيجية (الواقع الحقيقي)
- **Trunk-Based (محور رئيسي)** - العمل المباشر على `main`:
  - `main`: الفرع الرئيسي الوحيد، يحتوي على الكود المستقر
  - لا يوجد `develop` branch - كل شيء يتم على main
  - `feat/*`: فروع ميزات قصيرة العمر (1-3 أيام)
  - `fix/*`: فروع إصلاحات سريعة
  - لا يوجد `release/*` branches حالياً
  - `hotfix/*`: فروع إصلاحات حرجة (نادرة الاستخدام)
- **Monorepo**: Backend + Frontend في نفس الـ repository
- **Branch Protection**: مطلوب للـ main branch
- **No Direct Push**: لا يُسمح بالدفع المباشر للـ main

## 2) قواعد التطوير (الواقع الحقيقي)
- **فرع الميزة لا يعيش أكثر من 3–5 أيام**
- **دمج عبر PR مع مراجعة واحدة على الأقل**
- **Conventional Commits غير مطبق حالياً** (commits حرة)
- **Commit Messages**: وصفية ومفيدة (من الـ git log الحقيقي)
- **إصدار semver**: manual tagging عند الحاجة
- **No Feature Flags**: التطوير المباشر مع testing شامل

## 3) CI/CD Hooks (الواقع الحقيقي)
- **لا يوجد GitHub Actions حالياً** - CI/CD يدوي
- **Pre-commit Hooks**: `husky` + `lint-staged` (ESLint فقط)
- **حماية `main`**: branch protection rules (مستقبلي)
- **لا CI/CD آلي**: deployment يدوي عبر Docker
- **Testing Pipeline**: محلي فقط (npm scripts)
- **No Automated Releases**: manual tagging + Docker build

## 4) إطلاق الإصدارات (الواقع الحقيقي)
- **Manual Process**: لا يوجد automation حالياً
- **Docker Images**: build و push للـ registry
- **No Semantic Versioning**: version 0.0.1 في package.json
- **No CHANGELOG**: manual updates للـ docs
- **Git Tags**: manual tagging عند الحاجة
- **Hotfix**: مباشرة على main مع revert إذا لزم الأمر

## 5) الفروع حسب المكونات (Monorepo الحقيقي)
- **Monorepo Setup**: Backend + Frontend في نفس الـ repository
- **Feature Branches**: `feat/backend-auth`, `feat/frontend-dashboard`
- **Fix Branches**: `fix/backend-api-error`, `fix/frontend-ui-bug`
- **No Changesets/Nx**: manual coordination between Backend/Frontend
- **أسماء فروع واضحة**: `feat/products-pagination`, `fix/auth-jwt-expiry`
- **Scope-based**: `feat/backend/`, `feat/frontend/` للتمييز

## 6) أفضل الممارسات (الحالية)
- **Small PRs**: < 400 lines diff
- **Clear Titles**: وصفية ومفيدة
- **Linked Issues**: ربط بالـ GitHub issues
- **No WIP**: لا تدفع فروع غير مكتملة
- **Regular Cleanup**: حذف الفروع القديمة
- **No Long-lived Branches**: كل شيء يعود للـ main سريعاً

## 7) التوصيات المستقبلية
- **GitHub Actions**: إعداد CI/CD آلي
- **Conventional Commits**: تطبيق مع commitlint
- **Automated Releases**: semantic-release أو GitHub Actions
- **Branch Protection**: status checks + PR reviews
- **Code Owners**: auto-assignment للمراجعات
- **Release Notes**: automated CHANGELOG generation

