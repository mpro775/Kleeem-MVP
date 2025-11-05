# 📘 دليل التحويل الشامل من React إلى Next.js

## نظرة عامة

هذا الدليل المرجعي الشامل لتحويل مشروع **Kleeem** من React (Vite) إلى Next.js 16 مع الحفاظ على جميع الميزات وإضافة:
- ✨ نظام الترجمة (عربي/إنجليزي)
- 🌓 نظام الثيمات (فاتح/داكن)
- 🚀 Server-Side Rendering
- 📱 تحسينات الأداء

---

## 📊 حالة المشروع

### ✅ ما تم إنجازه (60%)

#### البنية الأساسية
- [x] Next.js 16 + App Router
- [x] نظام الترجمة (next-intl)
- [x] نظام الثيم (Light/Dark + RTL)
- [x] Authentication Middleware
- [x] MUI Integration مع RTL
- [x] React Query
- [x] Sentry Integration
- [x] TypeScript Configuration

#### صفحات Auth (100%)
- [x] Login Page
- [x] Signup Page
- [x] Verify Email Page
- [x] Forgot Password Page
- [x] Reset Password Page

#### صفحات Merchant Dashboard (70%)
- [x] Dashboard Home Page
- [x] Analytics Page (كاملة)
- [x] Categories Page (كاملة)
- [x] Channels Page (كاملة)
- [x] Conversations Page (كاملة)
- [x] Knowledge Page (كاملة)
- [x] Leads Page (كاملة)
- [x] Orders Page (كاملة)
- [x] Products Page (كاملة)
- [x] Prompt Studio Page
- [x] Settings Page

#### صفحات Admin (30%)
- [x] Admin Dashboard
- [x] Prompts Page
- [x] Templates Page
- [x] Users Page

#### صفحات Public (40%)
- [x] Home Page (جزئي)
- [x] Contact Page
- [x] Chat Page
- [x] Store Page (جزئي)

---

## ❌ ما يجب نقله (40%)

### 🔴 المرحلة 1: أولوية عالية (Critical)

#### 1. Onboarding Flow ⭐⭐⭐
**الملفات المطلوبة:**
```
Frontend/src/pages/onboarding/
  ├── OnboardingPage.tsx
  ├── SourceSelectPage.tsx
  └── SyncPage.tsx

Frontend/src/features/onboarding/
  ├── api.ts
  └── constants.ts

Frontend/src/app/layout/
  └── OnboardingLayout.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(onboarding)/
  ├── layout.tsx (جديد)
  ├── onboarding/page.tsx
  ├── source-select/page.tsx
  └── sync/page.tsx

frontend-next/src/features/onboarding/
  ├── api.ts
  ├── types.ts
  └── components/
```

**التعديلات المطلوبة:**
- إضافة `'use client';`
- تغيير `useNavigate` إلى `useRouter`
- إضافة الترجمة `useTranslations('onboarding')`
- تحديث المسارات

---

#### 2. Store/Storefront Features ⭐⭐⭐
**الملفات المطلوبة:**

**A. Store Pages:**
```
Frontend/src/pages/store/
  ├── AboutPage.tsx
  ├── MyOrdersPage.tsx
  ├── OrderDetailsPage.tsx
  ├── ProductDetailsPage.tsx
  └── StorePage.tsx
```

**B. Store Features:**
```
Frontend/src/features/store/
  ├── about/
  │   ├── api.ts
  │   ├── type.ts
  │   ├── hooks/useAboutData.ts
  │   └── ui/
  │       ├── AboutHero.tsx
  │       ├── AboutSkeleton.tsx
  │       ├── ContactCard.tsx
  │       ├── HoursCard.tsx
  │       └── PoliciesSection.tsx
  ├── home/
  │   ├── api.ts
  │   ├── types.ts
  │   ├── hooks/
  │   │   ├── useKleemWidget.ts
  │   │   ├── useNoIndexWhenDemo.ts
  │   │   └── useStoreData.ts
  │   └── ui/
  │       ├── BannerCarousel.tsx
  │       ├── ControlsBar.tsx
  │       ├── CustomerInfoDialog.tsx
  │       ├── FloatingCartButton.tsx
  │       ├── MobileFiltersDrawer.tsx
  │       ├── OffersSection.tsx
  │       └── SidebarCategories.tsx
  ├── order/
  │   ├── api.ts
  │   ├── hooks/useOrderDetails.ts
  │   └── ui/
  │       ├── CustomerInfoCard.tsx
  │       ├── ItemsList.tsx
  │       ├── OrderDetailsSkeleton.tsx
  │       ├── OrderHeader.tsx
  │       ├── OrderInfoCard.tsx
  │       ├── StatusTimeline.tsx
  │       └── SummaryCard.tsx
  ├── product/
  │   ├── api.ts
  │   ├── hooks/useProductDetails.ts
  │   └── ui/
  │       ├── ActionBar.tsx
  │       ├── AttributesSection.tsx
  │       ├── DetailsTabs.tsx
  │       ├── Gallery.tsx
  │       ├── PriceSection.tsx
  │       ├── QuantityPicker.tsx
  │       └── RelatedSkeleton.tsx
  └── ui/
      ├── BannersEditor.tsx
      ├── CartDialog.tsx ⭐ مهم جداً
      ├── CategoryFilter.tsx
      ├── CustomerInfoForm.tsx
      ├── Footer.tsx
      ├── LiteIdentityCard.tsx
      ├── ProductCard.tsx
      ├── ProductGrid.tsx
      ├── StoreHeader.tsx
      └── StoreNavbar.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/store/
  ├── [slug]/
  │   ├── page.tsx (تحسين)
  │   ├── about/page.tsx (جديد)
  │   ├── my-orders/page.tsx (جديد)
  │   ├── order/[orderId]/page.tsx (جديد)
  │   └── product/[idOrSlug]/page.tsx (تحسين)

frontend-next/src/features/store/
  ├── about/
  ├── home/
  ├── order/
  ├── product/
  └── components/
```

