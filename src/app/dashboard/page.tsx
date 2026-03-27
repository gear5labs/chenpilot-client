"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  getAccountStatus,
  getBalance,
  getStellarNetworkStatus,
} from "@/store/slices/accountSlice";
import { loadUser } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChatLayout } from "@/components/layout/ChatLayout";
import {
  Copy,
  ExternalLink,
  ShieldCheck,
  Wallet,
  Coins,
  Zap,
  Activity,
  Users,
  Server,
  Cpu,
  Database,
} from "lucide-react";
import { formatAddress, formatTokenAmount } from "@/utils/format";
import apiService from "@/services/api";
import { RealtimeMetrics } from "@/types/agent";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { status, balance } = useAppSelector((state) => state.account);
  // const { messages } = useAppSelector((state) => state.chat);

  // Real-time Metrics State
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    dispatch(loadUser());
    dispatch(getAccountStatus());
    dispatch(getBalance());

    const pollInterval = setInterval(() => {
      if (!status?.isDeployed || !status?.isFunded) {
        dispatch(getAccountStatus());
      }
      dispatch(getBalance());
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [dispatch, isAuthenticated, router, status?.isDeployed, status?.isFunded]);

  // Real-time Metrics Polling (5 seconds)
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiService.getRealtimeStats();
        if (response.success) {
          setMetrics(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch real-time stats");
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const refreshNetworkStatus = () => dispatch(getStellarNetworkStatus());
    refreshNetworkStatus();
    const interval = setInterval(refreshNetworkStatus, 15000);
    return () => clearInterval(interval);
  }, [dispatch, isAuthenticated]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const quickActions = [
    {
      title: "Chat with AI Agent",
      description: "Ask questions or execute DeFi operations",
      action: () => router.push("/chat"),
    },
    {
      title: "Manage Contacts",
      description: "Add and organize your contacts",
      action: () => router.push("/contacts"),
    },
    {
      title: "View Transactions",
      description: "Check your transaction history",
      action: () => router.push("/transactions"),
    },
  ];

  if (!isAuthenticated) return null;

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-black text-white overflow-hidden relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 overflow-y-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="text-gray-300">
              Overview of your ChenPilot account and system health.
            </p>
          </div>

          {/* Admin Real-time Metrics Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Activity className="mr-2 h-6 w-6 text-purple-500" />
              System Live Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="flex items-center justify-between p-6 bg-gray-900/40 border-gray-800">
                <div>
                  <p className="text-sm text-gray-400">Active Users</p>
                  <h3 className="text-2xl font-bold text-white">
                    {metrics?.activeUsers ?? 0}
                  </h3>
                </div>
                <Users className="text-blue-500 h-8 w-8" />
              </Card>

              <Card className="flex items-center justify-between p-6 bg-gray-900/40 border-gray-800">
                <div>
                  <p className="text-sm text-gray-400">Server Status</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full animate-pulse",
                        metrics?.serverHealth === "healthy"
                          ? "bg-green-500"
                          : "bg-red-500",
                      )}
                    />
                    <h3 className="text-2xl font-bold capitalize text-white">
                      {metrics?.serverHealth ?? "Checking..."}
                    </h3>
                  </div>
                </div>
                <Server
                  className={cn(
                    "h-8 w-8",
                    metrics?.serverHealth === "healthy"
                      ? "text-green-500"
                      : "text-red-500",
                  )}
                />
              </Card>

              <Card className="flex items-center justify-between p-6 bg-gray-900/40 border-gray-800">
                <div>
                  <p className="text-sm text-gray-400">CPU Load</p>
                  <h3 className="text-2xl font-bold text-white">
                    {metrics?.cpuUsage ?? 0}%
                  </h3>
                </div>
                <Cpu className="text-purple-500 h-8 w-8" />
              </Card>

              <Card className="flex items-center justify-between p-6 bg-gray-900/40 border-gray-800">
                <div>
                  <p className="text-sm text-gray-400">Memory Usage</p>
                  <h3 className="text-2xl font-bold text-white">
                    {metrics?.memoryUsage ?? 0}%
                  </h3>
                </div>
                <Database className="text-orange-500 h-8 w-8" />
              </Card>
            </div>
          </section>

          {/* Account Lifecycle Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <ShieldCheck className="mr-2 h-6 w-6 text-blue-400" />
              Account Lifecycle
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card
                className={cn(
                  "relative border-2 transition-all duration-500",
                  status?.address
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-gray-800",
                )}
              >
                <div className="flex items-center mb-2">
                  <Wallet
                    className={cn(
                      "h-5 w-5 mr-3",
                      status?.address ? "text-green-400" : "text-gray-400",
                    )}
                  />
                  <h3
                    className={cn(
                      "font-bold",
                      status?.address ? "text-green-400" : "text-gray-400",
                    )}
                  >
                    1. Created
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Identity established on-chain.
                </p>
                {status?.address && (
                  <div className="text-xs font-mono bg-black/40 p-2 rounded border border-gray-800 text-gray-300 flex justify-between items-center">
                    {formatAddress(status.address)}
                    <button
                      onClick={() => copyToClipboard(status.address, "Address")}
                      className="hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </Card>

              <Card
                className={cn(
                  "relative border-2 transition-all duration-500",
                  status?.isFunded
                    ? "border-green-500/50 bg-green-500/5"
                    : status?.address
                      ? "border-blue-500/30 bg-blue-500/5"
                      : "border-gray-800 opacity-50",
                )}
              >
                <div className="flex items-center mb-2">
                  <Coins
                    className={cn(
                      "h-5 w-5 mr-3",
                      status?.isFunded ? "text-green-400" : "text-blue-400",
                    )}
                  />
                  <h3
                    className={cn(
                      "font-bold",
                      status?.isFunded ? "text-green-400" : "text-blue-400",
                    )}
                  >
                    2. Funded
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Resources added for operations.
                </p>
                <div className="text-xl font-bold text-white">
                  {balance
                    ? formatTokenAmount(balance.balance, 4, "STRK")
                    : "0.00 STRK"}
                </div>
              </Card>

              <Card
                className={cn(
                  "relative border-2 transition-all duration-500",
                  status?.isDeployed
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-gray-800 opacity-50",
                )}
              >
                <div className="flex items-center mb-2">
                  <Zap
                    className={cn(
                      "h-5 w-5 mr-3",
                      status?.isDeployed ? "text-green-400" : "text-purple-400",
                    )}
                  />
                  <h3
                    className={cn(
                      "font-bold",
                      status?.isDeployed ? "text-green-400" : "text-purple-400",
                    )}
                  >
                    3. Deployed
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Account live and DeFi-ready.
                </p>
                {status?.isDeployed ? (
                  <span className="text-xs py-1 px-2 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                    Full Access
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">
                    Waiting for activation
                  </span>
                )}
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {quickActions.map((action, i) => (
              <Card
                key={i}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={action.action}
              >
                <h3 className="text-lg font-semibold text-white mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {action.description}
                </p>
                <Button variant="ghost" size="sm">
                  Get Started <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
