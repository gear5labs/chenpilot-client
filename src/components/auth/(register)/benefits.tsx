"use client";
import React from "react";

interface Benefit {
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    title: "AI Assistant",
    description: "Get help with complex DeFi operations",
  },
  {
    title: "Fast Transactions",
    description: "120K TPS blockchain performance",
  },
  { title: "Secure Wallet", description: "Your keys, your crypto" },
  { title: "Multi-Chain", description: "Bitcoin & Stellar support" },
];

export function Benefits() {
  return (
    <div className="space-y-12">

      <div>
        <span className="text-xs text-white/40 font-light tracking-[0.3em] uppercase block mb-6">
          Join ChenPilot
        </span>
        <h1 className="text-5xl md:text-6xl font-thin text-white mb-6">
          Start Your <span className="text-purple-500">Journey</span>
        </h1>
        <p className="text-base text-white/40 font-light leading-relaxed max-w-lg">
          Create your account and start your journey into the future of DeFi
          with AI-powered assistance.
        </p>
      </div>


      <div className="space-y-6">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className="group border-l border-white/10 pl-6 hover:border-purple-500/50 transition-all duration-500"
          >
            <h3 className="text-lg font-light text-white mb-2 group-hover:text-purple-500 transition-colors duration-500">
              {benefit.title}
            </h3>
            <p className="text-sm text-white/40 font-light leading-relaxed">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>

      {/* Free to Start / Stats Section */}
      <div className="pt-8 border-t border-white/10">
        <div className="flex items-center gap-8">
          <div>
            <div className="text-2xl font-thin text-white mb-1">Free</div>
            <div className="text-xs text-white/40 font-light">To Start</div>
          </div>
          <span className="w-px h-12 bg-white/10"></span>
          <div>
            <div className="text-2xl font-thin text-white mb-1">10+</div>
            <div className="text-xs text-white/40 font-light">Active Users</div>
          </div>
          <span className="w-px h-12 bg-white/10"></span>
          <div>
            <div className="text-2xl font-thin text-white mb-1">$300+</div>
            <div className="text-xs text-white/40 font-light">Volume</div>
          </div>
          <span className="w-px h-12 bg-white/10"></span>
          <div>
            <div className="text-2xl font-thin text-white mb-1">3</div>
            <div className="text-xs text-white/40 font-light">Chains</div>
          </div>
        </div>
      </div>
    </div>
  );
}