---

#### 3. Cart System (Context) ⭐⭐⭐
**الملف المطلوب:**
```
Frontend/src/context/CartContext.tsx
```

**الوجهة:**
```
frontend-next/src/contexts/CartContext.tsx
```

**التعديلات المطلوبة:**
- إضافة `'use client';`
- تحديث localStorage للتوافق مع Next.js
- إضافة Provider في layout

---

#### 4. AuthContext (إعادة بناء) ⭐⭐⭐
**الملف المطلوب:**
```
Frontend/src/context/AuthContext.tsx
```

**الوجهة:**
```
frontend-next/src/contexts/AuthContext.tsx
```

**ملاحظة:** يحتاج إعادة بناء ليتوافق مع Next.js Server/Client Components

**الخطوات:**
1. فصل Client State من Server Actions
2. استخدام cookies بدلاً من localStorage للـ tokens
3. إنشاء Server Actions للـ Auth
4. استخدام Context للـ Client State فقط

---

#### 5. Error System ⭐⭐
**الملفات المطلوبة:**
```
Frontend/src/shared/errors/
  ├── AppError.ts
  ├── ErrorBoundary.tsx
  ├── ErrorDebugPanel.tsx
  ├── ErrorFallback.tsx
  ├── ErrorLogger.ts
  ├── ErrorToast.tsx
  ├── fieldErrorHelpers.ts
  ├── GlobalErrorProvider.tsx
  ├── hooks.ts
  ├── NetworkErrorHandler.tsx
  ├── SentryIntegration.ts
  ├── useErrorHandler.ts
  └── index.ts
```

**الوجهة:**
```
frontend-next/src/lib/errors/
```

**ملاحظة:** يمكن تبسيط النظام مؤقتاً واستخدام `useSnackbar` فقط

---

### 🟡 المرحلة 2: أولوية متوسطة (Important)

#### 6. Landing Page Sections ⭐⭐
**الملفات المطلوبة:**
```
Frontend/src/features/landing/sections/
  ├── ComparisonSection.tsx
  ├── DemoSection.tsx
  ├── FAQSection.tsx
  ├── KaleemLogoGsap.tsx
  ├── StorefrontSection.tsx
  ├── Testimonials.tsx
  ├── WhyChooseKaleem.tsx
  ├── InviteBanner.tsx
  └── WaitlistSection.tsx

Frontend/src/features/landing/ui/
  ├── Navbar.tsx (نسخة متطورة)
  ├── Footer.tsx (نسخة متطورة)
  ├── GooeyNav.tsx + GooeyNav.css
  ├── StarBorder.tsx + StarBorder.css
  ├── FeatureCard.tsx
  ├── IntegrationCard.tsx
  ├── TestimonialCard.tsx
  └── CookieConsent.tsx

Frontend/src/features/landing/data/
  ├── comparisonData.tsx
  ├── faqData.ts
  ├── featuresData.tsx
  ├── integrationsData.tsx
  ├── pricingData.ts
  └── testimonialsData.ts

Frontend/src/features/landing/hooks/
  ├── useCarousel.ts
  ├── useComparisonAnimation.ts
  ├── useFaqAnimation.ts
  ├── useFeatureCarousel.ts
  ├── useKaleemLogoAnimation.ts
  ├── usePricingAnimation.ts
  ├── useStaggeredAnimation.ts
  ├── useStepsAnimation.ts
  └── useStorefrontAnimation.ts
```

**الوجهة:**
```
frontend-next/src/components/features/landing/
```

---

#### 7. Live Chat Feature ⭐⭐
**الملفات المطلوبة:**
```
Frontend/src/features/landing/chatKaleem/
  ├── chatService.ts
  ├── constants.ts
  ├── types.ts
  ├── LiveChat.tsx
  ├── hooks/
  │   ├── hooks.ts
  │   ├── useChatAnimation.ts
  │   └── useLiveChat.ts
  └── ui/
      ├── ChatBubble.tsx
      ├── ChatHeader.tsx
      └── ChatInput.tsx
```

**الوجهة:**
```
frontend-next/src/features/landing/live-chat/
```

---

#### 8. Contact Page Features ⭐
**الملفات المطلوبة:**
```
Frontend/src/features/landing/contact/
  ├── api/
  │   ├── supportApi.ts
  │   └── supportApi.test.ts
  ├── types.ts
  └── ui/
      ├── ContactForm.tsx
      ├── ContactInfo.tsx
      ├── ContactMethodCard.tsx
      └── FaqAccordion.tsx
```

**الوجهة:**
```
frontend-next/src/features/contact/
```

---

