"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, Ticket, Tag } from "lucide-react";

export default function CartPage() {
  const {
    cart,
    subtotal,
    discountAmount,
    total,
    coupon,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { showToast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [applying, setApplying] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setApplying(true);
    const result = await applyCoupon(couponCode);
    setApplying(false);

    if (result.success) {
      showToast(result.message, "success");
      setCouponCode("");
    } else {
      showToast(result.message, "error");
    }
  };

  const handleQuantityChange = (productId: string, currentQty: number, change: number, stock: number, type: string) => {
    const newQty = currentQty + change;
    if (type === "physical" && newQty > stock) {
      showToast(`Cannot exceed available stock of ${stock} items.`, "error");
      return;
    }
    updateQuantity(productId, newQty);
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white min-h-[75vh] text-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
          
          <div className="border-b border-neutral-100 pb-6 mb-10">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Fulfillment bag</span>
            <h1 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight">Your Bag</h1>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-20 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200 max-w-md mx-auto">
              <ShoppingBag className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-bold text-neutral-850">Your bag is empty</h3>
              <p className="text-xs font-semibold text-neutral-450 mt-1">Browse our products to select items.</p>
              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Go Shop Catalog
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              {/* Cart Items List */}
              <div className="lg:col-span-2 space-y-6">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-100 pb-6 gap-4"
                  >
                    {/* Details Visual */}
                    <div className="flex gap-4 items-center flex-1">
                      <div className="h-20 w-20 rounded-2xl overflow-hidden bg-neutral-50/50 border border-neutral-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.product.images?.[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80"}
                          alt={item.product.title}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="inline-block text-[9px] bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-500 font-bold uppercase tracking-wider">
                          {item.product.type}
                        </span>
                        <h3 className="text-sm font-bold text-neutral-900 tracking-tight leading-tight">
                          <Link href={`/products/${item.product.id}`} className="hover:text-secondary transition-colors">
                            {item.product.title}
                          </Link>
                        </h3>
                        <p className="text-[10px] font-semibold text-neutral-400">
                          Category: {item.product.category}
                        </p>
                      </div>
                    </div>

                    {/* Pricing controls row */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50/30 p-1">
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity, -1, item.product.stock, item.product.type)}
                          className="p-1 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-neutral-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity, 1, item.product.stock, item.product.type)}
                          className="p-1 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Item Total Price */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-neutral-900">
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                        <p className="text-[10px] text-neutral-450 font-semibold">
                          {formatPrice(item.product.price)} each
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => {
                          removeFromCart(item.product.id);
                          showToast(`${item.product.title} removed from bag.`, "success");
                        }}
                        className="text-neutral-300 hover:text-red-500 p-1.5 transition-colors focus:outline-none cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary Form panel */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-3xl border border-neutral-100 bg-neutral-50/50 p-6 space-y-6 shadow-card">
                  <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider">Order Summary</h3>

                  {/* Price detail blocks */}
                  <div className="space-y-3.5 text-xs font-semibold text-neutral-500 border-b border-neutral-200/60 pb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-neutral-800">{formatPrice(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 font-bold">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          Discount ({coupon?.discountPercent}%)
                        </span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Calculated at checkout</span>
                    </div>
                  </div>

                  {/* Order Total Price */}
                  <div className="flex justify-between text-xs font-bold text-neutral-800">
                    <span>Total</span>
                    <span className="text-sm font-extrabold text-neutral-900">{formatPrice(total)}</span>
                  </div>

                  {/* Checkout CTA */}
                  {cart.some(item => item.product.type === "physical") ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          showToast("Physical products must be ordered directly via WhatsApp. Please remove physical items to proceed to checkout.", "error");
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-200 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-400 cursor-not-allowed"
                      >
                        Proceed to Checkout
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <p className="text-[10px] text-red-500 font-semibold text-center leading-relaxed">
                        Remove physical gear to checkout digital templates.
                      </p>
                    </div>
                  ) : (
                    <Link
                      href="/checkout"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
                    >
                      Proceed to Checkout
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                {/* Coupon component box */}
                <div className="rounded-3xl border border-neutral-100 bg-white p-5 space-y-4 shadow-card">
                  <h4 className="font-bold text-neutral-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Ticket className="h-4 w-4 text-neutral-450" />
                    Promo Code
                  </h4>

                  {coupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-150 rounded-xl px-3.5 py-2 text-xs text-green-700">
                      <span className="font-bold">{coupon.code} Applied</span>
                      <button
                        onClick={removeCoupon}
                        className="text-green-600 hover:text-green-800 font-bold focus:outline-none cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="PRIME10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850 placeholder-neutral-400 transition-all uppercase"
                      />
                      <button
                        type="submit"
                        disabled={applying}
                        className="rounded-xl border border-neutral-250 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none disabled:bg-neutral-100 cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                  )}
                  <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                    Try using coupon code <strong className="text-neutral-500">PRIME10</strong> for a 10% test discount.
                  </p>
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
