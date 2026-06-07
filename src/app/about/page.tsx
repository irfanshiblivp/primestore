"use client";

import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Sparkles, Shield, Cpu, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white">
        <section className="bg-slate-50 py-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[80px]" />
          <div className="mx-auto max-w-3xl px-4 sm:px-6 relative z-10 space-y-6">
            <span className="text-xs text-primary font-bold uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
              Our Vision
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
              Design is in the details.
            </h1>
            <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
              Prime Store is founded on a simple philosophy: curate exceptional desk setups, hardware, and engineering assets for builders and creators who refuse to compromise.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Premium Hardware meets Digital Products
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                We bridge the physical and digital spaces. Whether you want custom machined aluminum phone stands and dense wool desk pads to perfect your physical workspace, or production-ready Next.js starter templates and Figma layouts to build your next startup in days, we have you covered.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Every digital product is audited for cleanliness and safety, and physical curations undergo intensive quality checks before leaving our fulfillment centers.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-2">
                <div className="h-9 w-9 bg-blue-50 rounded-xl flex items-center justify-center text-primary mb-3">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Exquisite Aesthetics</h4>
                <p className="text-[10px] text-slate-400">Minimal designs that look premium in any workspace setup.</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-2">
                <div className="h-9 w-9 bg-purple-50 rounded-xl flex items-center justify-center text-secondary mb-3">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Secure Pipelines</h4>
                <p className="text-[10px] text-slate-400">Razorpay standard integrations and encrypted file downloads.</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-2">
                <div className="h-9 w-9 bg-cyan-50 rounded-xl flex items-center justify-center text-accent mb-3">
                  <Cpu className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Clean Architectures</h4>
                <p className="text-[10px] text-slate-400">TypeScript, React, and server-side verification hooks.</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-2">
                <div className="h-9 w-9 bg-green-50 rounded-xl flex items-center justify-center text-green-500 mb-3">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Express Delivery</h4>
                <p className="text-[10px] text-slate-400">Instant downloadable links and rapid shipping tracking.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