#### 9. Merchant Pages - الصفحات الناقصة ⭐⭐
**الملفات المطلوبة:**

**A. Instructions Page:**
```
Frontend/src/pages/merchant/InstructionsPage.tsx
Frontend/src/features/mechant/instructions/
  ├── api.ts
  ├── hooks/useInstructions.ts
  ├── type.ts
  └── ui/
      ├── InstructionEditDialog.tsx
      └── InstructionsTable.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/instructions/page.tsx
frontend-next/src/features/merchant/instructions/
```

---

**B. Chat Settings Page:**
```
Frontend/src/pages/merchant/ChatSettingsPage.tsx
Frontend/src/features/mechant/widget-config/
  ├── api.ts
  ├── model.ts
  ├── types.ts
  ├── utils.ts
  └── ui/
      ├── GeneralTab.tsx
      ├── AppearanceTab.tsx
      ├── BehaviorTab.tsx
      ├── MessagesTab.tsx
      ├── AdvancedTab.tsx
      ├── ColorPickerField.tsx
      ├── FontSelector.tsx
      └── PreviewPanel.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/chat-settings/page.tsx
frontend-next/src/features/merchant/widget-config/
```

---

**C. Settings Advanced Page:**
```
Frontend/src/pages/merchant/SettingsAdvancedPage.tsx
Frontend/src/features/mechant/settings-advanced/
  ├── api.ts
  ├── hooks/useSettings.ts
  ├── types.ts
  └── ui/
      ├── ProfileSection.tsx
      └── SecuritySection.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/settings-advanced/page.tsx
frontend-next/src/features/merchant/settings-advanced/
```

---

**D. Banners Management Page:**
```
Frontend/src/pages/merchant/BannersManagementPage.tsx
(يستخدم BannersEditor من store/ui/)
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/banners/page.tsx
```

---

**E. Storefront Theme Page:**
```
Frontend/src/pages/merchant/StorefrontThemePage.tsx
Frontend/src/features/mechant/storefront-theme/
  ├── api.ts
  ├── hooks.ts
  ├── type.ts
  ├── utils.ts
  └── ui/
      ├── ColorCustomizer.tsx
      ├── FontCustomizer.tsx
      ├── LayoutCustomizer.tsx
      ├── LogoUploader.tsx
      ├── PreviewFrame.tsx
      ├── ThemePresets.tsx
      ├── ThemeSaveDialog.tsx
      └── ThemeTemplates.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/storefront-theme/page.tsx
frontend-next/src/features/merchant/storefront-theme/
```

---

**F. Support Center Page:**
```
Frontend/src/pages/merchant/SupportCenterPage.tsx
Frontend/src/features/mechant/support/
  ├── api.ts
  ├── types.ts
  ├── hooks/useSupportForm.ts
  └── ui/
      ├── SupportForm.tsx
      ├── SupportCategories.tsx
      ├── FaqSection.tsx
      └── ContactSupport.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/support/page.tsx
frontend-next/src/features/merchant/support/
```

---

**G. Missing Responses Page:**
```
Frontend/src/pages/merchant/MissingResponsesPage.tsx
Frontend/src/features/mechant/MissingResponses/
  ├── api.ts
  ├── type.ts
  └── ui/
      ├── MissingResponsesTable.tsx
      └── ResponseDialog.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/missing-responses/page.tsx
frontend-next/src/features/merchant/missing-responses/
```

---

**H. Merchant Settings Page:**
```
Frontend/src/pages/merchant/MerchantSettingsPage.tsx
Frontend/src/features/mechant/merchant-settings/
  ├── api.ts
  ├── sections.ts
  ├── types.ts
  ├── utils.ts
  ├── utils/slug.ts
  └── ui/
      ├── AddressForm.tsx
      ├── GeneralInfoForm.tsx
      ├── LogoUploader.tsx
      ├── PoliciesForm.tsx
      ├── SocialLinksEditor.tsx
      ├── SocialLinksSection.tsx
      └── WorkingHoursForm.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(merchant)/dashboard/merchant-settings/page.tsx
frontend-next/src/features/merchant/merchant-settings/
```

---

**I. Dashboard Components (إضافية):**
```
Frontend/src/features/mechant/dashboard/ui/
  ├── ChecklistPanel.tsx
  ├── DashboardAdvice.tsx
  └── DashboardHeader.tsx
```

**الوجهة:**
```
frontend-next/src/features/merchant/dashboard/components/
```

---

#### 10. Admin Pages - الصفحات الناقصة ⭐⭐

**A. Conversations Page:**
```
Frontend/src/pages/admin/kleem/ConversationsPage.tsx
Frontend/src/pages/admin/kleem/ConversationView.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(admin)/admin/kleem/conversations/page.tsx
frontend-next/src/app/[locale]/(admin)/admin/kleem/conversations/[sessionId]/page.tsx
```

---

**B. Knowledge Base Page:**
```
Frontend/src/pages/admin/kleem/KnowledgeBasePage.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(admin)/admin/kleem/knowledge-base/page.tsx
```

---

**C. Chat Settings Page:**
```
Frontend/src/pages/admin/kleem/ChatSettingsPage.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(admin)/admin/kleem/chat-settings/page.tsx
```

---

