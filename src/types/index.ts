export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  type: "physical" | "digital";
  category: string;
  images: string[];
  stock: number;
  createdAt: number;
  // Digital specific fields embedded in catalog for ease
  fileUrl?: string; // Stored in digitalProducts in Firebase but exposed in UI
  fileName?: string;
  licenseType?: string;
}

export interface DigitalProductDetails {
  id: string;
  fileUrl: string;
  fileName: string;
  licenseType: string;
}

export interface ShippingAddress {
  fullName: string;
  mobileNumber: string;
  houseName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  type: "physical" | "digital";
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  email: string;
  type: "physical" | "digital" | "mixed";
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "failed" | "pending_verification" | "rejected";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  shippingAddress?: ShippingAddress;
  customerDetails?: {
    fullName: string;
    mobileNumber: string;
  };
  createdAt: number;
  trackingNumber?: string;
  trackingCarrier?: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  createdAt: number;
  savedAddresses?: Record<string, ShippingAddress>;
}
