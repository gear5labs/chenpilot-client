"use client";
import React from "react";

const capabilities = [
  {
    text: "Swap 100 USDC to XLM and lend it on Blend",
    category: "Trade",
  },
  {
    text: "Send 20 USDC from Stellar to Bitcoin Lightning",
    category: "Bridge",
  },
  {
    text: "Deploy a new Stellar account and fund it",
    category: "Deploy",
  },
  {
    text: "Create a contact for 0x123...abc",
    category: "Manage",
  },
  {
    text: "What is my current wallet balance?",
    category: "Query",
  },
  {
    text: "Show me my recent transactions",
    category: "History",
  },
];

export default function Capabilities() {
  return (
    <section className="relative py-40 bg-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="absolute top-0 left-0 right-0 h-px bg-white/10"></div>

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-24">
          <span className="text-xs text-white/40 font-light tracking-[0.3em] uppercase mb-4 block">
            Natural Language Commands
          </span>
          <h2 className="text-5xl md:text-6xl font-thin text-white mb-6">
            Just <span className="text-purple-500">Ask</span>
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto font-light">
            Complex operations made simple through conversation
          </p>
        </div>

        <div className="space-y-3">
          {capabilities.map((capability, idx) => (
            <div key={idx} className="group relative">
              <div className="flex items-start gap-6 p-8 border border-white/5 hover:border-white/10 transition-all duration-500">
                <div className="flex-shrink-0 pt-1">
                  <span className="text-xs text-white/30 font-light tracking-wider">
                    {capability.category.toUpperCase()}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-lg text-white/60 group-hover:text-white/90 font-light transition-colors duration-500">
                    "{capability.text}"
                  </p>
                </div>

                <div className="flex-shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-white/30 font-light">
            And thousands more combinations
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10"></div>
    </section>
  );
}
