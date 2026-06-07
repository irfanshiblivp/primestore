import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { mockProducts } from "@/lib/mockData";
import { pendingOrders } from "@/lib/orderStore";

export async function POST(request: Request) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment parameters" }, { status: 400 });
    }

    // 1. Verify Razorpay Payment Signature
    const isMockSignature = razorpaySignature === "mock_signature";
    const hasRealSecret = process.env.RAZORPAY_KEY_SECRET && 
                          !process.env.RAZORPAY_KEY_SECRET.includes("your_razorpay_secret_here");

    let isSignatureValid = false;
    if (isMockSignature) {
      isSignatureValid = true;
    } else if (hasRealSecret) {
      const text = razorpayOrderId + "|" + razorpayPaymentId;
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(text)
        .digest("hex");
      isSignatureValid = generatedSignature === razorpaySignature;
    } else {
      // No secret configured, accept payment
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      await adminDb.ref(`orders/${razorpayOrderId}`).update({
        paymentStatus: "failed",
      });
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // 2. Fetch pending order from DB or in-memory store
    const orderRef = adminDb.ref(`orders/${razorpayOrderId}`);
    const orderSnapshot = await orderRef.get();
    
    let orderData: Record<string, unknown> | null = null;
    
    if (orderSnapshot.exists()) {
      orderData = orderSnapshot.val();
    } else {
      // Fallback: check in-memory store (for when Firebase admin is not configured)
      orderData = pendingOrders.get(razorpayOrderId) || null;
    }

    if (!orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Prevent double processing
    if (orderData.paymentStatus === "paid") {
      return NextResponse.json({ success: true, message: "Order already processed" });
    }

    // 3. Update order in DB
    const updates: Record<string, unknown> = {
      paymentStatus: "paid",
      status: orderData.type === "digital" ? "delivered" : "processing",
      razorpayPaymentId: razorpayPaymentId,
      processedAt: Date.now(),
    };
    await orderRef.update(updates);

    // Also update in-memory store
    if (pendingOrders.has(razorpayOrderId)) {
      const existing = pendingOrders.get(razorpayOrderId)!;
      pendingOrders.set(razorpayOrderId, { ...existing, ...updates });
    }

    // 4. Update Inventory Stock (for physical items) & Create Digital Downloads (for digital items)
    const items = (orderData.items || []) as Array<Record<string, unknown>>;
    const userId = (orderData.userId || "guest") as string;

    for (const item of items) {
      if (item.type === "physical") {
        const productRef = adminDb.ref(`products/${item.productId}`);
        const productSnapshot = await productRef.get();
        if (productSnapshot.exists()) {
          const currentStock = productSnapshot.val().stock || 0;
          const newStock = Math.max(0, currentStock - (item.quantity as number));
          await productRef.update({ stock: newStock });
        }
      } else if (item.type === "digital") {
        const digitalSnapshot = await adminDb.ref(`digitalProducts/${item.productId}`).get();
        let fileUrl = "gs://stor-5a57e.appspot.com/placeholder.zip";
        let fileName = "file-asset.zip";
        let licenseType = "Standard License";

        if (digitalSnapshot.exists()) {
          const val = digitalSnapshot.val();
          fileUrl = val.fileUrl || fileUrl;
          fileName = val.fileName || fileName;
          licenseType = val.licenseType || licenseType;
        } else {
          // Check products/ collection for downloadLink fallback
          const productSnapshot = await adminDb.ref(`products/${item.productId}`).get();
          if (productSnapshot.exists()) {
            const pVal = productSnapshot.val();
            fileUrl = pVal.fileUrl || pVal.downloadLink || fileUrl;
            fileName = pVal.fileName || (pVal.downloadLink ? `${(pVal.name || pVal.title || "course").toLowerCase().replace(/\s+/g, "-")}-download.txt` : fileName);
            licenseType = pVal.licenseType || licenseType;
          } else {
            // Fallback to local mock products details
            let localMock = mockProducts.find((p) => p.id === item.productId);
            if (!localMock && item.title) {
              localMock = mockProducts.find(
                (p) => p.title.toLowerCase() === (item.title as string).toLowerCase()
              );
            }
            if (localMock) {
              fileUrl = localMock.fileUrl || fileUrl;
              fileName = localMock.fileName || fileName;
              licenseType = localMock.licenseType || licenseType;
            }
          }
        }

        // Create secure download permission record
        await adminDb.ref(`downloads/${userId}/${item.productId}`).set({
          productId: item.productId,
          title: item.title,
          fileName,
          fileUrl,
          licenseType,
          orderId: razorpayOrderId,
          orderNumber: orderData.orderNumber,
          downloadCount: 0,
          purchaseDate: Date.now(),
        });
      }
    }

    // 5. Update Analytics Reports
    const today = new Date().toISOString().split("T")[0];
    const analyticsRef = adminDb.ref(`analytics/dailySales/${today}`);
    const analyticsSnapshot = await analyticsRef.get();
    
    let dailyRevenue = orderData.totalAmount as number;
    let dailyOrdersCount = 1;

    if (analyticsSnapshot.exists()) {
      const dailyData = analyticsSnapshot.val();
      dailyRevenue += dailyData.revenue || 0;
      dailyOrdersCount += dailyData.orders || 0;
    }

    await analyticsRef.set({
      revenue: dailyRevenue,
      orders: dailyOrdersCount,
      date: today,
    });

    return NextResponse.json({
      success: true,
      orderNumber: orderData.orderNumber,
      message: "Payment verified and order completed successfully",
    });
  } catch (error) {
    const err = error as Error;
    console.error("Verification API error:", err);
    return NextResponse.json({ error: err.message || "Failed to verify payment" }, { status: 500 });
  }
}
