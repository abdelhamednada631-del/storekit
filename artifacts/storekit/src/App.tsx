import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { pageVariants } from "@/lib/animations";
import NewsletterPopup from "@/components/NewsletterPopup";
import BackToTop from "@/components/BackToTop";
const NotFound = lazy(() => import("@/pages/not-found"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const CollectionsPage = lazy(() => import("@/pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("@/pages/CollectionDetailPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("@/pages/OrderConfirmationPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const AccountOrdersPage = lazy(() => import("@/pages/AccountOrdersPage"));
const AccountWishlistPage = lazy(() => import("@/pages/AccountWishlistPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const LookbookPage = lazy(() => import("@/pages/LookbookPage"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("@/pages/admin/AdminProductsPage"));
const AdminProductFormPage = lazy(() => import("@/pages/admin/AdminProductFormPage"));
const AdminCollectionsPage = lazy(() => import("@/pages/admin/AdminCollectionsPage"));
const AdminCollectionFormPage = lazy(() => import("@/pages/admin/AdminCollectionFormPage"));
const AdminOrdersPage = lazy(() => import("@/pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("@/pages/admin/AdminOrderDetailPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminContentPage = lazy(() => import("@/pages/admin/AdminContentPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminLookbookPage = lazy(() => import("@/pages/admin/AdminLookbookPage"));
const AdminLookbookFormPage = lazy(() => import("@/pages/admin/AdminLookbookFormPage"));
const AdminPromoCodesPage = lazy(() => import("@/pages/admin/AdminPromoCodesPage"));
const AdminReviewsPage = lazy(() => import("@/pages/admin/AdminReviewsPage"));
const AdminStockAlertsPage = lazy(() => import("@/pages/admin/AdminStockAlertsPage"));
import CartDrawer from "@/components/CartDrawer";
import QuickViewModal from "@/components/QuickViewModal";
import CompareBar from "@/components/CompareBar";
import CompareModal from "@/components/CompareModal";

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function AnimatedRoutes() {
  const [location] = useLocation();
  const routeKey = location.split("/").slice(0, 2).join("/") || "/";
  const isAdmin = location.startsWith("/admin");

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={routeKey}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ minHeight: "100vh" }}
        >
          <Suspense fallback={<RouteFallback />}>
            <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/collections" component={CollectionsPage} />
            <Route path="/collections/:slug" component={CollectionDetailPage} />
            <Route path="/products/:slug" component={ProductDetailPage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={CheckoutPage} />
            <Route path="/order-confirmation/:id" component={OrderConfirmationPage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/account" component={AccountPage} />
            <Route path="/account/orders" component={AccountOrdersPage} />
            <Route path="/account/wishlist" component={AccountWishlistPage} />
            <Route path="/lookbook" component={LookbookPage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/sign-up" component={SignUpPage} />
            <Route path="/admin/login" component={AdminLoginPage} />
            <Route path="/admin" component={AdminDashboardPage} />
            <Route path="/admin/products" component={AdminProductsPage} />
            <Route path="/admin/products/new" component={AdminProductFormPage} />
            <Route path="/admin/products/:id/edit" component={AdminProductFormPage} />
            <Route path="/admin/collections" component={AdminCollectionsPage} />
            <Route path="/admin/collections/new" component={AdminCollectionFormPage} />
            <Route path="/admin/collections/:id/edit" component={AdminCollectionFormPage} />
            <Route path="/admin/orders" component={AdminOrdersPage} />
            <Route path="/admin/orders/:id" component={AdminOrderDetailPage} />
            <Route path="/admin/settings" component={AdminSettingsPage} />
            <Route path="/admin/lookbook" component={AdminLookbookPage} />
            <Route path="/admin/lookbook/new" component={AdminLookbookFormPage} />
            <Route path="/admin/lookbook/:id/edit" component={AdminLookbookFormPage} />
            <Route path="/admin/content" component={AdminContentPage} />
            <Route path="/admin/analytics" component={AdminAnalyticsPage} />
            <Route path="/admin/promo-codes" component={AdminPromoCodesPage} />
            <Route path="/admin/reviews" component={AdminReviewsPage} />
            <Route path="/admin/stock-alerts" component={AdminStockAlertsPage} />
            <Route component={NotFound} />
            </Switch>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Global UI — only outside admin */}
      {!isAdmin && <NewsletterPopup />}
      <BackToTop />
    </>
  );
}

function ClerkAwareRouter() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""}
      routerPush={(to) => setLocation(to)}
      routerReplace={(to) => setLocation(to, { replace: true })}
    >
      <AnimatedRoutes />
      <CartDrawer />
      <QuickViewModal />
      <CompareBar />
      <CompareModal />
    </ClerkProvider>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ClerkAwareRouter />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;
