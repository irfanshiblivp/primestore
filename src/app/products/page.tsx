"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Product } from "@/types";
import { mockProducts } from "@/lib/mockData";
import { db, ref, get } from "@/lib/firebase";
import { ProductSkeleton } from "@/components/ui/Skeleton";
import { formatPrice, normalizeProduct } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Search, SlidersHorizontal, ShoppingBag, Grid, Eye, Loader2 } from "lucide-react";
import Link from "next/link";

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [selectedType, setSelectedType] = useState<string>(() => searchParams.get("type") || "all");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
          setAllProducts(productList);
        } else {
          setAllProducts(mockProducts.map(normalizeProduct));
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setAllProducts(mockProducts.map(normalizeProduct));
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Filter & sort memoization
  const filteredProducts = React.useMemo(() => {
    let result = [...allProducts];

    // Search Query
    if (searchQuery.trim() !== "") {
      const queryStr = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(queryStr) ||
          p.description.toLowerCase().includes(queryStr) ||
          p.category.toLowerCase().includes(queryStr)
      );
    }

    // Type Filter
    if (selectedType !== "all") {
      result = result.filter((p) => p.type === selectedType);
    }

    // Category Filter
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort By
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [allProducts, searchQuery, selectedType, selectedCategory, sortBy]);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    showToast(`${product.title} added to bag.`, "success");
  };

  // Categories
  const categories = Array.from(
    new Set(
      allProducts
        .filter((p) => selectedType === "all" || p.type === selectedType)
        .map((p) => p.category)
    )
  );

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white text-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
          
          {/* Header & Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-8 mb-10 gap-6">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">Collection Directory</span>
              <h1 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight">Browse All Products</h1>
              <p className="text-xs font-semibold text-neutral-400 mt-1 leading-relaxed">Filter and inspect digital template files or high-end physical desktop gears.</p>
            </div>
            
            {/* Search inputs */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search catalog directory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-450 transition-all bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* Sidebar filter controls (Desktop) */}
            <aside className="hidden lg:block space-y-8 pr-4 border-r border-neutral-100/80">
              <div>
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Product Type</h3>
                <div className="space-y-3">
                  {[
                    { label: "All Products", value: "all" },
                    { label: "Digital Assets", value: "digital" },
                    { label: "Physical Gear", value: "physical" },
                  ].map((type) => (
                    <label key={type.value} className="flex items-center gap-2.5 cursor-pointer group text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                      <input
                        type="radio"
                        name="typeFilter"
                        checked={selectedType === type.value}
                        onChange={() => {
                          setSelectedType(type.value);
                          setSelectedCategory("all");
                        }}
                        className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      />
                      <span className="transition-colors">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
 
              <div className="border-t border-neutral-100/80 pt-6">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Category</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer group text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                    <input
                      type="radio"
                      name="categoryFilter"
                      checked={selectedCategory === "all"}
                      onChange={() => setSelectedCategory("all")}
                      className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                    />
                    <span className="transition-colors">All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2.5 cursor-pointer group text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                      <input
                        type="radio"
                        name="categoryFilter"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat)}
                        className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      />
                      <span className="transition-colors">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
 
              <div className="border-t border-neutral-100/80 pt-6">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-450 bg-white cursor-pointer"
                >
                  <option value="newest">Newest Releases</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </aside>

            {/* Mobile Filters triggers */}
            <div className="lg:hidden flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters &amp; Sorting
              </button>
 
              <span className="text-xs font-bold text-neutral-400">
                {filteredProducts.length} Items
              </span>
            </div>
 
            {/* Mobile Filters Drawer */}
            {showMobileFilters && (
              <div className="lg:hidden bg-neutral-50 border border-neutral-100 rounded-2xl p-6 space-y-6 animate-fade-in">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-800">Filter Directory</h3>
                  <button onClick={() => setShowMobileFilters(false)} className="text-xs text-neutral-400 hover:text-neutral-800 font-bold uppercase tracking-widest cursor-pointer">
                    Close
                  </button>
                </div>
                
                <div>
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Product Type</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: "All", value: "all" },
                      { label: "Digital", value: "digital" },
                      { label: "Physical", value: "physical" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => {
                          setSelectedType(type.value);
                          setSelectedCategory("all");
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          selectedType === type.value
                            ? "bg-neutral-900 border-neutral-900 text-white"
                            : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
 
                <div>
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Sort Order</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: "Newest", value: "newest" },
                      { label: "Price: Low to High", value: "price-asc" },
                      { label: "Price: High to Low", value: "price-desc" },
                    ].map((sort) => (
                      <button
                        key={sort.value}
                        onClick={() => setSortBy(sort.value)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          sortBy === sort.value
                            ? "bg-neutral-900 border-neutral-900 text-white"
                            : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Catalog list grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductSkeleton key={i} />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-205">
                  <Grid className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="font-bold text-sm text-neutral-800">No products found</h3>
                  <p className="text-xs text-neutral-400 mt-1">Try modifying your search query or directory filters.</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group card-premium flex flex-col justify-between rounded-2xl bg-white p-3 border border-neutral-100 shadow-card"
                    >
                      <div>
                        {/* Image element */}
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-50/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.images?.[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80"}
                            alt={product.title}
                            className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-300"
                          />
                          <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[8px] font-bold text-neutral-800 shadow-sm border border-neutral-100 uppercase tracking-widest">
                            {product.type}
                          </span>
                        </div>
                        
                        {/* Content text */}
                        <div className="mt-3 space-y-1 px-1">
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">
                            {product.category}
                          </p>
                          <h3 className="text-xs font-bold text-neutral-900 tracking-tight line-clamp-1 group-hover:text-secondary transition-colors">
                            <Link href={`/products/${product.id}`}>{product.title}</Link>
                          </h3>
                          <p className="text-[10px] font-medium text-neutral-400 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        </div>
                      </div>
 
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-50 px-1">
                        <span className="text-xs font-extrabold text-neutral-900">
                          {formatPrice(product.price)}
                        </span>
                        <div className="flex gap-1">
                          <Link
                            href={`/products/${product.id}`}
                            className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                          </Link>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="rounded-full bg-neutral-900 p-2 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <ShoppingBag className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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

export default function ProductsPage() {
return (
  <Suspense fallback={
    <div className="flex min-h-[70vh] items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
    </div>
  }>
    <ProductsPageContent />
  </Suspense>
);
}
