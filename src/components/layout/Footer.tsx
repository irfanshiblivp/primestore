"use client";

import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 mt-auto text-neutral-400">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Info Columns */}
          <div className="space-y-4 col-span-1 md:col-span-2">
            <Link href="/" className="font-serif text-lg tracking-[0.15em] font-extrabold text-white hover:opacity-85 transition-opacity">
              PRIME<span className="text-secondary font-sans font-semibold text-[10px] tracking-widest align-super">STORE</span>
            </Link>
            <p className="text-xs font-medium text-neutral-500 leading-relaxed max-w-sm">
              Discover a hand-curated collection of premium physical hardware assets and luxury digital source code templates. Built for modern builders.
            </p>
          </div>

          {/* Links Column 1 */}
          <div>
            <h3 className="text-[10px] font-bold text-neutral-200 uppercase tracking-widest">Collections</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/digital" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  Digital Products
                </Link>
              </li>
              <li>
                <Link href="/physical" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  Physical Products
                </Link>
              </li>
              <li>
                <Link href="/products?category=Courses" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  Digital Academy
                </Link>
              </li>
              <li>
                <Link href="/products?category=Accessories" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  Premium Gear
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h3 className="text-[10px] font-bold text-neutral-200 uppercase tracking-widest">Information</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  About Collection
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  Direct Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Lower row details */}
        <div className="mt-16 border-t border-neutral-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-neutral-550">
          <p>&copy; {new Date().getFullYear()} Prime Store. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Designed with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" /> for creators.
          </p>
        </div>
      </div>
    </footer>
  );
}
