import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const token = searchParams.get("token");

    if (!productId || !token) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Verify User Session Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authErr) {
      console.error("Token verification failed:", authErr);
      return NextResponse.json({ error: "Invalid or expired session token. Please sign in again." }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // 2. Verify Purchase record in Database
    const downloadRef = adminDb.ref(`downloads/${userId}/${productId}`);
    const snapshot = await downloadRef.get();
    if (!snapshot.exists()) {
      return NextResponse.json({ error: "No purchase record found for this product." }, { status: 403 });
    }

    const downloadRecord = snapshot.val();

    // Increment download counter
    await downloadRef.update({
      downloadCount: (downloadRecord.downloadCount || 0) + 1,
      lastDownloadedAt: Date.now(),
    });

    // 3. Attempt Stream from Firebase Storage
    const fileUrl = downloadRecord.fileUrl;
    const fileName = downloadRecord.fileName || "download";

    if (fileUrl && fileUrl.startsWith("gs://")) {
      try {
        const parts = fileUrl.replace("gs://", "").split("/");
        const bucketName = parts[0];
        const filePath = parts.slice(1).join("/");
        const bucket = adminStorage.bucket(bucketName);
        const file = bucket.file(filePath);

        const [exists] = await file.exists();
        if (exists) {
          const [metadata] = await file.getMetadata();
          const contentType = metadata.contentType || "application/octet-stream";
          const fileStream = file.createReadStream();

          // Convert Node Stream to Web Stream for Next.js response
          const webStream = new ReadableStream({
            start(controller) {
              fileStream.on("data", (chunk) => controller.enqueue(chunk));
              fileStream.on("end", () => controller.close());
              fileStream.on("error", (err) => controller.error(err));
            },
          });

          return new Response(webStream, {
            headers: {
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Content-Type": contentType,
            },
          });
        }
      } catch (storageErr) {
        console.warn("Storage stream failed, falling back to mock file generation:", storageErr);
      }
    }

    // 4. Fallback: Generate mock file download for development testing
    const mockContent = `--------------------------------------------------
PRIME STORE - DIGITAL PRODUCT LICENSE
--------------------------------------------------
Item: ${downloadRecord.title}
License: ${downloadRecord.licenseType || "Standard Single Use"}
Order ID: ${downloadRecord.orderId}
Order Number: ${downloadRecord.orderNumber}
License Owner ID: ${userId}
Purchase Date: ${new Date(downloadRecord.purchaseDate).toLocaleString("en-IN")}
Status: ACTIVE / VERIFIED

This license text confirms your purchase.
File download was requested. In production, the file streams from:
${fileUrl}
--------------------------------------------------`;

    return new Response(mockContent, {
      headers: {
        "Content-Disposition": `attachment; filename="license-${fileName.replace(/\.[^/.]+$/, "")}.txt"`,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Download API error:", err);
    return NextResponse.json({ error: err.message || "Failed to process download" }, { status: 500 });
  }
}
