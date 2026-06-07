"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useToast } from "@/context/ToastContext";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";

export default function ContactPage() {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      showToast("Thank you! Your message has been sent to our support desk.", "success");
      setForm({ name: "", email: "", subject: "", message: "" });
      setSubmitting(false);
    }, 1500);
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white min-h-[75vh]">
        <section className="bg-slate-50 py-16 text-center">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">Contact Support</h1>
            <p className="text-slate-500 text-sm mt-2">Have a question about shipping or file delivery? We are here to help.</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            
            {/* Contact Details Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-6">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Get in Touch</h3>
                
                <div className="flex items-start gap-4 text-xs text-slate-600">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-800">Support Email</h4>
                    <p className="text-slate-400 mt-1">support@primestore.com</p>
                    <p className="text-slate-400 mt-0.5 font-medium">Response within 2 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-xs text-slate-600">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-800">Call Center</h4>
                    <p className="text-slate-400 mt-1">+91 (22) 4893-9201</p>
                    <p className="text-slate-400 mt-0.5 font-medium">Mon - Sat, 9 AM - 6 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-xs text-slate-600">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-800">HQ Office</h4>
                    <p className="text-slate-500 mt-1">Prime Store India Ltd,</p>
                    <p className="text-slate-500">Maker Maxity, BKC, Mumbai,</p>
                    <p className="text-slate-500">Maharashtra, 400051</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message form */}
            <div className="lg:col-span-2 border border-slate-100 rounded-2xl p-8 bg-white shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 text-sm">Send a Direct Message</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1.5 font-semibold">Your Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1.5 font-semibold">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5 font-semibold">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-primary transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5 font-semibold">Message</label>
                  <textarea
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-primary transition-all resize-none bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:bg-slate-400"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Message
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