**D. Missing Responses Page:**
```
Frontend/src/pages/admin/kleem/KleemMissingResponsesPage.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(admin)/admin/kleem/missing-responses/page.tsx
```

---

**E. Ratings Page:**
```
Frontend/src/pages/admin/kleem/KleemRatingsPage.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(admin)/admin/kleem/ratings/page.tsx
```

---

**F. Analytics Page:**
```
Frontend/src/pages/admin/kleem/AnalyticsPage.tsx
```

**الوجهة:**
```
frontend-next/src/app/[locale]/(admin)/admin/kleem/analytics/page.tsx
```

---

**G. Admin API:**
```
Frontend/src/features/admin/api/
  ├── adminAnalytics.ts
  ├── adminKleem.ts
  └── adminKleemRatings.ts

Frontend/src/features/admin/realtime/
  └── adminFeed.ts
```

**الوجهة:**
```
frontend-next/src/features/admin/api/
frontend-next/src/features/admin/realtime/
```

---

### 🟢 المرحلة 3: أولوية منخفضة (Nice to Have)

#### 11. SEO Components ⭐
**الملفات المطلوبة:**
```
Frontend/src/features/landing/seo/
  ├── JsonLd.tsx
  ├── PageSEO.tsx
  ├── ProductSEO.tsx
  └── SEOHead.tsx
```

**الوجهة:**
```
frontend-next/src/components/seo/
```

**ملاحظة:** Next.js لديه نظام Metadata مدمج، قد لا نحتاج كل هذه المكونات

---

#### 12. Shared Utilities ⭐
**الملفات المطلوبة:**
```
Frontend/src/shared/utils/
  ├── (8 ملفات إضافية غير المنقولة)

Frontend/src/shared/ui/
  ├── (10 مكونات)

Frontend/src/shared/hooks/
  ├── useAdminNotifications.ts
  ├── useChatWebSocket.ts
  └── useStoreServicesFlag.ts
```

**الوجهة:**
```
frontend-next/src/lib/utils/
frontend-next/src/components/shared/
frontend-next/src/lib/hooks/
```

---

#### 13. Assets ⭐
**الملفات المطلوبة:**
```
Frontend/src/assets/
  ├── bg-shape.png
  ├── empty-chat.png
  ├── hero-image.png
  ├── hero.webp
  ├── hero2.webp
  ├── kaleem.svg
  ├── kaleem2.svg
  ├── logo.png
  ├── Salla.svg
  ├── Shopify.svg
  ├── Vector.png
  ├── Vector2.png
  ├── WooCommerce.svg
  └── Zid.svg
```

**الوجهة:**
```
frontend-next/public/assets/
```

---

#### 14. Monitoring & Performance
**الملفات المطلوبة:**
```
Frontend/src/monitor/
  └── web-vitals.ts

Frontend/src/otel.ts
```

**الوجهة:**
```
frontend-next/src/lib/monitoring/
```

**ملاحظة:** Next.js لديه Web Vitals مدمج

---

## 🔄 دليل التعديلات القياسية

### التغييرات الأساسية لكل ملف

#### 1. إضافة 'use client' للمكونات التفاعلية
```typescript
// أول سطر في الملف
'use client';
```

**متى تحتاجه:**
- أي component يستخدم hooks (useState, useEffect, etc.)
- أي component يستخدم event handlers
- أي component يستخدم browser APIs

**متى لا تحتاجه:**
- Server Components (افتراضي في Next.js)
- API routes
- Metadata exports

---

#### 2. تغيير Navigation
```typescript
// ❌ القديم (React Router)
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
navigate(-1); // back

// ✅ الجديد (Next.js)
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/ar/dashboard'); // مع اللغة
router.back(); // back
router.refresh(); // reload data
```

---

#### 3. إضافة الترجمة
```typescript
// ✅ الجديد
import { useTranslations } from 'next-intl';

const t = useTranslations('namespace'); // مثل: 'products', 'auth', 'common'

// استخدام
<Typography>{t('title')}</Typography>
<Button>{t('buttons.add')}</Button>
```

**إنشاء ملفات الترجمة:**
```
frontend-next/src/messages/ar/namespace.json
frontend-next/src/messages/en/namespace.json
```

---

#### 4. تغيير المسارات
```typescript
// ❌ القديم
import { X } from '@/features/mechant/...';
import { Y } from '@/shared/...';

// ✅ الجديد
import { X } from '@/features/merchant/...'; // تصحيح الإملاء
import { Y } from '@/lib/...'; // أو @/components/shared/
```

**تصحيحات شائعة:**
- `mechant` → `merchant`
- `type.ts` → `types.ts`
- `ui/` → `components/`
- `@/shared/` → `@/lib/` أو `@/components/shared/`

---

#### 5. تغيير Error Handling (مؤقت)
```typescript
// ❌ القديم
import { useErrorHandler } from '@/shared/errors';

const { handleError } = useErrorHandler();
handleError(error);

// ✅ الجديد (مؤقت)
import { useSnackbar } from 'notistack';

const { enqueueSnackbar } = useSnackbar();
enqueueSnackbar(error.message || 'حدث خطأ', { variant: 'error' });
```

---

