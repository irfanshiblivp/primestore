import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency (INR)
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Order status styling
export function getStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "processing":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "shipped":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "delivered":
      return "bg-green-50 text-green-700 border-green-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

import { Product } from "@/types";

export function normalizeProduct(p: any): Product {
  if (!p) return p;
  return {
    id: p.id || "",
    title: p.title || p.name || "",
    description: p.description || p.desc || "",
    price: Number(p.price || 0),
    type: p.type || "digital",
    category: p.category || "",
    images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
    stock: p.stock !== undefined ? Number(p.stock) : 9999,
    createdAt: p.createdAt || Date.now(),
    fileUrl: p.fileUrl || p.downloadLink || "",
    fileName: p.fileName || "",
    licenseType: p.licenseType || "",
  };
}

