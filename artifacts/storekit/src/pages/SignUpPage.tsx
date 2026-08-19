import { SignUp } from "@clerk/react";
import Layout from "@/components/Layout";
import { AuthUnavailableState } from "@/components/AuthGuard";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export default function SignUpPage() {
  if (!clerkEnabled) return <AuthUnavailableState />;

  return (
    <Layout noFooter>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-light" style={{ fontFamily: "var(--font-display)" }}>
              Create Account
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Join to unlock exclusive access and order tracking</p>
          </div>
          <SignUp
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-border bg-card rounded-none p-8",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-border rounded-none text-sm py-3 hover:bg-muted",
                formButtonPrimary: "bg-foreground text-background rounded-none text-xs tracking-[0.15em] uppercase py-3 hover:bg-foreground/80",
                formFieldInput: "border-border rounded-none text-sm focus:ring-1 focus:ring-foreground",
                footerActionLink: "text-accent hover:text-accent/80",
              },
            }}
          />
        </div>
      </div>
    </Layout>
  );
}
