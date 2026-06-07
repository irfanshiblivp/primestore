"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { auth, db, ref, get } from "@/lib/firebase";
import { Loader2, Download, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

interface DownloadItem {
  productId: string;
  title: string;
  fileName: string;
  licenseType: string;
  orderId: string;
}

export default function DownloadPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guestId = searchParams.get("guestId");
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then((res) => setOrderId(res.orderId));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    const uid = user?.uid || guestId;

    async function fetchDownloads() {
      if (!uid) {
        if (!authLoading) setLoading(false);
        return;
      }
      try {
        const downloadsRef = ref(db, `downloads/${uid}`);
        const snapshot = await get(downloadsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const userDownloads = Object.keys(data)
            .map((key) => ({
              productId: key,
              ...data[key],
            }))
            .filter((dl) => dl.orderId === orderId);
          
          setDownloads(userDownloads);
        } else {
          setDownloads([]);
        }
      } catch (error) {
        console.error("Error loading downloads:", error);
        showToast("Error loading download details.", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchDownloads();
  }, [orderId, user, guestId, authLoading, showToast]);

  // Handle Auth redirection (allow bypass if guestId query parameter is active)
  useEffect(() => {
    if (!authLoading && !user && !guestId) {
      showToast("Access Denied. Please log in or use your guest payment link.", "info");
      router.push("/");
    }
  }, [user, authLoading, orderId, guestId, router, showToast]);

  const handleDownloadClick = async (productId: string, fileName: string, title: string) => {
    if (user) {
      try {
        // Fetch the fresh Firebase Client Auth ID Token
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) {
          showToast("Session expired. Please sign in again.", "error");
          return;
        }

        // Route the user directly to the secure API streaming endpoint in a new window
        const url = `/api/download?productId=${productId}&token=${encodeURIComponent(token)}`;
        window.open(url, "_blank");
        showToast(`Initiating download for ${fileName}`, "success");
      } catch (err) {
        console.error(err);
        showToast("Download failed. Please try again.", "error");
      }
    } else {
      // Guest local download trigger via browser Client Blob mock
      const fileContent = `Thank you for purchasing "${title}" from Prime Store!\n\nThis is your digital delivery for file: ${fileName}.\nLicense Type: Standard License\nPurchase Date: ${new Date().toLocaleDateString()}\nOrder Number: ${orderId}\n\nFor any development queries, contact support@primestore.com.`;
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

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-xs text-slate-400 mt-2">Loading download link details...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white min-h-[70vh]">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 relative z-10 text-center space-y-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-500 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h1 className="font-serif text-3xl font-semibold text-slate-900 leading-tight">
            Thank you for your purchase!
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Payment has been successfully verified. Your digital files and licenses are listed below.
          </p>

          {/* Download cards */}
          <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4 text-left">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Available Files</h3>

            {downloads.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No files available for this order number. Check your dashboard if payment was delayed.</p>
            ) : (
              downloads.map((dl) => (
                <div key={dl.productId} className="flex justify-between items-center gap-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{dl.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{dl.fileName} | {dl.licenseType}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadClick(dl.productId, dl.fileName, dl.title)}
                    className="flex items-center gap-1 bg-slate-900 hover:bg-primary text-white text-xs font-bold rounded-xl px-4 py-2.5 transition-colors focus:outline-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-colors"
            >
              Back to Storefront
            </Link>
            <Link
              href="/products"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Continue Shopping
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/20 text-center flex items-center gap-3 justify-center text-[10px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            All digital downloads are scanned for security. For license terms, check the readme.
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
