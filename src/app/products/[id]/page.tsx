"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Product } from "@/types";
import { mockProducts } from "@/lib/mockData";
import { db, ref, get } from "@/lib/firebase";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice, normalizeProduct } from "@/lib/utils";
import {
  ShoppingBag,
  Heart,
  FileCode,
  Shield,
  Truck,
  ArrowLeft,
  Loader2,
  Package,
  Download,
  CheckCircle2,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist, clearCart } = useCart();
  const { showToast } = useToast();

  const handleBuyNow = () => {
    if (!product) return;
    clearCart();
    addToCart(product, 1);
    showToast(`Starting checkout for ${product.title}`, "info");
    router.push("/checkout");
  };

  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  // Resolve params
  useEffect(() => {
    params.then((res) => setProductId(res.id));
  }, [params]);

  useEffect(() => {
    if (!productId) return;

    async function fetchProductData() {
      try {
        const productRef = ref(db, `products/${productId}`);
        const productSnapshot = await get(productRef);

        let loadedProduct: Product | null = null;
        if (productSnapshot.exists()) {
          loadedProduct = normalizeProduct({ id: productId, ...productSnapshot.val() });
        } else {
          const mock = mockProducts.find((p) => p.id === productId);
          if (mock) loadedProduct = normalizeProduct(mock);
        }

        setProduct(loadedProduct);
      } catch (error) {
        console.error("Error loading product details:", error);
        const mock = mockProducts.find((p) => p.id === productId);
        if (mock) setProduct(normalizeProduct(mock));
      } finally {
        setLoading(false);
      }
    }

    fetchProductData();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product);
    showToast(`${product.title} added to bag.`, "success");
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlist(product);
    const added = isInWishlist(product.id);
    showToast(
      added ? "Removed from wishlist." : "Added to wishlist.",
      "success"
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-white text-neutral-800">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
        </div>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-white text-neutral-800 px-6">
          <h2 className="font-serif text-2xl font-bold text-neutral-800">Product Not Found</h2>
          <p className="text-neutral-450 mt-2 text-xs text-center">
            This product does not exist or has been removed from catalog database.
          </p>
          <Link
            href="/products"
            className="mt-6 flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  const isLiked = isInWishlist(product.id);
  const images = product.images?.length ? product.images : [
    product.type === "digital"
      ? "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80"
  ];

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white text-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-8 animate-fade-in">
            <Link href="/" className="hover:text-neutral-700 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-neutral-700 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-neutral-600 truncate max-w-[200px]">{product.title}</span>
          </div>

          {/* Product Grid Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 animate-fade-in-up opacity-0 delay-100" style={{ animationFillMode: "forwards" }}>

            {/* Left Column: Image Canvas */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-neutral-50/50 aspect-square relative shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[selectedImage]}
                  alt={product.title}
                  className="h-full w-full object-cover object-center transition-all duration-500"
                />
                <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-neutral-800 shadow-sm border border-neutral-100 uppercase tracking-widest">
                  {product.type === "digital" ? "Digital File" : "Workspace Item"}
                </span>
              </div>
 
              {/* Image selectors list */}
              {images.length > 1 && (
                <div className="flex gap-3">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`h-20 w-20 rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                        selectedImage === i
                          ? "border-neutral-900 shadow-premium"
                          : "border-neutral-100 hover:border-neutral-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`${product.title} ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Spec / Text Description */}
            <div className="space-y-6">
              {/* Headers */}
              <div className="space-y-3">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  product.type === "digital" ? "text-secondary" : "text-accent"
                }`}>
                  {product.type === "digital" ? <Download className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                  {product.category}
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-neutral-900 leading-tight">
                  {product.title}
                </h1>
                <p className="text-xl font-extrabold text-neutral-900">
                  {formatPrice(product.price)}
                </p>
              </div>

              <div className="h-px bg-neutral-100" />

              {/* Descriptions content */}
              <div className="text-neutral-500 text-xs font-semibold leading-relaxed">
                <p>{product.description}</p>
              </div>

              {/* Specifications cards */}
              <div className="rounded-3xl border border-neutral-100 bg-neutral-50/50 p-6 space-y-4.5">
                {product.type === "digital" ? (
                  <>
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-secondary border border-neutral-200/50 shrink-0">
                        <FileCode className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800">Format &amp; License</h4>
                        <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                          {product.licenseType || "Standard Developer Use"} ({product.fileName || "File Asset"})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200/50 shrink-0">
                        <Shield className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800">Secure Direct Access</h4>
                        <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">Instant downloads available inside post-checkout verify route.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-accent border border-neutral-200/50 shrink-0">
                        <Truck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800">Direct Home Shipping</h4>
                        <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">Dispatched within 24 hours. Delivered across India in 3-5 days.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200/50 shrink-0">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800">Availability Status</h4>
                        <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                          {product.stock > 0 ? `${product.stock} units ready in store catalog` : "Temporarily out of stock"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons triggers */}
              {product.type === "physical" ? (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const msg = `Hi, I am interested in purchasing ${product.title} listed on Prime Store.`;
                      window.open(`https://wa.me/919744184347?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <Package className="h-4 w-4" />
                    Order via WhatsApp
                  </button>
                  <button
                    onClick={handleToggleWishlist}
                    className={`rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                      isLiked
                        ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                        : "border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-red-550"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500" : ""}`} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleAddToCart}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-250 bg-white px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Bag
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={handleToggleWishlist}
                    className={`rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                      isLiked
                        ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                        : "border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-red-555"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500" : ""}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