#### 6. تغيير Auth (مؤقت)
```typescript
// ❌ القديم
import { useAuth } from '@/context/hooks';

const { user } = useAuth();
const merchantId = user?.merchantId;

// ✅ الجديد (مؤقت حتى يتم بناء AuthContext)
function useMerchantId(): string {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user?.merchantId || '';
      } catch {
        return '';
      }
    }
  }
  return '';
}

const merchantId = useMerchantId();
```

---

#### 7. Params في Next.js 15+
```typescript
// ✅ Next.js 15+ (async params)
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  // ...
}

// أو في Client Component
'use client';

import { use } from 'react';

export default function ClientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  // ...
}
```

---

#### 8. إضافة locale للمسارات
```typescript
// ❌ القديم
router.push('/dashboard/products');

// ✅ الجديد
import { useParams } from 'next/navigation';

const params = useParams();
const locale = params.locale as string;

router.push(`/${locale}/dashboard/products`);

// أو استخدم helper
function useLocalizedRouter() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  return {
    push: (path: string) => router.push(`/${locale}${path}`),
    replace: (path: string) => router.replace(`/${locale}${path}`),
    back: () => router.back(),
  };
}
```

---

## 📝 أمثلة عملية كاملة

### مثال 1: نقل صفحة Instructions

#### الخطوة 1: نسخ الملف الأساسي
```bash
# القديم
Frontend/src/pages/merchant/InstructionsPage.tsx

# الجديد
frontend-next/src/app/[locale]/(merchant)/dashboard/instructions/page.tsx
```

#### الخطوة 2: نسخ الـ Feature
```bash
# نسخ المجلد كامل
Frontend/src/features/mechant/instructions/
  ↓
frontend-next/src/features/merchant/instructions/
```

#### الخطوة 3: التعديلات

**في `page.tsx`:**
```typescript
'use client'; // ⬅️ إضافة

import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  TablePagination,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import { useTranslations } from 'next-intl'; // ⬅️ إضافة
import { useSnackbar } from 'notistack'; // ⬅️ إضافة

import { useInstructions } from '@/features/merchant/instructions/hooks/useInstructions'; // ⬅️ تصحيح
import { InstructionsTable } from '@/features/merchant/instructions/components/InstructionsTable'; // ⬅️ تغيير ui → components
import { InstructionEditDialog } from '@/features/merchant/instructions/components/InstructionEditDialog'; // ⬅️ تغيير

export default function InstructionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const t = useTranslations('instructions'); // ⬅️ إضافة
  const { enqueueSnackbar } = useSnackbar(); // ⬅️ إضافة

  const {
    rows,
    totalRows,
    page,
    limit,
    activeFilter,
    editDialogOpen,
    editingInstruction,
    setPage,
    setLimit,
    setActiveFilter,
    setEditDialogOpen,
    handleOpenNew,
    handleOpenEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
    handleOpenSuggest,
  } = useInstructions();

  return (
    <Box p={isMobile ? 2 : 3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h5" fontWeight={700}>
          {t('title')} {/* ⬅️ تغيير */}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<BoltIcon />}
            variant="outlined"
            onClick={handleOpenSuggest}
          >
            {t('buttons.suggestions')} {/* ⬅️ تغيير */}
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleOpenNew}
          >
            {t('buttons.add')} {/* ⬅️ تغيير */}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          select
          label={t('filters.status')} {/* ⬅️ تغيير */}
          value={activeFilter}
          onChange={(e) =>
            setActiveFilter(e.target.value as 'all' | 'true' | 'false')
          }
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">{t('filters.all')}</MenuItem>
          <MenuItem value="true">{t('filters.active')}</MenuItem>
          <MenuItem value="false">{t('filters.inactive')}</MenuItem>
        </TextField>
      </Paper>

      <InstructionsTable
        instructions={rows}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
      />

      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={limit}
        onRowsPerPageChange={(e) => setLimit(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
      />

      <InstructionEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSave}
        instruction={editingInstruction}
      />
    </Box>
  );
}
```

#### الخطوة 4: إنشاء ملف الترجمة

**`frontend-next/src/messages/ar/instructions.json`:**
```json
{
  "title": "التوجيهات",
  "buttons": {
    "add": "إضافة توجيه",
    "suggestions": "اقتراحات"
  },
  "filters": {
    "status": "الحالة",
    "all": "الكل",
    "active": "مفعّل",
    "inactive": "غير مفعّل"
  }
}
```

**`frontend-next/src/messages/en/instructions.json`:**
```json
{
  "title": "Instructions",
  "buttons": {
    "add": "Add Instruction",
    "suggestions": "Suggestions"
  },
  "filters": {
    "status": "Status",
    "all": "All",
    "active": "Active",
    "inactive": "Inactive"
  }
}
```

#### الخطوة 5: تحديث الـ Feature Files

**في `api.ts` - لا يحتاج تغيير تقريباً:**
```typescript
// فقط تصحيح المسارات إذا لزم
import axios from '@/lib/axios'; // بدلاً من @/shared/api/axios
```

**في `hooks/useInstructions.ts`:**
```typescript
'use client'; // ⬅️ إضافة

import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack'; // ⬅️ بدلاً من useErrorHandler
// ... باقي الـ imports

export function useInstructions() {
  const { enqueueSnackbar } = useSnackbar(); // ⬅️ تغيير
  
  // ... باقي الكود
  
  // تغيير error handling
  try {
    // ...
  } catch (error) {
    enqueueSnackbar(error.message || 'حدث خطأ', { variant: 'error' });
  }
}
```

