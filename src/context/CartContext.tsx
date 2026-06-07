"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Product, CartItem, Coupon } from "@/types";
import { db, ref, get } from "@/lib/firebase";

interface CartContextType {
  cart: CartItem[];
  wishlist: Product[];
  coupon: Coupon | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  wishlist: [],
  coupon: null,
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  toggleWishlist: () => {},
  isInWishlist: () => false,
  applyCoupon: async () => ({ success: false, message: "" }),
  removeCoupon: () => {},
});

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart and wishlist from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("prime_cart");
    const savedWishlist = localStorage.getItem("prime_wishlist");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        Promise.resolve().then(() => {
          setCart(parsedCart);
        });
      } catch (e) {
        console.error("Error loading cart:", e);
      }
    }
    if (savedWishlist) {
      try {
        const parsedWishlist = JSON.parse(savedWishlist);
        Promise.resolve().then(() => {
          setWishlist(parsedWishlist);
        });
      } catch (e) {
        console.error("Error loading wishlist:", e);
      }
    }
    Promise.resolve().then(() => {
      setIsInitialized(true);
    });
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("prime_cart", JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  // Save wishlist to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("prime_wishlist", JSON.stringify(wishlist));
    }
  }, [wishlist, isInitialized]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        // Prevent physical product quantity from exceeding stock
        const newQty = existingItem.quantity + quantity;
        if (product.type === "physical" && newQty > product.stock) {
          return prevCart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: product.stock }
              : item
          );
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          // Cap at stock level for physical goods
          if (item.product.type === "physical" && quantity > item.product.stock) {
            return { ...item, quantity: item.product.stock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setCoupon(null);
  };

  const toggleWishlist = (product: Product) => {
    setWishlist((prevWishlist) => {
      const exists = prevWishlist.some((item) => item.id === product.id);
      if (exists) {
        return prevWishlist.filter((item) => item.id !== product.id);
      }
      return [...prevWishlist, product];
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId);
  };

  const applyCoupon = async (code: string) => {
    const codeUpper = code.trim().toUpperCase();
    try {
      const couponRef = ref(db, `coupons/${codeUpper}`);
      const snapshot = await get(couponRef);
      if (snapshot.exists()) {
        const couponData = snapshot.val() as Coupon;
        if (couponData.active) {
          setCoupon(couponData);
          return { success: true, message: `Coupon applied: ${couponData.discountPercent}% off!` };
        }
      }
      return { success: false, message: "Invalid or expired coupon code." };
    } catch (error) {
      console.error("Coupon error:", error);
      return { success: false, message: "Error applying coupon code." };
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  
  const discountAmount = coupon
    ? Math.round((subtotal * coupon.discountPercent) / 100)
    : 0;
    
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        coupon,
        subtotal,
        discountAmount,
        total,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
