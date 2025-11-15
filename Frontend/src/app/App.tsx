// src/app/App.tsx
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import GlobalGradients from "./GlobalGradients";
import InstructionsPage from "@/pages/merchant/InstructionsPage";
import ContactPage from "@/pages/public/Contact";
import ProductDetailsPageWithCart from "@/pages/store/ProductDetailsPage";
// === Public ===
const Home = lazy(() => import("@/pages/public/Home"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("@/pages/auth/SignUpPage"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const ErrorTestPage = lazy(() => import("@/pages/ErrorTestPage"));

// Storefront (public)
const StorePage = lazy(() => import("@/pages/store/StorePage"));
const OrderDetailsPage = lazy(() => import("@/pages/store/OrderDetailsPage"));

const AboutPage = lazy(() => import("@/pages/store/AboutPage"));
const MyOrdersPage = lazy(() => import("@/pages/store/MyOrdersPage"));
// Onboarding
const OnboardingPage = lazy(() => import("@/pages/onboarding/OnboardingPage"));
const SourceSelectPage = lazy(
  () => import("@/pages/onboarding/SourceSelectPage")
);
const SyncPage = lazy(() => import("@/pages/onboarding/SyncPage"));

// === Merchant (Dashboard) ===
const MerchantLayout = lazy(
  () => import("@/app/layout/merchant/MerchantLayout")
);
const HomeDashboard = lazy(() => import("@/pages/merchant/Dashboard"));
const ConversationsPage = lazy(
  () => import("@/pages/merchant/ConversationsPage")
);
const PromptStudio = lazy(() => import("@/pages/merchant/PromptStudio"));
const KnowledgePage = lazy(() => import("@/pages/merchant/KnowledgePage"));
const LeadsManagerPage = lazy(
  () => import("@/pages/merchant/LeadsManagerPage")
);
const PromotionsPage = lazy(() => import("@/pages/merchant/PromotionsPage"));
const SupportPage = lazy(() => import("@/pages/merchant/SupportCenterPage"));
const AccountSettingsPage = lazy(
  () => import("@/pages/merchant/SettingsAdvancedPage")
);
const ChatSettingsPage = lazy(
  () => import("@/pages/merchant/ChatSettingsPage")
);
const ProductsPage = lazy(() => import("@/pages/merchant/ProductsPage"));
const CategoriesPage = lazy(() => import("@/pages/merchant/CategoriesPage"));
const CouponsPage = lazy(() => import("@/pages/merchant/CouponsPage"));
const OrdersPage = lazy(() => import("@/pages/merchant/OrdersPage"));
const BannersManagementPage = lazy(
  () => import("@/pages/merchant/BannersManagementPage")
);
const ChannelsIntegrationPage = lazy(
  () => import("@/pages/merchant/ChannelsIntegrationPage")
);
const MerchantSettingsPage = lazy(
  () => import("@/pages/merchant/MerchantSettingsPage")
);
const StorefrontThemePage = lazy(
  () => import("@/pages/merchant/StorefrontThemePage")
);
const AnalyticsPage = lazy(() => import("@/pages/merchant/AnalyticsPage"));
const AnalyticsPageAdmin = lazy(
  () => import("@/pages/admin/kleem/AnalyticsPage")
);

// === Admin (Kleem) ===
const KleemAdminLayout = lazy(
  () => import("@/app/layout/merchant/MerchantLayout")
);
const KleemDashboard = lazy(() => import("@/pages/admin/kleem/Dashboard"));
const PromptsPage = lazy(() => import("@/pages/admin/kleem/PromptsPage"));
const KnowledgeBasePage = lazy(
  () => import("@/pages/admin/kleem/KnowledgeBasePage")
);
const ConversationsKleemPage = lazy(
  () => import("@/pages/admin/kleem/ConversationsPage")
);
const ConversationView = lazy(
  () => import("@/pages/admin/kleem/ConversationView")
);
const MissingResponsesPage = lazy(
  () => import("@/pages/merchant/MissingResponsesPage")
);
const ChatAdminSettingsPage = lazy(
  () => import("@/pages/admin/kleem/ChatSettingsPage")
);
const KleemMissingResponsesPage = lazy(
  () => import("@/pages/admin/kleem/KleemMissingResponsesPage")
);
const KleemRatingsPage = lazy(
  () => import("@/pages/admin/kleem/KleemRatingsPage")
);

export default function App() {
  return (
    <Box sx={{ overflowX: "hidden", maxWidth: "100vw", width: "100%" }}>
      <Suspense fallback={<div style={{ padding: 16 }}>جارِ التحميل…</div>}>
        <GlobalGradients />

        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/error-test" element={<ErrorTestPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Storefront */}
          <Route path="/chat/:slug" element={<ChatPage />} />
          <Route path="/store/:slug" element={<StorePage />} />
          <Route
            path="/store/:slug/order/:orderId"
            element={<OrderDetailsPage />}
          />
          <Route path="/store/:slug/my-orders" element={<MyOrdersPage />} />
          +{" "}
          <Route
            path="/store/:slug/product/:idOrSlug"
            element={<ProductDetailsPageWithCart />}
          />
          <Route path="/store/:slug/about" element={<AboutPage />} />
          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/source"
            element={
              <ProtectedRoute>
                <SourceSelectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/sync"
            element={
              <ProtectedRoute>
                <SyncPage />
              </ProtectedRoute>
            }
          />
          {/* Merchant Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MerchantLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeDashboard />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="prompt" element={<PromptStudio />} />
            <Route path="chatsetting" element={<ChatSettingsPage />} />
            <Route path="leads" element={<LeadsManagerPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="setting" element={<AccountSettingsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="banners" element={<BannersManagementPage />} />
            <Route path="channels" element={<ChannelsIntegrationPage />} />
            <Route path="marchinfo" element={<MerchantSettingsPage />} />
            <Route path="storefront-theme" element={<StorefrontThemePage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="instructions" element={<InstructionsPage />} />
            <Route
              path="missing-responses"
              element={<MissingResponsesPage />}
            />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
          {/* Admin (Kleem) */}
          <Route
            path="/admin/kleem"
            element={
              <RoleRoute allow={["ADMIN"]}>
                <KleemAdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<KleemDashboard />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="conversations" element={<ConversationsKleemPage />} />
            <Route
              path="conversations/:sessionId"
              element={<ConversationView />}
            />
            <Route path="chat-settings" element={<ChatAdminSettingsPage />} />
            <Route
              path="missing-responses"
              element={<KleemMissingResponsesPage />}
            />
            <Route path="ratings" element={<KleemRatingsPage />} />
            <Route path="analytics" element={<AnalyticsPageAdmin />} />
          </Route>
          {/* Optional legacy redirects */}
          <Route
            path="/admin/*"
            element={<Navigate to="/admin/kleem" replace />}
          />
        </Routes>
      </Suspense>
    </Box>
  );
}