**في `components/` (كانت `ui/`):**
```typescript
'use client'; // ⬅️ إضافة في كل ملف

// تصحيح المسارات
import { X } from '@/features/merchant/...'; // تصحيح mechant → merchant
```

---

### مثال 2: نقل Store Feature

#### نقل ProductDetailsPage

**الخطوة 1:**
```bash
Frontend/src/pages/store/ProductDetailsPage.tsx
  ↓
frontend-next/src/app/[locale]/store/[slug]/product/[idOrSlug]/page.tsx
```

**الخطوة 2: التعديلات**
```typescript
'use client';

import { use } from 'react'; // ⬅️ لـ async params
import { useParams } from 'next/navigation';
// ... imports

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; idOrSlug: string; locale: string }>;
}) {
  const { slug, idOrSlug, locale } = use(params); // ⬅️ استخدام use()
  
  // ... باقي الكود
}
```

---

## 🔧 إعداد الترجمة

### 1. إنشاء ملفات الترجمة

**البنية:**
```
frontend-next/src/messages/
├── ar/
│   ├── common.json       ← مشترك
│   ├── auth.json         ← صفحات Auth
│   ├── dashboard.json    ← Dashboard
│   ├── products.json     ← Products
│   ├── orders.json       ← Orders
│   ├── ... (إلخ)
└── en/
    ├── common.json
    ├── auth.json
    └── ...
```

### 2. تحديث i18n.ts

**`frontend-next/src/i18n.ts`:**
```typescript
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // تحميل جميع الـ namespaces
  const messages = {
    ...(await import(`./messages/${locale}/common.json`)).default,
    ...(await import(`./messages/${locale}/auth.json`)).default,
    ...(await import(`./messages/${locale}/dashboard.json`)).default,
    // ... إضافة المزيد حسب الحاجة
  };

  return {
    locale,
    messages,
    timeZone: 'Asia/Riyadh',
    now: new Date(),
  };
});
```

