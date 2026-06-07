/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zodResolver";
import * as z from "zod";
import { Loader2, ArrowRight, ShieldCheck, Home, CheckCircle2, Download, Package } from "lucide-react";
import { auth, db, ref, get } from "@/lib/firebase";

/// Form validation schema
const checkoutSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 letters"),
  email: z.string().email("Please enter a valid email"),
  mobileNumber: z.string().min(10, "Please enter a valid 10-digit phone number").max(13),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// Helper functions declared outside components to satisfy react-hooks/purity linter checks
const generateGuestId = () => `guest_${Date.now()}`;
const getTimestamp = () => Date.now();

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { cart, subtotal, discountAmount, total, coupon, clearCart } = useCart();
  const { showToast } = useToast();
  
  const [paying, setPaying] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobileNumber: "",
    },
  });

  // Pre-fill profile details when available
  useEffect(() => {
    if (profile) {
      setValue("fullName", profile.name);
      setValue("email", profile.email);
    }
  }, [profile, setValue]);

  // Cart Protection: Only digital checkouts allowed
  useEffect(() => {
    if (!orderSuccess && cart.length === 0) {
      showToast("Your bag is empty.", "info");
      router.push("/cart");
    }
  }, [cart, orderSuccess, router, showToast]);

  const handleDownloadClick = async (productId: string, fileName: string, title: string) => {
    if (user) {
      try {
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) {
          showToast("Session expired. Please sign in again.", "error");
          return;
        }
        const url = `/api/download?productId=${productId}&token=${encodeURIComponent(token)}`;
        window.open(url, "_blank");
        showToast(`Initiating download for ${fileName}`, "success");
      } catch (err) {
        console.error(err);
        showToast("Download failed. Please try again.", "error");
      }
    } else {
      // Guest local download trigger via client Blob
      const fileContent = `Thank you for purchasing "${title}" from Prime Store!\n\nThis is your digital delivery for file: ${fileName}.\nLicense Type: Standard License\nPurchase Date: ${new Date().toLocaleDateString()}\nOrder Number: ${placedOrder?.orderNumber}\n\nFor any development queries, contact support@primestore.com.`;
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.endsWith(".zip") || fileName.endsWith(".fig") || fileName.endsWith(".pdf") ? fileName : `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${fileName} successfully!`, "success");
    }
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    setPaying(true);

    try {
      const guestUserId = user?.uid || generateGuestId();

      // 1. Call checkout creation endpoint
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          userName: data.fullName,
          email: data.email,
          mobileNumber: data.mobileNumber,
          userId: guestUserId,
          couponCode: coupon?.code,
        }),
      });

      const orderInfo = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(orderInfo.error || "Failed to create checkout order");
      }

      // 2. Handle mock payment option
      if (orderInfo.isMockPayment) {
        showToast("Processing mock payment...", "info");
        setTimeout(async () => {
          try {
            const mockPaymentId = `pay_mock_${Math.floor(100000 + Math.random() * 900000)}`;
            const verifyRes = await fetch("/api/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: orderInfo.orderId,
                razorpayPaymentId: mockPaymentId,
                razorpaySignature: "mock_signature",
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              showToast("Payment successful!", "success");
              
              try {
                const orderSnapshot = await get(ref(db, `orders/${orderInfo.orderId}`));
                if (orderSnapshot.exists()) {
                  setPlacedOrder(orderSnapshot.val());
                } else {
                  throw new Error("Order lookup failed");
                }
              } catch (dbErr) {
                const completedOrder = {
                  orderNumber: orderInfo.orderNumber,
                  id: orderInfo.orderId,
                  totalAmount: orderInfo.amount / 100,
                  type: cart.some(i => i.product.type === "physical") ? "mixed" : "digital",
                  userId: guestUserId,
                  email: data.email,
                  items: cart.map(item => ({
                    productId: item.product.id,
                    title: item.product.title,
                    price: item.product.price,
                    quantity: item.quantity,
                    type: item.product.type,
                    fileName: item.product.fileName || "product.zip",
                  })),
                  createdAt: getTimestamp(),
                };
                setPlacedOrder(completedOrder);
              }
              setOrderSuccess(true);
              clearCart();
            } else {
              showToast(verifyData.error || "Payment failed.", "error");
            }
          } catch (verifyError) {
            console.error(verifyError);
            showToast("Could not verify payment.", "error");
          } finally {
            setPaying(false);
          }
        }, 1500);
        return;
      }

      // 3. Load Razorpay script for real checkout
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        showToast("Payment gateway failed to load. Please check your connection.", "error");
        setPaying(false);
        return;
      }

      // 4. Open Razorpay checkout pop-up
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_Sq5pz3FrwtVkhg",
        amount: orderInfo.amount,
        currency: orderInfo.currency,
        name: "Prime Store",
        description: `Digital product checkout for: ${cart.map(i => i.product.title).join(", ")}`,
        order_id: orderInfo.orderId,
        handler: async function (response: any) {
          try {
            setPaying(true);
            showToast("Checking payment...", "info");
            
            // 5. Verify payment via backend API
            const verifyRes = await fetch("/api/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              showToast("Payment successful!", "success");
              
              try {
                const orderSnapshot = await get(ref(db, `orders/${response.razorpay_order_id}`));
                if (orderSnapshot.exists()) {
                  setPlacedOrder(orderSnapshot.val());
                } else {
                  throw new Error("Order lookup failed");
                }
              } catch (dbErr) {
                const completedOrder = {
                  orderNumber: orderInfo.orderNumber,
                  id: response.razorpay_order_id,
                  totalAmount: orderInfo.amount / 100,
                  type: cart.some(i => i.product.type === "physical") ? "mixed" : "digital",
                  userId: guestUserId,
                  email: data.email,
                  items: cart.map(item => ({
                    productId: item.product.id,
                    title: item.product.title,
                    price: item.product.price,
                    quantity: item.quantity,
                    type: item.product.type,
                    fileName: item.product.fileName || "product.zip",
                  })),
                  createdAt: getTimestamp(),
                };
                setPlacedOrder(completedOrder);
              }
              setOrderSuccess(true);
              clearCart();
            } else {
              showToast(verifyData.error || "Payment verification failed.", "error");
            }
          } catch (verifyError) {
            console.error(verifyError);
            showToast("Could not verify payment.", "error");
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: data.fullName,
          email: data.email,
          contact: data.mobileNumber,
        },
        theme: {
          color: "#09090b",
        },
        modal: {
          ondismiss: function () {
            showToast("Payment cancelled.", "info");
            setPaying(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      const err = error as Error;
      console.error(err);
      showToast(err.message || "Checkout initialization failed.", "error");
      setPaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-neutral-800">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white min-h-[80vh] text-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
          {orderSuccess ? (
            /* Premium Success Layout */
            <div className="max-w-2xl mx-auto py-12 px-6 border border-neutral-100 rounded-3xl bg-white shadow-premium text-center space-y-8 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-50 text-neutral-900 border border-neutral-100">
                <CheckCircle2 className="h-8 w-8 stroke-[2]" />
              </div>

              <div className="space-y-2">
                <h1 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight">Payment Successful!</h1>
                <p className="text-xs font-semibold text-neutral-400">Your downloads have been generated successfully below.</p>
              </div>

              {/* Order Info Card */}
              <div className="rounded-2xl bg-neutral-50/50 border border-neutral-100 p-6 text-left space-y-4">
                <div className="flex justify-between border-b border-neutral-100 pb-3 text-xs font-semibold">
                  <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Order Number:</span>
                  <span className="text-neutral-800">{placedOrder?.orderNumber}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-100 pb-3 text-xs font-semibold">
                  <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Payment ID:</span>
                  <span className="font-mono text-neutral-800">{placedOrder?.id}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Amount Paid:</span>
                  <span className="text-neutral-900 text-sm font-extrabold">{formatPrice(placedOrder?.totalAmount)}</span>
                </div>
              </div>

              {/* Secure Download Link section */}
              <div className="bg-neutral-50/50 border border-neutral-100 rounded-2xl p-5 text-left space-y-2.5">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Secure Download Reference</h4>
                <p className="text-[11px] font-medium text-neutral-400 leading-relaxed">
                  Keep this link safe to access your files or verify payments in the future:
                </p>
                {mounted && placedOrder && (
                  <Link
                    href={`/download/${placedOrder?.id}?guestId=${placedOrder?.userId}`}
                    className="block text-xs font-mono font-bold text-secondary hover:underline break-all"
                  >
                    {`${window.location.origin}/download/${placedOrder?.id}?guestId=${placedOrder?.userId}`}
                  </Link>
                )}
              </div>

              {/* Shipping Address (for Physical items) */}
              {placedOrder?.shippingAddress && (
                <div className="border border-neutral-100 bg-white rounded-3xl p-5 text-left space-y-3.5 shadow-card">
                  <h3 className="text-xs font-bold text-neutral-850 uppercase tracking-widest flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Delivery Destination
                  </h3>
                  <div className="text-xs space-y-1.5 text-neutral-500 font-semibold pt-1">
                    <p className="font-extrabold text-neutral-800">{placedOrder.shippingAddress.fullName}</p>
                    <p>{placedOrder.shippingAddress.houseName}, {placedOrder.shippingAddress.address}</p>
                    <p>{placedOrder.shippingAddress.city}, {placedOrder.shippingAddress.state} - {placedOrder.shippingAddress.pincode}</p>
                    <p>Phone: {placedOrder.shippingAddress.mobileNumber}</p>
                  </div>
                </div>
              )}

              {/* Download links (for Digital items) */}
              {placedOrder?.items?.some((item: any) => item.type !== "physical") && (
                <div className="border border-neutral-100 bg-white rounded-3xl p-5 text-left space-y-3.5 shadow-card">
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Download className="h-4 w-4" />
                    Your Assets
                  </h3>
                  <div className="space-y-2.5 pt-1">
                    {placedOrder.items
                      .filter((item: any) => item.type !== "physical")
                      .map((item: any) => (
                        <div key={item.productId} className="flex items-center justify-between bg-neutral-50/30 border border-neutral-100 p-3 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-neutral-800">{item.title}</p>
                            <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">License: Standard License</p>
                          </div>
                          <button
                            onClick={() => handleDownloadClick(item.productId, item.fileName || `${item.title.toLowerCase().replace(/\s+/g, "-")}-source.zip`, item.title)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Return to Storefront
                </Link>
              </div>
            </div>
          ) : (
            /* Premium Checkout Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Form fields */}
              <div className="lg:col-span-7 space-y-8">
                <div className="border-b border-neutral-100 pb-4">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5 font-sans">Verification gateway</span>
                  <h1 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight">Checkout</h1>
                  <p className="text-xs font-semibold text-neutral-400 mt-1">Provide your details to complete your order and download files.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-850 uppercase tracking-widest border-l-2 border-neutral-900 pl-2.5">Your Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Name</label>
                        <input
                          type="text"
                          {...register("fullName")}
                          className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-800 placeholder-neutral-400"
                          placeholder="John Doe"
                        />
                        {errors.fullName && <p className="mt-1 text-[10px] text-red-500 font-semibold">{errors.fullName.message}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Email</label>
                        <input
                          type="email"
                          {...register("email")}
                          className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-800 placeholder-neutral-400"
                          placeholder="johndoe@example.com"
                        />
                        {errors.email && <p className="mt-1 text-[10px] text-red-500 font-semibold">{errors.email.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        {...register("mobileNumber")}
                        className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-800 placeholder-neutral-400"
                        placeholder="9876543210"
                      />
                      {errors.mobileNumber && <p className="mt-1 text-[10px] text-red-500 font-semibold">{errors.mobileNumber.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-neutral-100">
                    <h3 className="text-xs font-bold text-neutral-850 uppercase tracking-widest border-l-2 border-neutral-900 pl-2.5">
                      Payment Verification
                    </h3>
                    <p className="text-xs font-medium text-neutral-400 leading-relaxed">
                      Click the Pay button to pay securely using Razorpay (supports cards, UPI, net banking).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={paying}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 focus:outline-none cursor-pointer"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Payment
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-card space-y-6">
                  <h3 className="font-bold text-neutral-800 text-xs uppercase tracking-wider">Order Summary</h3>

                  {/* Items list */}
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2 border-b border-neutral-100 pb-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex gap-3 justify-between items-center text-xs text-neutral-700 font-semibold">
                        <div className="flex gap-3 items-center">
                          <div className="h-10 w-10 border border-neutral-100 rounded-lg overflow-hidden shrink-0">
                            <img src={item.product.images?.[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80"} alt={item.product.title} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="text-neutral-800 line-clamp-1">{item.product.title}</p>
                            <p className="text-neutral-400 text-[10px] font-semibold mt-0.5">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold shrink-0">{formatPrice(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3.5 text-xs font-semibold text-neutral-500 pt-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-neutral-850">{formatPrice(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 font-bold">
                        <span>Discount ({coupon?.discountPercent}%)</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Free delivery</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-neutral-800 border-t border-neutral-100 pt-4">
                      <span>Total Price</span>
                      <span className="text-neutral-900 text-sm font-extrabold">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="bg-neutral-50/50 rounded-2xl p-4 flex gap-3 text-[10px] font-semibold text-neutral-450 leading-relaxed border border-neutral-100/60">
                    <ShieldCheck className="h-4.5 w-4.5 text-neutral-800 shrink-0 mt-0.5" />
                    <p>
                      Your checkout is protected by high-grade encryption. Downloads links will generate immediately upon successful payment verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
