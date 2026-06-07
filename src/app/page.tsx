"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Product } from "@/types";
import { mockProducts, mockFaqs } from "@/lib/mockData";
import { db, ref, get } from "@/lib/firebase";
import { ProductSkeleton } from "@/components/ui/Skeleton";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice, normalizeProduct } from "@/lib/utils";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  ChevronDown,
  Sparkles,
  Search,
  Package,
  Download,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { addToCart, clearCart } = useCart();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const productsRef = ref(db, "products");
        const snapshot = await get(productsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const productList = Object.keys(data).map((key) => 
            normalizeProduct({
              id: key,
              ...data[key],
            })
          );
          setProducts(productList);
        } else {
          setProducts(mockProducts.map(normalizeProduct));
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts(mockProducts.map(normalizeProduct));
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const handleInstantBuy = (product: Product) => {
    clearCart();
    addToCart(product, 1);
    showToast(`Starting checkout for ${product.title}`, "info");
    router.push("/checkout");
  };

  const handleAddToBag = (product: Product) => {
    addToCart(product, 1);
    showToast(`${product.title} added to your bag.`, "success");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Filter products by type
  const digitalProducts = products.filter((p) => p.type === "digital");
  const physicalProducts = products.filter((p) => p.type === "physical");

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white text-neutral-800">
        {/* ─── HERO SECTION (Editorial Mesh) ─── */}
        <section className="relative overflow-hidden hero-gradient-mesh py-24 sm:py-32 border-b border-neutral-100">
          {/* Subtle warm background elements */}
          <div className="absolute top-10 left-[15%] h-[350px] w-[350px] rounded-full bg-indigo-500/[0.02] blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-10 right-[15%] h-[300px] w-[300px] rounded-full bg-amber-500/[0.02] blur-[100px] animate-pulse-glow delay-200" />
          
          <div className="mx-auto max-w-5xl px-6 sm:px-8 relative z-10 text-center">
            {/* Elegant Chip Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-100 bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600 shadow-sm animate-fade-in mb-8">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              The 2026 Curated Collection
            </div>

            {/* Main Editorial Header */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.08] max-w-4xl mx-auto animate-fade-in-up opacity-0 delay-100">
              Refined Essentials, <br />
              <span className="gradient-text">Delivered Seamlessly.</span>
            </h1>

            {/* Description Subtext */}
            <p className="mt-6 text-sm sm:text-base text-neutral-500 max-w-2xl mx-auto leading-relaxed font-medium animate-fade-in-up opacity-0 delay-200">
              A curated catalog of luxury developer files and premium hardware setup gear. Browse, verify, and checkout with zero friction.
            </p>

            {/* Custom Search Form */}
            <form
              onSubmit={handleSearch}
              className="mt-10 mx-auto max-w-lg animate-fade-in-up opacity-0 delay-300"
            >
              <div className="relative bg-white border border-neutral-100 rounded-2xl p-1.5 shadow-premium focus-within:border-neutral-250 transition-all duration-300">
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-neutral-400 ml-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search digital assets or premium gear..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none px-3 py-2 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase px-6 py-3 transition-colors duration-250 cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>

            {/* Asymmetric CTA Navigation Link buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-10 animate-fade-in-up opacity-0 delay-400">
              <a
                href="#digital-products"
                className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-neutral-900 text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-neutral-800 shadow-sm transition-all duration-200 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Digital Assets
              </a>
              <a
                href="#physical-products"
                className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-neutral-200 bg-white/70 backdrop-blur-sm px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-800 hover:bg-white hover:border-neutral-300 shadow-sm transition-all duration-200 cursor-pointer"
              >
                <Package className="h-3.5 w-3.5" />
                Physical Product
              </a>
            </div>
          </div>
        </section>

        {/* ─── DIGITAL PRODUCTS (Luxury Grids) ─── */}
        <section id="digital-products" className="mx-auto max-w-7xl px-6 py-24 sm:px-8 scroll-mt-20">
          <div className="flex items-end justify-between border-b border-neutral-100 pb-6 mb-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">
                <Download className="h-3.5 w-3.5" />
                Instant Access Files
              </span>
              <h2 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight">Premium Digital Products</h2>
              <p className="text-xs font-semibold text-neutral-400 mt-1 leading-relaxed">Boilerplates, license packs, and source code downloads.</p>
            </div>
            <a
              href="/digital"
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-neutral-800 hover:text-secondary uppercase tracking-wider transition-colors"
            >
              Explore Collection
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {digitalProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className="group card-premium flex flex-col justify-between rounded-2xl bg-white p-3 border border-neutral-100 shadow-card animate-fade-in-scale opacity-0"
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "forwards" }}
                >
                  <div>
                    {/* Media Frame */}
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-50/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80"}
                        alt={product.title}
                        className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                      />
                      <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[8px] font-bold text-neutral-800 shadow-sm border border-neutral-100 uppercase tracking-widest">
                        {product.category}
                      </span>
                    </div>

                    {/* Metadata Content */}
                    <div className="mt-3 space-y-1 px-1">
                      <h3 className="text-xs font-bold text-neutral-900 tracking-tight line-clamp-1 group-hover:text-secondary transition-colors duration-250">
                        {product.title}
                      </h3>
                      <p className="text-[10px] font-medium text-neutral-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Frame */}
                  <div className="mt-4 pt-2 border-t border-neutral-50 px-1 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Digital</span>
                      <span className="text-xs font-extrabold text-neutral-900">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleAddToBag(product)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-neutral-250 bg-white py-2 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        Bag
                      </button>
                      <button
                        onClick={() => handleInstantBuy(product)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-neutral-900 py-2 text-[10px] font-semibold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── PHYSICAL PRODUCTS (Workspace gear) ─── */}
        <section id="physical-products" className="relative bg-neutral-50/30 border-y border-neutral-100 py-24 scroll-mt-20 overflow-hidden">
          {/* Subtle grid accent background */}
          <div className="absolute inset-0 dot-pattern opacity-60 pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 sm:px-8 relative z-10">
            <div className="flex items-end justify-between border-b border-neutral-100 pb-6 mb-10">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-widest mb-2">
                  <Package className="h-3.5 w-3.5" />
                  Premium Setup Essentials
                </span>
                <h2 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight">Physical Product</h2>
                <p className="text-xs font-semibold text-neutral-400 mt-1 leading-relaxed">High-end desktop pads, accessories, and tech items.</p>
              </div>
              <a
                href="/physical"
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-neutral-800 hover:text-accent uppercase tracking-wider transition-colors"
              >
                Explore Products
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {physicalProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="group card-premium flex flex-col justify-between rounded-2xl bg-white p-3 border border-neutral-100 shadow-card animate-fade-in-scale opacity-0"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "forwards" }}
                  >
                    <div>
                      {/* Image frame */}
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-50/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80"}
                          alt={product.title}
                          className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                        <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[8px] font-bold text-neutral-800 shadow-sm border border-neutral-100 uppercase tracking-widest">
                          {product.category}
                        </span>
                      </div>

                      {/* Content descriptions */}
                      <div className="mt-3 space-y-1 px-1">
                        <h3 className="text-xs font-bold text-neutral-900 tracking-tight line-clamp-1 group-hover:text-accent transition-colors duration-250">
                          {product.title}
                        </h3>
                        <p className="text-[10px] font-medium text-neutral-400 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="mt-4 pt-2 border-t border-neutral-50 px-1 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Physical</span>
                        <span className="text-xs font-extrabold text-neutral-900">
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const msg = `Hi, I am interested in purchasing ${product.title} listed on Prime Store.`;
                          window.open(`https://wa.me/919744184347?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 py-2 text-[10px] font-semibold tracking-wider uppercase text-white transition-all shadow-sm cursor-pointer"
                      >
                        <Package className="h-3 w-3" />
                        Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── TRUST BADGES (Minimal columns) ─── */}
        <section className="bg-white py-24 border-b border-neutral-100">
          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            <div className="text-center mb-16">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block">Service Standards</span>
              <h2 className="font-serif text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">Designed for Creators</h2>
              <p className="text-xs font-semibold text-neutral-450 mt-1 max-w-md mx-auto">We provide premium assets and gear with direct access and immediate shipping verification.</p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  color: "bg-neutral-50 text-neutral-800 border border-neutral-100/60",
                  title: "Secure Payments",
                  desc: "Encrypted Razorpay checkout systems. Safe, audited payment channels for all orders.",
                },
                {
                  icon: <Zap className="h-5 w-5" />,
                  color: "bg-neutral-50 text-secondary border border-neutral-100/60",
                  title: "Instant Deliveries",
                  desc: "Get secure boilerplate files and license keys immediately inside your post-checkout drawer.",
                },
                {
                  icon: <Globe className="h-5 w-5" />,
                  color: "bg-neutral-50 text-accent border border-neutral-100/60",
                  title: "WhatsApp Channel Support",
                  desc: "Direct verification support. Order physical setup gear easily with customized chats.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="card-premium flex flex-col items-center text-center rounded-3xl bg-white p-8"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color} mb-5`}>
                    {feature.icon}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800 mb-2">{feature.title}</h4>
                  <p className="text-[11px] font-semibold text-neutral-450 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ Accordions ─── */}
        <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block">FAQ Helpdesk</span>
            <h2 className="font-serif text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">Frequently Answered Questions</h2>
            <p className="mt-2 text-xs font-semibold text-neutral-450">Everything you need to know about checkout, download access, and delivery times.</p>
          </div>

          <div className="space-y-3">
            {mockFaqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-neutral-100 bg-white overflow-hidden transition-all duration-300 shadow-card hover:shadow-card-hover"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-neutral-800 hover:text-secondary transition-colors focus:outline-none cursor-pointer"
                >
                  <span className="text-xs sm:text-sm tracking-wide">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-neutral-400 transition-transform duration-300 shrink-0 ml-4 ${
                      activeFaq === index ? "rotate-180 text-secondary" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    activeFaq === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 text-xs font-semibold leading-relaxed text-neutral-450 border-t border-neutral-50/60 pt-3">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
