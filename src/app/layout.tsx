import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "Prime Store | Premium Digital & Physical Goods",
  description:
    "Discover an exquisite collection of hand-picked premium physical products and elite digital assets. Fast shipping, instant downloads, and a luxury checkout experience.",
  keywords: "ecommerce, premium design, courses, ebooks, luxury store, software, templates",
  authors: [{ name: "Prime Store Team" }],
  openGraph: {
    title: "Prime Store | Premium eCommerce",
    description: "Hand-picked physical and digital goods with a luxury experience.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
