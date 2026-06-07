"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { auth, db, ref, get, set, remove, push, query, orderByChild, equalTo } from "@/lib/firebase";
import { formatPrice, formatDate, getStatusStyle } from "@/lib/utils";
import { Order, OrderItem, ShippingAddress } from "@/types";
import {
  User,
  ShoppingBag,
  Download,
  MapPin,
  Settings,
  Loader2,
  Trash2,
  Plus,
  Eye,
  X,
  Truck,
} from "lucide-react";

type TabType = "overview" | "orders" | "downloads" | "addresses" | "settings";

function CustomerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  interface DashboardDownload {
    productId: string;
    title: string;
    fileName: string;
    licenseType: string;
    orderId: string;
    orderNumber: string;
    purchaseDate: number;
    downloadCount: number;
  }

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [downloads, setDownloads] = useState<DashboardDownload[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Expandable order state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Address form states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: "",
    mobileNumber: "",
    houseName: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  // Profile update state
  const [displayName, setDisplayName] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Sync tab from URL if present
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "orders", "downloads", "addresses", "settings"].includes(tabParam)) {
      Promise.resolve().then(() => {
        setActiveTab(tabParam as TabType);
      });
    }
  }, [searchParams]);

  // Auth Protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login?redirect=/dashboard");
      } else if (!isAdmin) {
        router.push("/");
      }
    }
  }, [user, isAdmin, authLoading, router]);

  // Load orders and downloads
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    async function loadDashboardData() {
      try {
        setLoadingData(true);
        // Load orders
        const ordersRef = ref(db, "orders");
        const ordersQuery = query(ordersRef, orderByChild("userId"), equalTo(uid));
        const ordersSnapshot = await get(ordersQuery);
        
        if (ordersSnapshot.exists()) {
          const list = Object.values(ordersSnapshot.val()) as Order[];
          list.sort((a, b) => b.createdAt - a.createdAt);
          setOrders(list);
        } else {
          setOrders([]);
        }

        // Load downloads
        const downloadsRef = ref(db, `downloads/${uid}`);
        const downloadsSnapshot = await get(downloadsRef);
        if (downloadsSnapshot.exists()) {
          const list = Object.values(downloadsSnapshot.val()) as DashboardDownload[];
          list.sort((a, b) => b.purchaseDate - a.purchaseDate);
          setDownloads(list);
        } else {
          setDownloads([]);
        }

        if (profile) {
          setDisplayName(profile.name);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [user, profile]);

  const handleDownload = async (productId: string, fileName: string) => {
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        showToast("Session expired. Please sign in again.", "error");
        return;
      }
      const url = `/api/download?productId=${productId}&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
      showToast(`Initiating download: ${fileName}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Download failed.", "error");
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const addressRef = push(ref(db, `users/${user.uid}/savedAddresses`));
      await set(addressRef, newAddr);
      showToast("Address saved successfully!", "success");
      setShowAddressForm(false);
      setNewAddr({
        fullName: "",
        mobileNumber: "",
        houseName: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
      });
      // Refresh page to sync context profile
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to save address.", "error");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    try {
      await remove(ref(db, `users/${user.uid}/savedAddresses/${addressId}`));
      showToast("Address deleted.", "success");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Could not delete address.", "error");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setUpdatingProfile(true);
    try {
      await set(ref(db, `users/${user.uid}/name`), displayName.trim());
      showToast("Profile updated successfully!", "success");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Could not update profile.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "orders", label: "My Orders", icon: ShoppingBag },
    { id: "downloads", label: "Downloads", icon: Download },
    { id: "addresses", label: "Saved Addresses", icon: MapPin },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white min-h-[75vh]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Sidebar Tab Selector */}
            <aside className="w-full md:w-64 shrink-0 space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
              <div className="px-3 py-2 border border-slate-50 rounded-xl bg-slate-50/50 mb-4 hidden md:block">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Logged in as</p>
                <p className="text-sm font-bold text-slate-800 truncate mt-1">{profile?.name || user.email}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{profile?.role} Account</p>
              </div>

              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all focus:outline-none ${
                      activeTab === tab.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {tab.label}
                  </button>
                );
              })}
            </aside>

            {/* Dashboard Workspace */}
            <div className="flex-1 w-full space-y-6 animate-fade-in">
              {loadingData ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : (
                <>
                  {/* OVERVIEW TAB */}
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-slate-900">
                          Welcome, {profile?.name || "Customer"}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Manage orders, file downloads, and profiles.</p>
                      </div>

                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-5 space-y-2">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Orders</p>
                          <p className="text-2xl font-extrabold text-slate-900">{orders.length}</p>
                        </div>
                        <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-5 space-y-2">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">My Downloads</p>
                          <p className="text-2xl font-extrabold text-slate-900">{downloads.length}</p>
                        </div>
                        <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-5 space-y-2">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Saved Addresses</p>
                          <p className="text-2xl font-extrabold text-slate-900">
                            {profile?.savedAddresses ? Object.keys(profile.savedAddresses).length : 0}
                          </p>
                        </div>
                      </div>

                      {/* Recent Orders List */}
                      <div className="border border-slate-100 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm">Recent Activity</h3>
                        {orders.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No orders logged yet.</p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {orders.slice(0, 3).map((order) => (
                              <div key={order.id} className="flex justify-between items-center py-3 text-xs">
                                <div>
                                  <p className="font-semibold text-slate-800">{order.orderNumber}</p>
                                  <p className="text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800">{formatPrice(order.totalAmount)}</p>
                                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border ${getStatusStyle(order.status)}`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ORDERS TAB */}
                  {activeTab === "orders" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-slate-900">Order History</h2>
                        <p className="text-sm text-slate-400 mt-1">Review orders and track delivery statuses.</p>
                      </div>

                      {orders.length === 0 ? (
                        <div className="text-center py-12 border border-slate-100 rounded-2xl bg-slate-50/50">
                          <p className="text-sm text-slate-400">No purchases found in history.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order) => {
                            const isExpanded = expandedOrderId === order.id;
                            return (
                              <div
                                key={order.id}
                                className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm"
                              >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-5 gap-3 border-b border-slate-50">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Number</span>
                                    <p className="text-sm font-bold text-slate-800">{order.orderNumber}</p>
                                    <p className="text-[11px] text-slate-400">{formatDate(order.createdAt)}</p>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-6">
                                    <div>
                                      <p className="text-xs text-slate-400">Total Price</p>
                                      <p className="text-sm font-extrabold text-slate-900">{formatPrice(order.totalAmount)}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${getStatusStyle(order.status)}`}>
                                      {order.status}
                                    </span>
                                    <button
                                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                      className="p-1.5 hover:text-primary text-slate-400 transition-colors focus:outline-none"
                                    >
                                      <Eye className="h-4.5 w-4.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                  <div className="p-5 bg-slate-50/50 border-t border-slate-100 text-xs space-y-6 animate-fade-in">
                                    {/* Order Items */}
                                    <div>
                                      <h4 className="font-bold text-slate-800 mb-2.5">Purchased Items</h4>
                                      <div className="space-y-2">
                                        {order.items?.map((item: OrderItem, idx: number) => (
                                          <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-lg">
                                            <div>
                                              <p className="font-semibold text-slate-800">{item.title}</p>
                                              <p className="text-[10px] text-slate-400 mt-0.5">Qty: {item.quantity} | {item.type}</p>
                                            </div>
                                            <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Physical Shipping details */}
                                    {order.shippingAddress && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                        <div>
                                          <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                                            <Truck className="h-4 w-4 text-slate-400" />
                                            Shipping Destination
                                          </h4>
                                          <p className="font-medium text-slate-700">{order.shippingAddress.fullName}</p>
                                          <p className="text-slate-500 mt-1">{order.shippingAddress.houseName}, {order.shippingAddress.address}</p>
                                          <p className="text-slate-500">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                                          <p className="text-slate-400 mt-1">Mob: {order.shippingAddress.mobileNumber}</p>
                                        </div>

                                        {/* Tracking details */}
                                        <div className="space-y-1.5">
                                          <h4 className="font-bold text-slate-800">Delivery Status &amp; Tracking</h4>
                                          {order.trackingNumber ? (
                                            <div className="space-y-1">
                                              <p className="text-slate-700">
                                                Carrier: <strong className="text-slate-900">{order.trackingCarrier || "BlueDart"}</strong>
                                              </p>
                                              <p className="text-slate-700">
                                                Tracking ID: <strong className="text-slate-900">{order.trackingNumber}</strong>
                                              </p>
                                              <span className="inline-block mt-2 rounded bg-blue-50 text-blue-600 px-2 py-1 font-bold text-[10px]">
                                                In Transit
                                              </span>
                                            </div>
                                          ) : (
                                            <p className="text-slate-400 italic">Tracking details will be posted once dispatched.</p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DOWNLOADS TAB */}
                  {activeTab === "downloads" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-slate-900">Purchased Products</h2>
                        <p className="text-sm text-slate-400 mt-1">Access and re-download your digital file keys.</p>
                      </div>

                      {downloads.length === 0 ? (
                        <div className="text-center py-12 border border-slate-100 rounded-2xl bg-slate-50/50">
                          <p className="text-sm text-slate-400">No digital assets purchased yet.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {downloads.map((dl) => (
                            <div
                              key={dl.productId}
                              className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between"
                            >
                              <div className="space-y-2">
                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase tracking-wider">
                                  {dl.licenseType}
                                </span>
                                <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{dl.title}</h4>
                                <p className="text-[10px] text-slate-400 truncate">File: {dl.fileName}</p>
                                <p className="text-[10px] text-slate-400">Purchased: {formatDate(dl.purchaseDate)}</p>
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] text-slate-400">
                                <span>Downloads: {dl.downloadCount || 0}</span>
                                <button
                                  onClick={() => handleDownload(dl.productId, dl.fileName)}
                                  className="flex items-center gap-1 bg-slate-900 hover:bg-primary text-white text-[10px] font-bold rounded-lg px-3 py-1.5 transition-colors focus:outline-none"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ADDRESSES TAB */}
                  {activeTab === "addresses" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="font-serif text-2xl font-bold text-slate-900">Saved Addresses</h2>
                          <p className="text-sm text-slate-400 mt-1">Configure default destination addresses for orders.</p>
                        </div>
                        {!showAddressForm && (
                          <button
                            onClick={() => setShowAddressForm(true)}
                            className="flex items-center gap-1 rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add New
                          </button>
                        )}
                      </div>

                      {/* New Address form */}
                      {showAddressForm && (
                        <form onSubmit={handleAddAddress} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4 animate-fade-in text-xs">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-2">
                            <h3 className="font-bold text-slate-800">Add shipping destination</h3>
                            <button
                              type="button"
                              onClick={() => setShowAddressForm(false)}
                              className="text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-semibold">Receiver Name</label>
                              <input
                                type="text"
                                required
                                value={newAddr.fullName}
                                onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-semibold">Mobile Number</label>
                              <input
                                type="tel"
                                required
                                value={newAddr.mobileNumber}
                                onChange={(e) => setNewAddr({ ...newAddr, mobileNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-slate-500 mb-1.5 font-semibold">House Name / Apartment / Office</label>
                              <input
                                type="text"
                                required
                                value={newAddr.houseName}
                                onChange={(e) => setNewAddr({ ...newAddr, houseName: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-slate-500 mb-1.5 font-semibold">Street Address / Locality</label>
                              <input
                                type="text"
                                required
                                value={newAddr.address}
                                onChange={(e) => setNewAddr({ ...newAddr, address: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-semibold">City</label>
                              <input
                                type="text"
                                required
                                value={newAddr.city}
                                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-semibold">State</label>
                              <input
                                type="text"
                                required
                                value={newAddr.state}
                                onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-semibold">Pincode</label>
                              <input
                                type="text"
                                required
                                maxLength={6}
                                value={newAddr.pincode}
                                onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-semibold">Country</label>
                              <input
                                type="text"
                                required
                                value={newAddr.country}
                                onChange={(e) => setNewAddr({ ...newAddr, country: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                          
                          <button
                            type="submit"
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2.5 font-semibold"
                          >
                            Save Destination
                          </button>
                        </form>
                      )}

                      {/* Saved addresses lists */}
                      {!profile?.savedAddresses || Object.keys(profile.savedAddresses).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No saved addresses found. You can add one during checkouts or via form above.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(profile.savedAddresses).map(([key, addr]: [string, ShippingAddress]) => (
                            <div
                              key={key}
                              className="border border-slate-100 p-5 rounded-2xl bg-white shadow-sm flex flex-col justify-between text-xs"
                            >
                              <div className="space-y-1">
                                <h4 className="font-bold text-slate-800">{addr.fullName || profile.name}</h4>
                                <p className="text-slate-500">{addr.houseName}, {addr.address}</p>
                                <p className="text-slate-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                                <p className="text-slate-400 font-medium mt-1">Mobile: {addr.mobileNumber}</p>
                              </div>
                              <div className="mt-4 border-t border-slate-50 pt-3 flex justify-end">
                                <button
                                  onClick={() => handleDeleteAddress(key)}
                                  className="text-slate-300 hover:text-red-500 p-1.5 transition-colors focus:outline-none"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SETTINGS TAB */}
                  {activeTab === "settings" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-slate-900">Account Settings</h2>
                        <p className="text-sm text-slate-400 mt-1">Configure profile and authentication details.</p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm max-w-md">
                        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                          <div>
                            <label className="block text-slate-500 mb-1.5 font-semibold">User Email (Read-only)</label>
                            <input
                              type="email"
                              disabled
                              value={user.email || ""}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-500 mb-1.5 font-semibold">Display Name</label>
                            <input
                              type="text"
                              required
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-primary transition-all"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={updatingProfile}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 font-semibold flex items-center justify-center gap-1.5"
                          >
                            {updatingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                            Update Settings
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

      <Footer />
    </>
  );
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    }>
      <CustomerDashboardContent />
    </Suspense>
  );
}
