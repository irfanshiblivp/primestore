import { Product } from "@/types";

export const mockProducts: Product[] = [
  // Digital Products
  {
    id: "prod_dig_1",
    title: "SaaS Starter Kit Boilerplate",
    description: "Next.js 15, TypeScript, Tailwind CSS, and Stripe complete integration. Save 100+ hours of setup time.",
    price: 4999,
    type: "digital",
    category: "Source Code",
    images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"],
    stock: 9999,
    createdAt: 1717758349281,
    fileName: "saas-boilerplate-v1.zip",
    licenseType: "Single Developer License"
  },
  {
    id: "prod_dig_2",
    title: "Luxury UI Design System",
    description: "A comprehensive Figma design library containing 500+ component variants in minimalist SaaS styles.",
    price: 2499,
    type: "digital",
    category: "Templates",
    images: ["https://images.unsplash.com/photo-1634973357973-f2ed255753e1?w=800&auto=format&fit=crop&q=80"],
    stock: 9999,
    createdAt: 1717758349281,
    fileName: "luxury-ui-figma.fig",
    licenseType: "Unlimited Personal License"
  },
  {
    id: "prod_dig_3",
    title: "Next.js & React 19 Mastery Course",
    description: "Go from intermediate to advanced Next.js architect. Includes server action deep dives, compiler notes, and more.",
    price: 1999,
    type: "digital",
    category: "Courses",
    images: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"],
    stock: 9999,
    createdAt: 1717758349281,
    fileName: "nextjs-mastery-guide.pdf",
    licenseType: "Single Student Access"
  },
  {
    id: "prod_dig_4",
    title: "SaaS Launch Secrets eBook",
    description: "A detailed blueprint of how we scaled digital products to $10k MRR in less than 6 months.",
    price: 699,
    type: "digital",
    category: "eBooks",
    images: ["https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80"],
    stock: 9999,
    createdAt: 1717758349281,
    fileName: "saas-secrets-ebook.pdf",
    licenseType: "Personal Use Only"
  },

  // Physical Products
  {
    id: "prod_phy_1",
    title: "Mechanical Studio Keyboard",
    description: "Ultra-compact 75% mechanical keyboard with hot-swappable tactile switches and double-shot PBT keycaps.",
    price: 12499,
    type: "physical",
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80"],
    stock: 15,
    createdAt: 1717758349281
  },
  {
    id: "prod_phy_2",
    title: "Merino Wool felt Desk Pad",
    description: "Premium thick merino wool felt table pad. Provides cushioning, quiet typing, and a luxury tactile surface.",
    price: 3499,
    type: "physical",
    category: "Accessories",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"],
    stock: 32,
    createdAt: 1717758349281
  },
  {
    id: "prod_phy_3",
    title: "Anodized Aluminum Phone Stand",
    description: "Precision-milled aerospace aluminum desktop stand. Dual-hinge multi-angle adjustment with rubber grips.",
    price: 1899,
    type: "physical",
    category: "Accessories",
    images: ["https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800&auto=format&fit=crop&q=80"],
    stock: 50,
    createdAt: 1717758349281
  },
  {
    id: "prod_phy_4",
    title: "Minimalist Matte Travel Mug",
    description: "Vacuum insulated double-walled stainless steel mug. 12-hour thermal retention in premium stealth black.",
    price: 2999,
    type: "physical",
    category: "Merchandise",
    images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"],
    stock: 24,
    createdAt: 1717758349281
  }
];

export const mockFaqs = [
  {
    q: "How do I receive digital product downloads?",
    a: "Immediately after checkout, you'll be redirected to a download confirmation page with active links. You can also re-download any purchased files from your customer dashboard under the 'Downloads' tab."
  },
  {
    q: "What payment options are supported?",
    a: "We support secure payments powered by Razorpay. This includes major Credit/Debit cards, Netbanking, UPI, and popular mobile wallets."
  },
  {
    q: "Do you ship physical products internationally?",
    a: "No, we only deliver physical products within India. Domestic delivery times range from 3-7 business days depending on destination state and location."
  },
  {
    q: "Can I cancel or modify my physical order?",
    a: "Orders can be modified or cancelled within 2 hours of payment by visiting your Customer Dashboard or emailing rahoofmanu10@gmail.com. Once shipped, standard returns apply."
  }
];
