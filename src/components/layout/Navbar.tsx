"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Menu, X, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Catalog", href: "/products" },
    { label: "Digital Assets", href: "/digital" },
    { label: "Physical Product", href: "/physical" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-neutral-100/80 transition-all duration-300">
      <div className="mx-auto flex max-w-7xl h-20 items-center justify-between px-6 sm:px-8">
        
        {/* Logo / Brand Logotype */}
        <div className="flex items-center">
          <Link href="/" className="group flex items-center gap-1.5 font-serif text-lg tracking-[0.15em] font-extrabold text-primary transition-opacity hover:opacity-85">
            PRIME<span className="text-secondary font-sans font-semibold text-[10px] tracking-widest align-super">STORE</span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-xs font-semibold uppercase tracking-wider transition-all duration-200 relative py-2 hover:text-secondary",
                pathname === link.href 
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary" 
                  : "text-neutral-500 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-secondary after:transition-all after:duration-300"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User Menus & Interactive Triggers */}
        <div className="flex items-center space-x-2.5">
          {/* Shopping Bag Button */}
          <Link 
            href="/cart" 
            className="group relative p-2.5 rounded-full hover:bg-neutral-50 text-neutral-600 hover:text-secondary transition-all duration-200"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="h-4.5 w-4.5 stroke-[2]" />
            {cartItemsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-fade-in-scale">
                {cartItemsCount}
              </span>
            )}
          </Link>
 
          {/* User authenticated section */}
          {user && isAdmin ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-neutral-50 focus:outline-none transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-xs text-white uppercase tracking-wider shadow-sm transition-transform duration-200 hover:scale-105">
                  {profile?.name ? profile.name[0] : user.email?.[0] || "A"}
                </div>
              </button>

              {/* Profile Dropdown panel */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border border-neutral-100/90 bg-white/95 backdrop-blur-md p-2 shadow-premium ring-1 ring-black/5 focus:outline-none z-20 animate-fade-in-scale">
                    <div className="px-3.5 py-3 border-b border-neutral-100/60">
                      <p className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Administrator</p>
                      <p className="text-xs font-bold text-neutral-800 truncate mt-0.5">{profile?.name || user.email}</p>
                    </div>
                    <div className="py-1.5">
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                      >
                        <Shield className="h-4 w-4 stroke-[2]" />
                        Admin Workspace
                      </Link>
                      <button
                        onClick={async () => {
                          setProfileDropdownOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-red-650 hover:text-red-700 hover:bg-red-50/50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4 stroke-[2]" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Mobile Menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-full hover:bg-neutral-50 text-neutral-600 hover:text-primary md:hidden focus:outline-none transition-all duration-200 cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 stroke-[2]" /> : <Menu className="h-5 w-5 stroke-[2]" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white/95 backdrop-blur-md py-4 px-6 space-y-2.5 shadow-lg animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className={cn(
                "block py-2.5 text-sm font-semibold tracking-wide rounded-xl px-3 transition-all",
                pathname === link.href 
                  ? "bg-neutral-900 text-white" 
                  : "text-neutral-650 hover:text-neutral-900 hover:bg-neutral-50"
              )}
            >
              {link.label}
            </Link>
          ))}
          {user && isAdmin ? (
            <div className="border-t border-neutral-100 pt-4 mt-3 space-y-2">
              <p className="px-3 text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">Account: {profile?.name || user.email}</p>
              <Link
                href="/admin"
                onClick={handleLinkClick}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-secondary rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <Shield className="h-4.5 w-4.5" />
                Admin Workspace
              </Link>
              <button
                onClick={async () => {
                  handleLinkClick();
                  await logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-red-650 rounded-xl hover:bg-red-50/50 transition-colors text-left"
              >
                <LogOut className="h-4.5 w-4.5" />
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}
