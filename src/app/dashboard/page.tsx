"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  getAccountStatus,
  getAccountTransactions,
  getBalance,
  getStellarNetworkStatus,
} from "@/store/slices/accountSlice";
import { loadUser } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChatLayout } from "@/components/layout/ChatLayout";
import TransactionTable from "@/components/dashboard/TransactionTable";
import LiquidityPoolStats from "@/components/widgets/LiquidityPoolStats";
import {
  Activity,
  AlertTriangle,
  Copy,
  Database,
  Droplets,
  ExternalLink,
  ShieldCheck,
  Server,
  Users,
  Wallet,
  Zap,
  Coins,
  Cpu,
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
  const { status, balance, network, transactions } = useAppSelector(
    (state) => state.account,
  );
  const { messages } = useAppSelector((state) => state.chat);

  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiService.getRealtimeStats();
        if (response.success) {
          setMetrics(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch real-time stats", err);
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

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    dispatch(
      getAccountTransactions({
        userId: user.id,
        page: currentPage,
        limit: pageSize,
      }),
    );
  }, [dispatch, isAuthenticated, user?.id, currentPage, pageSize]);

  useEffect(() => {
    const transactionCount = transactions?.transactions?.length ?? 0;
    const count = (currentPage - 1) * pageSize + transactionCount;
    setTotalCount(count);
  }, [currentPage, pageSize, transactions?.transactions?.length]);

  const handlePageChange = (page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

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
      description: "Review your on-chain history",
      action: () => router.push("/transactions"),
    },
  ];

  const latestMessages = [...(messages || [])]
    .slice(-3)
    .reverse();

  const networkStatusLabel =
    network.status === "healthy"
      ? "Healthy"
      : network.status === "degraded"
        ? "Degraded"
        : network.status === "down"
          ? "Down"
          : "Checking";

  const networkStatusColor =
    network.status === "healthy"
      ? "text-green-400"
      : network.status === "degraded"
        ? "text-yellow-400"
        : network.status === "down"
          ? "text-red-400"
          : "text-gray-300";

  const syncStatusLabel =
    network.accountSyncState === "synced"
      ? "Synced"
      : network.accountSyncState === "syncing"
        ? "Syncing"
        : "Desynced";

  const syncStatusColor =
    network.accountSyncState === "synced"
      ? "text-green-400"
      : network.accountSyncState === "syncing"
        ? "text-yellow-400"
        : "text-red-400";

  if (!isAuthenticated) return null;

  const transactionList = transactions?.transactions ?? [];
  const effectiveTotalCount = Math.max(totalCount, transactionList.length);

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-black text-white overflow-hidden relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="text-gray-300">
              Overview of your ChenPilot account, network health, and activity.
            </p>
          </div>

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

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {action.title}
                      </h3>
                      <p className="text-gray-300 mb-4">
                        {action.description}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={action.action}>
                      Get Started
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">
              Recent Activity
            </h2>
            <Card>
              {latestMessages.length > 0 ? (
                <div className="space-y-4">
                  {latestMessages.map((message) => (
                    <div
                      key={message.id}
                      className="flex items-start space-x-3 bg-gray-900/70 p-4 rounded-lg border border-gray-800"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1 ${
                          message.type === "user"
                            ? "bg-blue-400"
                            : "bg-green-400"
                        }`}
                      />
                      <div>
                        <p className="text-sm text-white font-medium">
                          {message.type === "user" ? "You" : "AI Agent"}
                        </p>
                        <p className="text-sm text-gray-300">
                          {message.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-2">
                    No recent messages yet.
                  </p>
                  <p className="text-xs text-gray-500">
                    Once you start chatting with the AI agent, the most recent messages will appear here.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Droplets className="mr-2 h-6 w-6 text-blue-400" />
                Liquidity Pool Statistics
              </h2>
              <div className="flex items-center space-x-2 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800">
                <Activity className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-gray-300">
                  Live Data
                </span>
              </div>
            </div>
            <LiquidityPoolStats />
          </div>

          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Stellar Network
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Network Status
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Activity className={`h-4 w-4 ${networkStatusColor}`} />
                      <span className={`text-lg font-semibold ${networkStatusColor}`}>
                        {networkStatusLabel}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch(getStellarNetworkStatus())}
                  >
                    Refresh
                  </Button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Latest Ledger</span>
                    <span className="text-white font-medium">
                      {network.latestLedger ?? "Loading..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ledger Age</span>
                    <span className="text-white font-medium">
                      {network.ledgerAgeSeconds !== null
                        ? `${network.ledgerAgeSeconds}s`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated</span>
                    <span className="text-white font-medium">
                      {network.lastUpdated
                        ? new Date(network.lastUpdated).toLocaleTimeString()
                        : "Loading..."}
                    </span>
                  </div>
                </div>
                {network.congestion && (
                  <div className="mt-4 flex items-start space-x-2 rounded-lg bg-yellow-500/10 p-3 text-yellow-300">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span className="text-sm">
                      Congestion detected. Transactions may take longer to confirm.
                    </span>
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Account Sync State
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-lg font-semibold ${syncStatusColor}`}>
                        {syncStatusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Based on the latest ledger signal from Horizon.
                    </p>
                  </div>
                </div>
                {network.accountSyncState === "desynced" && (
                  <div className="mt-4 flex items-start space-x-2 rounded-lg bg-red-500/10 p-3 text-red-300">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span className="text-sm">
                      Account appears out of sync. Try refreshing or check network conditions.
                    </span>
                  </div>
                )}
                {network.accountSyncState === "syncing" && (
                  <div className="mt-4 flex items-start space-x-2 rounded-lg bg-yellow-500/10 p-3 text-yellow-300">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span className="text-sm">
                      Syncing with the network. Recent updates may be delayed.
                    </span>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">
              On-Chain Transaction History
            </h2>
            <TransactionTable
              transactions={transactionList}
              isLoading={transactions.isLoading}
              error={transactions.error}
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={effectiveTotalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
