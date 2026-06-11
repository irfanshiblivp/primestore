/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db, ref, get, set, remove, update } from "@/lib/firebase";
import { Product, Order } from "@/types";
import { mockProducts } from "@/lib/mockData";
import { formatPrice, formatDate, getStatusStyle, normalizeProduct } from "@/lib/utils";
import {
  Loader2,
  Package,
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Truck,
  Database,
  Shield,
  Check,
  XCircle
} from "lucide-react";

type AdminTab = "products" | "orders" | "settings";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [loadingData, setLoadingData] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Database Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Search & Filters
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  // Product Form Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    type: "physical" as "physical" | "digital",
    category: "Accessories",
    imageUrl: "",
    imageUrls: [""] as string[],
    stock: "10",
    fileName: "",
    fileUrl: "",
    licenseType: "Single Developer License",
  });

  // Tracking Modal States
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [trackingDetails, setTrackingDetails] = useState({
    carrier: "BlueDart",
    number: "",
  });

  // Security Redirect: Must be Admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        showToast("Please sign in as admin to access.", "error");
        router.push("/login?redirect=/admin");
      } else if (!isAdmin) {
        showToast("Access Denied. Admins only.", "error");
        router.push("/");
      }
    }
  }, [user, isAdmin, authLoading, router, showToast]);

  // Load Admin Data from Firebase Realtime DB
  const loadAdminData = async () => {
    try {
      setLoadingData(true);

      // 1. Load Products
      const productsSnapshot = await get(ref(db, "products"));
      let loadedProducts: Product[] = [];
      if (productsSnapshot.exists()) {
        const data = productsSnapshot.val();
        loadedProducts = Object.keys(data).map((key) => 
          normalizeProduct({
            id: key,
            ...data[key],
          })
        );
      }
      setProducts(loadedProducts);

      // 2. Load Orders
      const ordersSnapshot = await get(ref(db, "orders"));
      let loadedOrders: Order[] = [];
      if (ordersSnapshot.exists()) {
        loadedOrders = Object.values(ordersSnapshot.val()) as Order[];
        loadedOrders.sort((a, b) => b.createdAt - a.createdAt);
      }
      setOrders(loadedOrders);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      Promise.resolve().then(() => {
        loadAdminData();
      });
    }
  }, [user, isAdmin]);

  // Seeder Utility
  const handleSeedDatabase = async () => {
    try {
      setLoadingData(true);
      // Seed products catalog
      for (const p of mockProducts) {
        await set(ref(db, `products/${p.id}`), {
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          type: p.type,
          category: p.category,
          images: p.images,
          stock: p.stock,
          createdAt: p.createdAt,
        });

        if (p.type === "digital") {
          await set(ref(db, `digitalProducts/${p.id}`), {
            id: p.id,
            fileUrl: p.fileUrl || "placeholder.zip",
            fileName: p.fileName || "product.zip",
            licenseType: p.licenseType || "Standard License",
          });
        }
      }

      // Seed mock orders
      const orderSeedId1 = "ord_mock_1";
      await set(ref(db, `orders/${orderSeedId1}`), {
        id: orderSeedId1,
        orderNumber: "PRM-582914-8842",
        userId: "guest_seed_1",
        email: "guest.buyer@example.com",
        type: "physical",
        status: "pending",
        paymentStatus: "pending_verification",
        transactionId: "TXN583921094",
        totalAmount: 3499,
        discountAmount: 0,
        shippingAddress: {
          fullName: "Rahul Sharma",
          mobileNumber: "9876543210",
          houseName: "Flat 402",
          address: "Gokuldham Society, Film City Road",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          pincode: "400063"
        },
        customerDetails: {
          fullName: "Rahul Sharma",
          mobileNumber: "9876543210"
        },
        items: [{
          productId: "prod_phy_2",
          title: "Merino Wool felt Desk Pad",
          price: 3499,
          quantity: 1,
          type: "physical"
        }],
        createdAt: Date.now() - 4 * 60 * 60 * 1000
      });

      showToast("Shop database pre-seeded with luxury inventory items!", "success");
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Seeding failed.", "error");
    } finally {
      setLoadingData(false);
    }
  };

  // Add / Edit Product Submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title || !productForm.price) {
      showToast("Title and Price are required.", "error");
      return;
    }

    try {
      const pId = editingProduct ? editingProduct.id : `prod_${productForm.type.slice(0, 3)}_${Math.random().toString(36).substring(2, 9)}`;
      const payload: any = {
        id: pId,
        title: productForm.title,
        name: productForm.title, // backward compatibility
        description: productForm.description,
        desc: productForm.description, // backward compatibility
        price: Number(productForm.price),
        type: productForm.type,
        category: productForm.category,
        images: (() => {
          if (productForm.type === "physical") {
            const clean = productForm.imageUrls.filter((url) => url.trim() !== "");
            return clean.length > 0 ? clean : ["https://images.unsplash.com/photo-1587829741301-dc798b83add3"];
          }
          return [productForm.imageUrl || "https://images.unsplash.com/photo-1587829741301-dc798b83add3"];
        })(),
        image: (() => {
          if (productForm.type === "physical") {
            const clean = productForm.imageUrls.filter((url) => url.trim() !== "");
            return clean[0] || "https://images.unsplash.com/photo-1587829741301-dc798b83add3";
          }
          return productForm.imageUrl || "https://images.unsplash.com/photo-1587829741301-dc798b83add3";
        })(), // backward compatibility
        stock: productForm.type === "digital" ? 9999 : Number(productForm.stock),
        createdAt: editingProduct ? editingProduct.createdAt : Date.now(),
      };

      await set(ref(db, `products/${pId}`), payload);

      if (productForm.type === "digital") {
        await set(ref(db, `digitalProducts/${pId}`), {
          id: pId,
          fileName: productForm.fileName || "product.zip",
          fileUrl: productForm.fileUrl || "placeholder.zip",
          licenseType: productForm.licenseType,
        });
      }

      showToast(editingProduct ? "Product updated successfully!" : "Product added successfully!", "success");
      setShowProductModal(false);
      setEditingProduct(null);
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Operation failed.", "error");
    }
  };

  const handleEditProductClick = async (product: Product) => {
    setEditingProduct(product);
    let digitalInfo = { fileName: "", fileUrl: "", licenseType: "Single Developer License" };

    if (product.type === "digital") {
      const snapshot = await get(ref(db, `digitalProducts/${product.id}`));
      if (snapshot.exists()) {
        digitalInfo = snapshot.val();
      }
    }

    setProductForm({
      title: product.title,
      description: product.description,
      price: String(product.price),
      type: product.type,
      category: product.category,
      imageUrl: product.images?.[0] || "",
      imageUrls: product.images && product.images.length > 0 ? [...product.images] : [""],
      stock: String(product.stock),
      fileName: digitalInfo.fileName,
      fileUrl: digitalInfo.fileUrl,
      licenseType: digitalInfo.licenseType,
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product catalog item?")) return;
    try {
      await remove(ref(db, `products/${productId}`));
      await remove(ref(db, `digitalProducts/${productId}`));
      showToast("Product deleted successfully.", "success");
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Deletion failed.", "error");
    }
  };

  // Order Status Updates
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await update(ref(db, `orders/${orderId}`), { status });
      showToast(`Order status marked as ${status}`, "success");
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to adjust order status.", "error");
    }
  };

  // Manual Payment Verification Triggers
  const handleVerifyPayment = async (orderId: string) => {
    try {
      const orderRef = ref(db, `orders/${orderId}`);
      const snapshot = await get(orderRef);
      if (!snapshot.exists()) return;
      const order = snapshot.val();

      const updates = {
        paymentStatus: "paid",
        status: order.type === "digital" ? "delivered" : "processing",
      };
      await update(orderRef, updates);
      showToast(`Order ${order.orderNumber} payment reference verified!`, "success");
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Could not verify payment status.", "error");
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    try {
      const orderRef = ref(db, `orders/${orderId}`);
      const snapshot = await get(orderRef);
      if (!snapshot.exists()) return;
      const order = snapshot.val();

      const updates = {
        paymentStatus: "rejected",
        status: "cancelled",
      };
      await update(orderRef, updates);
      showToast(`Order ${order.orderNumber} payment reference rejected.`, "info");
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Could not reject payment status.", "error");
    }
  };

  // Shipping Tracking Updates
  const handleTrackingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForTracking) return;

    try {
      await update(ref(db, `orders/${selectedOrderForTracking.id}`), {
        trackingNumber: trackingDetails.number,
        trackingCarrier: trackingDetails.carrier,
        status: "shipped",
      });
      showToast("Tracking code updated & order marked as Shipped.", "success");
      setShowTrackingModal(false);
      setSelectedOrderForTracking(null);
      setTrackingDetails({ carrier: "BlueDart", number: "" });
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Could not save tracking details.", "error");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    try {
      setSettingsLoading(true);
      const isMockDatabase = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
                             process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("your_client_api_key_here");
      
      if (isMockDatabase) {
        const dbData = JSON.parse(localStorage.getItem("mock_firebase_db") || "{}");
        const users = dbData.users || {};
        if (users["mock-admin-uid"]) {
          users["mock-admin-uid"].password = newPassword;
        } else {
          users["mock-admin-uid"] = {
            uid: "mock-admin-uid",
            name: "Administrator",
            email: "rahoofmanu10@gmail.com",
            role: "admin",
            password: newPassword,
            createdAt: Date.now()
          };
        }
        dbData.users = users;
        localStorage.setItem("mock_firebase_db", JSON.stringify(dbData));
      } else {
        const fallbackUser = typeof window !== "undefined" ? localStorage.getItem("fallback_user") : null;
        if (fallbackUser) {
          const parsed = JSON.parse(fallbackUser);
          await update(ref(db, `users/${parsed.uid}`), { password: newPassword });
          showToast("Admin password updated successfully in database!", "success");
        } else {
          const { getAuth, updatePassword } = await import("firebase/auth");
          const auth = getAuth();
          if (auth.currentUser) {
            await updatePassword(auth.currentUser, newPassword);
            showToast("Admin password updated successfully in Firebase!", "success");
          } else {
            throw new Error("No authenticated user found.");
          }
        }
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update password.", "error");
    } finally {
      setSettingsLoading(false);
    }
  };

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-350" />
      </div>
    );
  }

  // Filters for lists
  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orders.filter((o) => {
    const queryMatch =
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.email.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.transactionId && o.transactionId.toLowerCase().includes(orderSearch.toLowerCase()));
    
    if (orderFilter === "all") return queryMatch;
    return queryMatch && o.status === orderFilter;
  });

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white min-h-[80vh] text-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-neutral-100 gap-4">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Configuration Deck</span>
              <h1 className="font-serif text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
                <Shield className="h-6 w-6 text-secondary stroke-[2]" />
                Admin Dashboard
              </h1>
              <p className="text-xs font-semibold text-neutral-400 mt-1">Configure your product catalog database and verify payment transactions.</p>
            </div>
            
            {/* Quick Actions triggers */}
            <div className="flex gap-2.5">
              <button
                onClick={handleSeedDatabase}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-250 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <Database className="h-3.5 w-3.5" />
                Seed Database
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    title: "",
                    description: "",
                    price: "",
                    type: "physical",
                    category: "Accessories",
                    imageUrl: "",
                    imageUrls: [""],
                    stock: "10",
                    fileName: "",
                    fileUrl: "",
                    licenseType: "Single Developer License",
                  });
                  setShowProductModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-neutral-900 text-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Product
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-10 items-start">
            {/* Admin Workspace Tabs */}
            <aside className="w-full md:w-60 shrink-0 space-y-2 border-b md:border-b-0 md:border-r border-neutral-100 pb-6 md:pb-0 md:pr-6">
              {[
                { id: "products", label: "Catalog Products", icon: Package },
                { id: "orders", label: "Verify Payments", icon: ShoppingCart },
                { id: "settings", label: "Dashboard Settings", icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as AdminTab);
                      loadAdminData();
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {tab.label}
                  </button>
                );
              })}
            </aside>

            {/* Workspace details content */}
            <div className="flex-1 w-full space-y-6">
              {loadingData ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
                </div>
              ) : (
                <>
                  {/* PRODUCTS TAB */}
                  {activeTab === "products" && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                        <div>
                          <h2 className="font-serif text-xl font-bold text-neutral-900">Catalog Products</h2>
                          <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">Manage physical hardware stocks and digital course files.</p>
                        </div>
                        
                        {/* Search input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                          <input
                            type="text"
                            placeholder="Search catalog directory..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="pl-9 pr-3 py-1.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white placeholder-neutral-400 text-neutral-800"
                          />
                        </div>
                      </div>

                      {/* Products table */}
                      <div className="border border-neutral-100 rounded-3xl overflow-hidden bg-white shadow-card">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-neutral-50 text-neutral-450 font-bold uppercase tracking-widest text-[9px] border-b border-neutral-100">
                                <th className="p-4">Item Details</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Price</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50 text-neutral-600 font-semibold">
                              {filteredProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                                  <td className="p-4 font-bold text-neutral-900">{p.title}</td>
                                  <td className="p-4 capitalize">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                      p.type === "digital" 
                                        ? "bg-indigo-50 border-indigo-100 text-secondary" 
                                        : "bg-amber-50 border-amber-100 text-accent"
                                    }`}>
                                      {p.type}
                                    </span>
                                  </td>
                                  <td className="p-4 font-extrabold text-neutral-900">{formatPrice(p.price)}</td>
                                  <td className="p-4 text-xs font-bold text-neutral-500">{p.type === "digital" ? "Unlimited" : p.stock}</td>
                                  <td className="p-4 text-right flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleEditProductClick(p)}
                                      className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                                      aria-label="Edit product"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="p-2 border border-red-100 rounded-xl bg-red-50/30 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                      aria-label="Delete product"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORDERS TAB */}
                  {activeTab === "orders" && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                        <div>
                          <h2 className="font-serif text-xl font-bold text-neutral-900">Direct Payments Verification</h2>
                          <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">Cross-check transaction UTR numbers and approve physical/digital goods dispatch.</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                            <input
                              type="text"
                              placeholder="Search UTR / email..."
                              value={orderSearch}
                              onChange={(e) => setOrderSearch(e.target.value)}
                              className="pl-9 pr-3 py-1.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white placeholder-neutral-400 text-neutral-800"
                            />
                          </div>

                          {/* Filter dropdown */}
                          <select
                            value={orderFilter}
                            onChange={(e) => setOrderFilter(e.target.value)}
                            className="border border-neutral-200 rounded-xl px-2 py-1.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-neutral-450 bg-white text-neutral-700 cursor-pointer"
                          >
                            <option value="all">All Orders</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Orders table */}
                      <div className="border border-neutral-100 rounded-3xl overflow-hidden bg-white shadow-card">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-neutral-50 text-neutral-450 font-bold uppercase tracking-widest text-[9px] border-b border-neutral-100">
                                <th className="p-4">Invoice ID</th>
                                <th className="p-4">Customer details</th>
                                <th className="p-4">Order Value</th>
                                <th className="p-4">Payment Reference</th>
                                <th className="p-4">Fulfillment Status</th>
                                <th className="p-4 text-right">Verify / Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50 text-neutral-600 font-semibold">
                              {filteredOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-neutral-400">No orders logged in database.</td>
                                </tr>
                              ) : (
                                filteredOrders.map((o) => (
                                  <tr key={o.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="p-4 font-bold text-neutral-900">
                                      {o.orderNumber}
                                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">{formatDate(o.createdAt)}</p>
                                    </td>
                                    <td className="p-4 space-y-0.5 text-xs font-semibold">
                                      <p className="font-bold text-neutral-900">{o.customerDetails?.fullName || "Guest"}</p>
                                      <p className="text-[10px] text-neutral-400">{o.email}</p>
                                      {o.shippingAddress && (
                                        <p className="text-[9px] text-neutral-450 italic max-w-xs truncate">
                                          Addr: {o.shippingAddress.houseName}, {o.shippingAddress.address}, {o.shippingAddress.city}
                                        </p>
                                      )}
                                    </td>
                                    <td className="p-4 font-extrabold text-neutral-900">{formatPrice(o.totalAmount)}</td>
                                    <td className="p-4">
                                      {o.razorpayPaymentId ? (
                                        <span className="font-mono text-[9px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded shadow-sm inline-block select-all">
                                          Pay ID: {o.razorpayPaymentId}
                                        </span>
                                      ) : o.transactionId ? (
                                        <span className="font-mono text-[9px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded shadow-sm inline-block select-all">
                                          UTR: {o.transactionId}
                                        </span>
                                      ) : (
                                        <span className="text-neutral-400">N/A</span>
                                      )}
                                    </td>
                                    <td className="p-4 space-y-1">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border capitalize ${getStatusStyle(o.status)}`}>
                                        {o.status}
                                      </span>
                                      <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${
                                        o.paymentStatus === "paid" ? "text-green-600" : o.paymentStatus === "rejected" ? "text-red-650" : "text-amber-500"
                                      }`}>
                                        {o.paymentStatus === "paid" ? "● Verified Paid" : o.paymentStatus === "unpaid" ? "● Unpaid" : o.paymentStatus === "rejected" ? "● Rejected" : "● Pending Verify"}
                                      </p>
                                      {o.trackingNumber && (
                                        <p className="text-[9px] text-neutral-400 mt-1">
                                          Track: {o.trackingCarrier} - {o.trackingNumber}
                                        </p>
                                      )}
                                    </td>
                                    <td className="p-4 text-right space-y-2">
                                      {/* Verify Actions */}
                                      {o.paymentStatus === "pending_verification" && (
                                        <div className="flex gap-1.5 justify-end">
                                          <button
                                            onClick={() => handleVerifyPayment(o.id)}
                                            className="rounded-lg bg-green-600 hover:bg-green-700 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white transition-colors focus:outline-none inline-flex items-center gap-0.5 shadow-sm cursor-pointer"
                                          >
                                            <Check className="h-3 w-3" />
                                            Verify
                                          </button>
                                          <button
                                            onClick={() => handleRejectPayment(o.id)}
                                            className="rounded-lg bg-red-600 hover:bg-red-700 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white transition-colors focus:outline-none inline-flex items-center gap-0.5 shadow-sm cursor-pointer"
                                          >
                                            <XCircle className="h-3 w-3" />
                                            Reject
                                          </button>
                                        </div>
                                      )}

                                      <div className="flex justify-end gap-1.5 items-center">
                                        {/* Status dropdown */}
                                        <select
                                          value={o.status}
                                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                          className="border border-neutral-200 rounded-lg p-1 text-[10px] bg-white text-neutral-600 focus:outline-none cursor-pointer"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="processing">Processing</option>
                                          <option value="shipped">Shipped</option>
                                          <option value="delivered">Delivered</option>
                                          <option value="cancelled">Cancelled</option>
                                        </select>
                                        
                                        {/* Tracking ID button for physical goods */}
                                        {o.type !== "digital" && (
                                          <button
                                            onClick={() => {
                                              setSelectedOrderForTracking(o);
                                              setTrackingDetails({
                                                carrier: o.trackingCarrier || "BlueDart",
                                                number: o.trackingNumber || "",
                                              });
                                              setShowTrackingModal(true);
                                            }}
                                            className="rounded border border-neutral-200 hover:bg-neutral-50 p-1 text-[9px] font-bold uppercase tracking-wider text-neutral-600 focus:outline-none inline-flex items-center gap-0.5 cursor-pointer"
                                          >
                                            <Truck className="h-3 w-3" />
                                            Track
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SETTINGS TAB */}
                  {activeTab === "settings" && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-neutral-100 pb-4">
                        <h2 className="font-serif text-xl font-bold text-neutral-900">Dashboard Settings</h2>
                        <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">Update administrator credentials configuration.</p>
                      </div>
 
                      <div className="max-w-md bg-white border border-neutral-100 rounded-3xl p-6 shadow-card space-y-4">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={settingsLoading}
                            className="flex items-center gap-1.5 rounded-xl bg-neutral-900 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 cursor-pointer"
                          >
                            {settingsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Update Password"
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Product Form Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/10 backdrop-blur-sm animate-fade-in">
          <div className="bg-white text-neutral-800 rounded-3xl max-w-lg w-full p-8 shadow-premium border border-neutral-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                {editingProduct ? "Modify Catalog Item" : "Add New Catalog Item"}
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Title</label>
                  <input
                    type="text"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                    placeholder="SaaS Mechanical Keyboard"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Price (in ₹)</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-255 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                    placeholder="2999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-855"
                  placeholder="Workspace keyboard with hot-swappable switches..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Type</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-700 cursor-pointer"
                  >
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Category</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                    placeholder="Electronics"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                    {productForm.type === "digital" ? "Stock Status" : "Inventory Qty"}
                  </label>
                  <input
                    type="number"
                    disabled={productForm.type === "digital"}
                    value={productForm.type === "digital" ? "9999" : productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850 disabled:bg-neutral-50 disabled:text-neutral-400"
                  />
                </div>
              </div>

              {productForm.type === "physical" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                      Product Images (URLs)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setProductForm({
                          ...productForm,
                          imageUrls: [...productForm.imageUrls, ""],
                        })
                      }
                      className="flex items-center gap-1 text-[9px] font-bold text-neutral-900 uppercase tracking-wider hover:text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Add Photo
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {productForm.imageUrls.map((url, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...productForm.imageUrls];
                            newUrls[index] = e.target.value;
                            setProductForm({ ...productForm, imageUrls: newUrls });
                          }}
                          className="flex-1 px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                          placeholder={`Image URL #${index + 1}`}
                        />
                        {productForm.imageUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = productForm.imageUrls.filter((_, i) => i !== index);
                              setProductForm({ ...productForm, imageUrls: newUrls });
                            }}
                            className="p-2 border border-red-100 rounded-xl bg-red-50/30 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            aria-label="Remove image URL"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Image URL</label>
                  <input
                    type="text"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                    placeholder="https://images.unsplash.com/... (optional)"
                  />
                </div>
              )}

              {productForm.type === "digital" && (
                <div className="border border-indigo-50 bg-indigo-50/20 p-4 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Digital File Metadata</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">File Name</label>
                      <input
                        type="text"
                        value={productForm.fileName}
                        onChange={(e) => setProductForm({ ...productForm, fileName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                        placeholder="boilerplate.zip"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">License Model</label>
                      <select
                        value={productForm.licenseType}
                        onChange={(e) => setProductForm({ ...productForm, licenseType: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-700 cursor-pointer"
                      >
                        <option value="Single Developer License">Single Developer</option>
                        <option value="Unlimited Personal License">Unlimited Personal</option>
                        <option value="Single Student Access">Single Student</option>
                        <option value="Standard License">Standard License</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Secure Download Asset URL</label>
                    <input
                      type="text"
                      value={productForm.fileUrl}
                      onChange={(e) => setProductForm({ ...productForm, fileUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                      placeholder="gs://stor-5a57e.appspot.com/... (optional)"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-neutral-900 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm focus:outline-none cursor-pointer"
              >
                {editingProduct ? "Modify Product" : "Publish Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/10 backdrop-blur-sm animate-fade-in">
          <div className="bg-white text-neutral-800 rounded-3xl max-w-sm w-full p-8 shadow-premium border border-neutral-100 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="font-serif text-sm font-bold text-neutral-900">Add Shipping Details</h3>
              <button
                onClick={() => {
                  setShowTrackingModal(false);
                  setSelectedOrderForTracking(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTrackingSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Carrier Service</label>
                <select
                  value={trackingDetails.carrier}
                  onChange={(e) => setTrackingDetails({ ...trackingDetails, carrier: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none bg-white text-neutral-700 cursor-pointer"
                >
                  <option value="BlueDart">BlueDart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="DTDC">DTDC</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="FedEx">FedEx</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Tracking ID / AWB Number</label>
                <input
                  type="text"
                  required
                  value={trackingDetails.number}
                  onChange={(e) => setTrackingDetails({ ...trackingDetails, number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-neutral-450 bg-white text-neutral-850"
                  placeholder="AWB1293810238"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-neutral-900 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm focus:outline-none cursor-pointer"
              >
                Save Tracking Code
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
