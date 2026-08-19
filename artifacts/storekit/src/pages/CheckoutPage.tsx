import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import Layout from "@/components/Layout";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";
import { useCreateOrder, useCreatePaymentIntent } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StripePaymentForm from "@/components/checkout/StripePaymentForm";
import TestPaymentForm from "@/components/checkout/TestPaymentForm";
import { useTranslation } from "react-i18next";



interface ShippingForm {
  fullName: string; email: string; phone: string;
  line1: string; line2: string; city: string;
  state: string; postalCode: string; country: string;
}

interface AppConfig {
  stripePublishableKey: string | null;
  stripeEnabled: boolean;
}

// Fetched once and cached here (module-level)
let stripePromiseCache: ReturnType<typeof loadStripe> | null = null;
const GUEST_ID_KEY = "sk-guest-id";

function getGuestUserId(): string {
  if (typeof window === "undefined") return "guest-server";
  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const generated = `guest-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  window.localStorage.setItem(GUEST_ID_KEY, generated);
  return generated;
}

function CheckoutContent() {
  const { t } = useTranslation();
  const steps = [t("checkout.shipping"), t("checkout.review"), t("checkout.payment")];
  const [step, setStep] = useState(0);
  const [shipping, setShipping] = useState<ShippingForm>({
    fullName: "", email: "", phone: "", line1: "", line2: "",
    city: "", state: "", postalCode: "", country: "US",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const { items, clearCart } = useCartStore();
  const { user } = useUser();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [guestUserId] = useState(getGuestUserId);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createOrder = useCreateOrder();
  const createPaymentIntent = useCreatePaymentIntent();

  const shippingCost = subtotal >= 10000 ? 0 : 999;
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + shippingCost + tax;

  // Load app config once on mount
  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then((cfg: AppConfig) => {
        setAppConfig(cfg);
        if (cfg.stripeEnabled && cfg.stripePublishableKey && !stripePromiseCache) {
          stripePromiseCache = loadStripe(cfg.stripePublishableKey);
        }
      })
      .catch(() => setAppConfig({ stripeEnabled: false, stripePublishableKey: null }));
  }, []);

  function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shipping.fullName || !shipping.line1 || !shipping.city || !shipping.postalCode) {
      toast({ title: t("checkout.requiredFields"), variant: "destructive" });
      return;
    }
    setStep(1);
  }

  // When entering payment step: create a payment intent to get clientSecret
  async function handleContinueToPayment() {
    setIsSubmitting(true);
    try {
      const result = await createPaymentIntent.mutateAsync({
        data: { amount: total, currency: "usd" },
      });
      const data = result as any;
      setClientSecret(data.clientSecret ?? null);
      setPaymentIntentId(data.paymentIntentId ?? "pi_mock");
      setStep(2);
    } catch {
      toast({ title: t("checkout.paymentInitError"), description: t("checkout.pleaseTryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function placeOrder(confirmedPaymentIntentId: string) {
    setIsCreatingOrder(true);
    try {
      const orderResult = await createOrder.mutateAsync({
        data: {
          userId: user?.id ?? guestUserId,
          items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
          shippingAddress: {
            fullName: shipping.fullName,
            line1: shipping.line1,
            line2: shipping.line2 || undefined,
            city: shipping.city,
            state: shipping.state,
            postalCode: shipping.postalCode,
            country: shipping.country,
            phone: shipping.phone,
          },
          stripePaymentIntentId: confirmedPaymentIntentId,
        },
      });
      clearCart();
      setLocation(`/order-confirmation/${(orderResult as any).id}`);
    } catch {
      toast({ title: t("checkout.orderFailed"), description: t("checkout.pleaseTryAgain"), variant: "destructive" });
      setIsCreatingOrder(false);
    }
  }

  async function handleTestPayment() {
    await placeOrder(paymentIntentId ?? "pi_test");
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <p className="font-display text-3xl font-light text-muted-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
            {t("cart.empty")}
          </p>
          <a href="/collections" className="inline-block bg-foreground text-background px-8 py-4 text-xs tracking-[0.2em] uppercase">
            {t("checkout.shopNow")}
          </a>
        </div>
      </Layout>
    );
  }

  const stripeEnabled = appConfig?.stripeEnabled && !!stripePromiseCache && !!clientSecret;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl font-light mb-10"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("checkout.title")}
        </motion.h1>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-12">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-0">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 text-xs tracking-[0.15em] uppercase transition-colors ${
                  i === step ? "text-foreground font-medium"
                  : i < step ? "text-accent cursor-pointer"
                  : "text-muted-foreground"
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-colors ${
                  i === step ? "bg-foreground text-background border-foreground"
                  : i < step ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground"
                }`}>
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </button>
              {i < steps.length - 1 && <div className="w-12 h-px bg-border mx-3" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">

              {/* ── Step 0: Shipping ── */}
              {step === 0 && (
                <motion.form
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleShippingSubmit}
                  className="space-y-4"
                >
                  <h2 className="font-medium tracking-wide mb-6">{t("checkout.shippingAddress")}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label>{t("checkout.fullName")} *</Label>
                      <Input value={shipping.fullName} onChange={e => setShipping(s => ({ ...s, fullName: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("checkout.email")}</Label>
                      <Input type="email" value={shipping.email} onChange={e => setShipping(s => ({ ...s, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("checkout.phone")}</Label>
                      <Input value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>{t("checkout.address")} *</Label>
                      <Input value={shipping.line1} onChange={e => setShipping(s => ({ ...s, line1: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>{t("checkout.apartment")}</Label>
                      <Input value={shipping.line2} onChange={e => setShipping(s => ({ ...s, line2: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("checkout.city")} *</Label>
                      <Input value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("checkout.state")}</Label>
                      <Input value={shipping.state} onChange={e => setShipping(s => ({ ...s, state: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("checkout.postalCode")} *</Label>
                      <Input value={shipping.postalCode} onChange={e => setShipping(s => ({ ...s, postalCode: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("checkout.country")}</Label>
                      <Input value={shipping.country} onChange={e => setShipping(s => ({ ...s, country: e.target.value }))} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 w-full bg-foreground text-background py-4 text-xs tracking-[0.2em] uppercase hover:bg-foreground/80 transition-colors mt-6"
                  >
                    {t("checkout.continueReview")} <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.form>
              )}

              {/* ── Step 1: Review ── */}
              {step === 1 && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="font-medium tracking-wide mb-6">{t("checkout.reviewOrder")}</h2>
                  <div className="space-y-4 mb-8">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b border-border">
                        <div className="w-16 h-20 bg-muted flex-shrink-0 overflow-hidden">
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted p-5 mb-6 text-sm space-y-1">
                    <p className="font-medium mb-2">{t("checkout.shippingTo")}</p>
                    <p>{shipping.fullName}</p>
                    <p>{shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ""}</p>
                    <p>{shipping.city}, {shipping.state} {shipping.postalCode}</p>
                    <p>{shipping.country}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(0)}
                      className="flex items-center gap-2 px-6 py-4 border border-border text-xs tracking-[0.15em] uppercase hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> {t("checkout.back")}
                    </button>
                    <button
                      onClick={handleContinueToPayment}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background py-4 text-xs tracking-[0.2em] uppercase hover:bg-foreground/80 transition-colors disabled:opacity-60"
                    >
                      {isSubmitting
                        ? <><span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />{t("checkout.preparingPayment")}</>
                        : <>{t("checkout.continuePayment")} <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Payment ── */}
              {step === 2 && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                >
                  {stripeEnabled ? (
                    <Elements
                      stripe={stripePromiseCache!}
                      options={{
                        clientSecret: clientSecret!,
                        appearance: {
                          theme: "stripe",
                          variables: {
                            colorPrimary: "#0f0f0f",
                            colorBackground: "#ffffff",
                            fontFamily: "inherit",
                            borderRadius: "2px",
                          },
                        },
                      }}
                    >
                      <StripePaymentForm
                        onSuccess={placeOrder}
                        onBack={() => setStep(1)}
                        total={total}
                        formatPrice={formatPrice}
                        isCreatingOrder={isCreatingOrder}
                      />
                    </Elements>
                  ) : (
                    <TestPaymentForm
                      onSubmit={handleTestPayment}
                      onBack={() => setStep(1)}
                      total={total}
                      formatPrice={formatPrice}
                      isSubmitting={isCreatingOrder}
                    />
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── Order Summary ── */}
          <div className="bg-card border border-border p-6 h-fit">
            <h3 className="text-sm font-medium tracking-[0.1em] uppercase mb-5">{t("checkout.summary")}</h3>
            <div className="space-y-3 text-sm mb-5 pb-5 border-b border-border">
              {items.slice(0, 3).map(item => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">{item.productName} ×{item.quantity}</span>
                  <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-muted-foreground">+{items.length - 3} {t("checkout.moreItems")}</p>
              )}
            </div>
            <div className="space-y-2.5 text-sm mb-5 pb-5 border-b border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span>{shippingCost === 0 ? t("cart.free") : formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.tax")}</span>
                <span>{formatPrice(tax)}</span>
              </div>
            </div>
            <div className="flex justify-between font-medium text-sm">
              <span>{t("cart.total")}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}