**أو بطريقة أفضل (Lazy Loading):**
```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}/common.json`)).default,
    timeZone: 'Asia/Riyadh',
    now: new Date(),
  };
});
```

ثم في كل صفحة، استخدم namespace محدد:
```typescript
const t = useTranslations('products'); // يحمل products.json
```

---

## 📦 خطة التنفيذ المفصلة

### الأسبوع الأول: الأساسيات والبنية التحتية

#### اليوم 1-2: AuthContext وError System
**المهام:**
- [ ] إعادة بناء AuthContext للتوافق مع Next.js
- [ ] إنشاء Server Actions للـ Auth
- [ ] نقل أو تبسيط Error System
- [ ] اختبار Auth Flow

**الملفات:**
```
✅ frontend-next/src/contexts/AuthContext.tsx
✅ frontend-next/src/lib/actions/auth.ts
✅ frontend-next/src/lib/errors/ (مبسط)
```

---

#### اليوم 3: Shared Utilities
**المهام:**
- [ ] نقل shared/utils
- [ ] نقل shared/ui components
- [ ] نقل shared/hooks
- [ ] اختبار المكونات

**الملفات:**
```
✅ frontend-next/src/lib/utils/
✅ frontend-next/src/components/shared/
✅ frontend-next/src/lib/hooks/
```

---

#### اليوم 4-5: CartContext
**المهام:**
- [ ] نقل CartContext
- [ ] تحديث localStorage logic
- [ ] إضافة Provider في layout
- [ ] اختبار Cart functionality

**الملفات:**
```
✅ frontend-next/src/contexts/CartContext.tsx
```

---

### الأسبوع الثاني: Store/Storefront Features

#### اليوم 1-2: Store Components والـ UI
**المهام:**
- [ ] نقل store/ui components
  - [ ] CartDialog ⭐
  - [ ] ProductCard
  - [ ] ProductGrid
  - [ ] StoreHeader
  - [ ] StoreNavbar
  - [ ] Footer
  - [ ] باقي المكونات

**الملفات:**
```
✅ frontend-next/src/features/store/components/
```

---

#### اليوم 3: Store Home والـ API
**المهام:**
- [ ] نقل store/home feature
- [ ] تحديث StorePage
- [ ] نقل hooks
- [ ] اختبار Store Home

**الملفات:**
```
✅ frontend-next/src/features/store/home/
✅ frontend-next/src/app/[locale]/store/[slug]/page.tsx (تحسين)
```

---

#### اليوم 4: Product Details
**المهام:**
- [ ] نقل store/product feature
- [ ] تحديث ProductDetailsPage
- [ ] نقل جميع UI components
- [ ] اختبار Product Details

**الملفات:**
```
✅ frontend-next/src/features/store/product/
✅ frontend-next/src/app/[locale]/store/[slug]/product/[idOrSlug]/page.tsx
```

---

#### اليوم 5: Orders والـ About
**المهام:**
- [ ] نقل store/order feature
- [ ] إنشاء MyOrdersPage
- [ ] إنشاء OrderDetailsPage
- [ ] نقل store/about feature
- [ ] إنشاء AboutPage

**الملفات:**
```
✅ frontend-next/src/features/store/order/
✅ frontend-next/src/features/store/about/
✅ frontend-next/src/app/[locale]/store/[slug]/my-orders/page.tsx
✅ frontend-next/src/app/[locale]/store/[slug]/order/[orderId]/page.tsx
✅ frontend-next/src/app/[locale]/store/[slug]/about/page.tsx
```

---

### الأسبوع الثالث: Onboarding وMerchant Pages

#### اليوم 1: Onboarding Flow
**المهام:**
- [ ] نقل onboarding feature
- [ ] إنشاء OnboardingLayout
- [ ] إنشاء الصفحات الثلاث
- [ ] اختبار Flow كامل

**الملفات:**
```
✅ frontend-next/src/features/onboarding/
✅ frontend-next/src/app/[locale]/(onboarding)/
```

---

#### اليوم 2: Merchant - Instructions والـ Settings
**المهام:**
- [ ] نقل instructions feature → InstructionsPage
- [ ] نقل settings-advanced feature → SettingsAdvancedPage
- [ ] اختبار

**الملفات:**
```
✅ frontend-next/src/features/merchant/instructions/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/instructions/page.tsx
✅ frontend-next/src/features/merchant/settings-advanced/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/settings-advanced/page.tsx
```

---

#### اليوم 3: Merchant - Widget والـ Theme
**المهام:**
- [ ] نقل widget-config feature → ChatSettingsPage
- [ ] نقل storefront-theme feature → StorefrontThemePage
- [ ] اختبار

**الملفات:**
```
✅ frontend-next/src/features/merchant/widget-config/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/chat-settings/page.tsx
✅ frontend-next/src/features/merchant/storefront-theme/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/storefront-theme/page.tsx
```

---

#### اليوم 4: Merchant - Banners والـ Support
**المهام:**
- [ ] إنشاء BannersManagementPage
- [ ] نقل support feature → SupportCenterPage
- [ ] نقل MissingResponses → MissingResponsesPage
- [ ] اختبار

**الملفات:**
```
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/banners/page.tsx
✅ frontend-next/src/features/merchant/support/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/support/page.tsx
✅ frontend-next/src/features/merchant/missing-responses/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/missing-responses/page.tsx
```

---

#### اليوم 5: Merchant - Merchant Settings والـ Dashboard Components
**المهام:**
- [ ] نقل merchant-settings feature
- [ ] نقل dashboard components الإضافية
- [ ] تحديث Dashboard Home
- [ ] اختبار

**الملفات:**
```
✅ frontend-next/src/features/merchant/merchant-settings/
✅ frontend-next/src/app/[locale]/(merchant)/dashboard/merchant-settings/page.tsx
✅ frontend-next/src/features/merchant/dashboard/components/
```

---

### الأسبوع الرابع: Admin Pages والـ Landing

#### اليوم 1-2: Admin Pages
**المهام:**
- [ ] نقل Admin Conversations
- [ ] نقل Admin Knowledge Base
- [ ] نقل Admin Chat Settings
- [ ] نقل Admin Missing Responses
- [ ] نقل Admin Ratings
- [ ] نقل Admin Analytics
- [ ] نقل Admin API
- [ ] اختبار جميع صفحات Admin

**الملفات:**
```
✅ frontend-next/src/app/[locale]/(admin)/admin/kleem/conversations/
✅ frontend-next/src/app/[locale]/(admin)/admin/kleem/knowledge-base/page.tsx
✅ frontend-next/src/app/[locale]/(admin)/admin/kleem/chat-settings/page.tsx
✅ frontend-next/src/app/[locale]/(admin)/admin/kleem/missing-responses/page.tsx
✅ frontend-next/src/app/[locale]/(admin)/admin/kleem/ratings/page.tsx
✅ frontend-next/src/app/[locale]/(admin)/admin/kleem/analytics/page.tsx
✅ frontend-next/src/features/admin/
```

---

#### اليوم 3: Landing Page Sections
**المهام:**
- [ ] نقل جميع sections الناقصة
- [ ] نقل data files
- [ ] نقل animation hooks
- [ ] تحديث Home Page
- [ ] اختبار Landing Page

**الملفات:**
```
✅ frontend-next/src/components/features/landing/
✅ frontend-next/src/lib/data/landing/
✅ frontend-next/src/lib/hooks/animations/
```

---

#### اليوم 4: Landing Page UI والـ Live Chat
**المهام:**
- [ ] نقل UI components (Navbar, Footer, etc.)
- [ ] نقل Live Chat feature
- [ ] نقل Contact page features
- [ ] اختبار

**الملفات:**
```
✅ frontend-next/src/components/features/landing/ui/
✅ frontend-next/src/features/landing/live-chat/
✅ frontend-next/src/features/contact/
```

---

#### اليوم 5: التحسينات النهائية
**المهام:**
- [ ] نقل SEO Components
- [ ] نقل Assets
- [ ] إضافة Monitoring (اختياري)
- [ ] مراجعة شاملة
- [ ] اختبار شامل
- [ ] تحديث الترجمات المفقودة

---

## ✅ Checklist التحقق النهائي

### البنية الأساسية
- [ ] جميع الصفحات تعمل بدون أخطاء
- [ ] الترجمة تعمل (عربي/إنجليزي)
- [ ] الثيم يعمل (فاتح/داكن)
- [ ] RTL يعمل بشكل صحيح
- [ ] Navigation يعمل بشكل صحيح

### Auth & Security
- [ ] Login يعمل
- [ ] Signup يعمل
- [ ] Logout يعمل
- [ ] Protected Routes تعمل
- [ ] Role-based Access يعمل
- [ ] Token Refresh يعمل

### Merchant Features
- [ ] Dashboard
- [ ] Analytics
- [ ] Products
- [ ] Categories
- [ ] Orders
- [ ] Conversations
- [ ] Knowledge Base
- [ ] Leads
- [ ] Channels
- [ ] Prompt Studio
- [ ] Instructions
- [ ] Chat Settings
- [ ] Settings Advanced
- [ ] Banners
- [ ] Storefront Theme
- [ ] Support Center
- [ ] Missing Responses
- [ ] Merchant Settings

### Admin Features
- [ ] Admin Dashboard
- [ ] Admin Conversations
- [ ] Admin Knowledge Base
- [ ] Admin Prompts
- [ ] Admin Templates
- [ ] Admin Users
- [ ] Admin Chat Settings
- [ ] Admin Missing Responses
- [ ] Admin Ratings
- [ ] Admin Analytics

### Store Features
- [ ] Store Home
- [ ] Product Details
- [ ] Cart
- [ ] About Page
- [ ] My Orders
- [ ] Order Details

### Onboarding
- [ ] Onboarding Page
- [ ] Source Select
- [ ] Sync Page

### Landing Page
- [ ] Hero Section
- [ ] Features Section
- [ ] How It Works
- [ ] Integrations
- [ ] Pricing
- [ ] CTA
- [ ] Comparison
- [ ] Demo
- [ ] FAQ
- [ ] Testimonials
- [ ] Live Chat

### Performance
- [ ] Images optimized
- [ ] Code splitting
- [ ] Lazy loading
- [ ] No console errors
- [ ] No memory leaks

---

## 🐛 مشاكل شائعة وحلولها

### 1. "use client" مفقودة
**المشكلة:**
```
Error: You're importing a component that needs useState. This only works in a Client Component...
```

**الحل:**
```typescript
'use client'; // أضف في أول الملف
```

---

### 2. async params في Next.js 15+
**المشكلة:**
```
Type 'Promise<{ slug: string }>' is not assignable to type '{ slug: string }'
```

**الحل:**
```typescript
// استخدم use() من React
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // ...
}
```

---

### 3. localStorage في Server Component
**المشكلة:**
```
ReferenceError: localStorage is not defined
```

**الحل:**
```typescript
// تأكد من استخدام 'use client'
'use client';

