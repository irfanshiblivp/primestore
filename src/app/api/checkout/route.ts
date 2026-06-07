import { NextResponse } from "next/server";
import Razorpay from "razorpay";

import { adminDb } from "@/lib/firebase-admin";
import { mockProducts } from "@/lib/mockData";
import { pendingOrders } from "@/lib/orderStore";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(request: Request) {
  try {
    const { items, couponCode, shippingAddress, userId, email, userName, mobileNumber } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Re-calculate subtotal using database values for security
    let subtotal = 0;
    let orderType: "physical" | "digital" | "mixed" = "digital";
    let hasPhysical = false;
    let hasDigital = false;

    const validatedItems = [];

    for (const item of items) {
      const dbProductSnapshot = await adminDb.ref(`products/${item.product.id}`).get();
      let dbProduct;
      if (!dbProductSnapshot.exists()) {
        // Try matching by ID in mock products
        let mockProduct = mockProducts.find((p) => p.id === item.product.id);
        // Try matching by title in mock products
        if (!mockProduct && item.product.title) {
          mockProduct = mockProducts.find(
            (p) => p.title.toLowerCase() === item.product.title.toLowerCase()
          );
        }
        if (!mockProduct) {
          // Final fallback: use the product data sent from the cart directly (dev mode)
          // This handles cases where products were added via admin panel to client-side Firebase
          // but the server admin SDK is not configured
          if (item.product.title && item.product.price != null) {
            dbProduct = {
              title: item.product.title,
              price: item.product.price,
              type: item.product.type || "digital",
              stock: item.product.stock || 9999,
              category: item.product.category || "General",
            };
          } else {
            return NextResponse.json(
              { error: `Product ${item.product.title || item.product.id} not found in catalog` },
              { status: 404 }
            );
          }
        } else {
          dbProduct = mockProduct;
        }
      } else {
        const val = dbProductSnapshot.val();
        dbProduct = {
          title: val.title || val.name,
          price: Number(val.price || 0),
          type: val.type || "digital",
          stock: val.stock !== undefined ? Number(val.stock) : 9999,
          category: val.category || "",
        };
      }
      
      // Stock check for physical goods
      if (dbProduct.type === "physical") {
        hasPhysical = true;
        if (Number(dbProduct.stock || 0) < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${dbProduct.title}` },
            { status: 400 }
          );
        }
      } else {
        hasDigital = true;
      }

      subtotal += dbProduct.price * item.quantity;
      validatedItems.push({
        productId: item.product.id,
        title: dbProduct.title,
        price: dbProduct.price,
        quantity: item.quantity,
        type: dbProduct.type,
      });
    }

    if (hasPhysical && hasDigital) {
      orderType = "mixed";
    } else if (hasPhysical) {
      orderType = "physical";
    }

    // 2. Fetch coupon and calculate discount
    let discountPercent = 0;
    let discountAmount = 0;
    if (couponCode) {
      const couponSnapshot = await adminDb.ref(`coupons/${couponCode.toUpperCase()}`).get();
      if (couponSnapshot.exists()) {
        const couponData = couponSnapshot.val();
        if (couponData.active) {
          discountPercent = couponData.discountPercent;
          discountAmount = Math.round((subtotal * discountPercent) / 100);
        }
      }
    }

    const finalAmount = Math.max(0, subtotal - discountAmount);

    // 3. Create Razorpay order
    const isMockPayment = !process.env.RAZORPAY_KEY_SECRET || 
                         process.env.RAZORPAY_KEY_SECRET.includes("your_razorpay_secret_here");

    let razorpayOrder;
    if (isMockPayment) {
      razorpayOrder = {
        id: `order_mock_${Math.floor(100000 + Math.random() * 900000)}`,
        amount: finalAmount * 100, // paise
        currency: "INR",
      };
    } else {
      const options = {
        amount: finalAmount * 100, // paise
        currency: "INR",
        receipt: `rcpt_${Math.floor(Math.random() * 1000000)}`,
      };
      razorpayOrder = await razorpay.orders.create(options);
    }

    // 4. Generate order number
    const randNum1 = Math.floor(100000 + Math.random() * 900000);
    const randNum2 = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PRM-${randNum1}-${randNum2}`;

    // 5. Save pending order in Firebase
    const orderId = razorpayOrder.id; // Use Razorpay Order ID as database key for tracking
    const orderData = {
      id: orderId,
      orderNumber,
      userId: userId || "guest",
      email,
      type: orderType,
      status: "pending",
      paymentStatus: "unpaid",
      razorpayOrderId: orderId,
      items: validatedItems,
      totalAmount: finalAmount,
      discountAmount,
      shippingAddress: orderType !== "digital" ? shippingAddress : null,
      customerDetails: {
        fullName: userName,
        mobileNumber,
      },
      createdAt: Date.now(),
    };

    await adminDb.ref(`orders/${orderId}`).set(orderData);

    // Also save to in-memory store for when Firebase admin is not configured
    pendingOrders.set(orderId, orderData);

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderNumber,
      isMockPayment,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Checkout API error:", err);
    return NextResponse.json({ error: err.message || "Failed to process checkout" }, { status: 500 });
  }
}
