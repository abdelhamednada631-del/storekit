import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { RedirectToSignIn, useUser } from "@clerk/react";
import Layout from "@/components/Layout";

interface AuthGuardProps {
  children: React.ReactNode;
}

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export function AuthUnavailableState() {
  const { t } = useTranslation();

  return (
    <Layout noFooter>
      <div className="min-h-[70vh] flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-xl border border-border bg-card px-6 py-12 text-center sm:px-12">
          <p className="mb-4 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            StoreKit
          </p>
          <h1
            className="font-display text-3xl font-light sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("account.authUnavailable")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            {t("account.authUnavailableDescription")}
          </p>
          <Link
            href="/collections"
            className="mt-8 inline-flex min-h-11 items-center justify-center bg-foreground px-7 py-3 text-xs uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-80"
          >
            {t("account.backToStore")}
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function ClerkAuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
}

export function AuthGuard({ children }: AuthGuardProps) {
  if (!clerkEnabled) {
    return <AuthUnavailableState />;
  }

  return <ClerkAuthGuard>{children}</ClerkAuthGuard>;
}