// أو تحقق من window
if (typeof window !== 'undefined') {
  localStorage.setItem(...);
}
```

---

### 4. Hydration Mismatch
**المشكلة:**
```
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**الحل:**
```typescript
// استخدم suppressHydrationWarning
<html suppressHydrationWarning>

// أو استخدم useEffect لتأخير الـ render
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;
```

---

### 5. Module not found: @/...
**المشكلة:**
```
Module not found: Can't resolve '@/features/mechant/...'
```

**الحل:**
- تحقق من `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
- تحقق من الإملاء: `mechant` → `merchant`

---

## 📚 موارد إضافية

### Next.js Documentation
- [App Router](https://nextjs.org/docs/app)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Server & Client Components](https://nextjs.org/docs/app/building-your-application/rendering)

### next-intl
- [Documentation](https://next-intl-docs.vercel.app/)
- [Examples](https://github.com/amannn/next-intl/tree/main/examples)

### MUI with Next.js
- [MUI Next.js Guide](https://mui.com/material-ui/guides/next-js-app-router/)
- [RTL Support](https://mui.com/material-ui/customization/right-to-left/)

---

## 📊 التقدم والإحصائيات

### حالة التحويل
```
الإجمالي: 100%
├── منجز: 60%
├── قيد العمل: 0%
└── متبقي: 40%
```

### تفصيل حسب الميزة
```
Auth Pages:           ████████████████████ 100%
Merchant Dashboard:   ██████████████░░░░░░  70%
Admin Pages:          ██████░░░░░░░░░░░░░░  30%
Store/Storefront:     ██████░░░░░░░░░░░░░░  30%
Landing Page:         ████████░░░░░░░░░░░░  40%
Onboarding:           ░░░░░░░░░░░░░░░░░░░░   0%
Shared/Utils:         ██████████░░░░░░░░░░  50%
```

### عدد الملفات
```
إجمالي الملفات: ~500 ملف
├── تم نقلها: ~300 ملف
└── متبقي: ~200 ملف
```

---

## 🎯 الخلاصة

هذا الدليل يغطي **جميع جوانب التحويل** من React إلى Next.js. 

### الخطوات الرئيسية:
1. ✅ نقل الملفات مع التعديلات البسيطة (أسرع 10x من البناء من جديد)
2. ✅ إضافة `'use client'` للمكونات التفاعلية
3. ✅ تحديث Navigation
4. ✅ إضافة الترجمة
5. ✅ تصحيح المسارات
6. ✅ اختبار كل ميزة

### الوقت المتوقع:
- **بالنسخ والتعديل:** 2-3 أسابيع
- **بالبناء من جديد:** 2-3 أشهر

---

**🚀 ابدأ الآن وحظاً موفقاً!**

---

_آخر تحديث: 2025-01-05_
_الإصدار: 1.0.0_

