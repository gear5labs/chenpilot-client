"use client";
import React from "react";

interface Feature {
  title: string;
  description: string;
}

const features: Feature[] = [
  { title: "AI-Powered", description: "Natural language DeFi operations" },
  { title: "Lightning Fast", description: "120K TPS blockchain performance" },
  { title: "Secure", description: "Trustless and decentralized" },
  { title: "Multi-Chain", description: "Bitcoin & Stellar support" },
];

export default function Features() {
  return (
    <div className="space-y-12">
      <div>
        <span className="text-xs text-white/40 font-light tracking-[0.3em] uppercase block mb-6">
          Welcome Back
        </span>
        <h1 className="text-5xl md:text-6xl font-thin text-white mb-6">
          Sign <span className="text-purple-500">In</span>
        </h1>
        <p className="text-base text-white/40 font-light leading-relaxed max-w-lg">
          Continue your journey with AI-powered crypto trading across multiple
          chains
        </p>
      </div>

      <div className="space-y-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group border-l border-white/10 pl-6 hover:border-purple-500/50 transition-all duration-500"
          >
            <h3 className="text-lg font-light text-white mb-2 group-hover:text-purple-500 transition-colors duration-500">
              {feature.title}
            </h3>
            <p className="text-sm text-white/40 font-light leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-white/10">
        <div className="flex items-center gap-8">
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
