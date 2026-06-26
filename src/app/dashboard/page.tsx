'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { getAccountStatus, getBalance, deployAccount, fundAccount, getStellarNetworkStatus, getAccountTransactions } from '@/store/slices/accountSlice';
import { loadUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatLayout } from '@/components/layout/ChatLayout';
import TransactionTable from '@/components/dashboard/TransactionTable';
import {
  Copy,
  ExternalLink,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
  Wallet,
  Coins,
  Zap,
  Activity,
  AlertTriangle,
  Droplets
} from 'lucide-react';
import { formatAddress, formatTokenAmount } from '@/utils/format';
import toast from 'react-hot-toast';
import LiquidityPoolStats from '@/components/widgets/LiquidityPoolStats';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { status, balance, isLoading, network, transactions } = useAppSelector((state) => state.account);
  const { messages } = useAppSelector((state) => state.chat);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Load initial user data and account status
    dispatch(loadUser());
    dispatch(getAccountStatus());
    dispatch(getBalance());

    // Set up polling for account status and balance if not fully deployed
    const pollInterval = setInterval(() => {
      if (!status?.isDeployed || !status?.isFunded) {
        dispatch(getAccountStatus());
        dispatch(getBalance());
      } else {
        dispatch(getBalance());
      }
    }, 10000); 

    return () => clearInterval(pollInterval);
  }, [dispatch, isAuthenticated, router, status?.isDeployed, status?.isFunded]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const refreshNetworkStatus = () => {
      dispatch(getStellarNetworkStatus());
    };

    refreshNetworkStatus();
    const interval = setInterval(refreshNetworkStatus, 15000);

    return () => clearInterval(interval);
  }, [dispatch, isAuthenticated]);

  // Fetch transactions
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    dispatch(getAccountTransactions({ userId: user.id, page: currentPage, limit: pageSize }));
  }, [dispatch, isAuthenticated, user?.id, currentPage, pageSize]);

  // Update total count from API response
  useEffect(() => {
    // This will be set when the API response comes back with pagination data
    if (transactions.transactions.length > 0) {
      // Mock total count calculation - in production this would come from API
      setTotalCount(transactions.transactions.length * 2);
    }
  }, [transactions.transactions]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };


  const quickActions = [
    {
      title: 'Chat with AI Agent',
      description: 'Ask questions or execute DeFi operations',
      action: () => router.push('/chat'),
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Contacts',
      description: 'Add and organize your contacts',
      action: () => router.push('/contacts'),
      color: 'bg-green-500',
    },
    {
      title: 'View Transactions',
      description: 'Check your transaction history',
      action: () => router.push('/transactions'),
      color: 'bg-purple-500',
    },
  ];

  const networkStatusLabel =
    network.status === 'healthy'
      ? 'Healthy'
      : network.status === 'degraded'
        ? 'Degraded'
        : network.status === 'down'
          ? 'Down'
          : 'Checking';

  const networkStatusColor =
    network.status === 'healthy'
      ? 'text-green-400'
      : network.status === 'degraded'
        ? 'text-yellow-400'
        : network.status === 'down'
          ? 'text-red-400'
          : 'text-gray-300';

  const syncStatusLabel =
    network.accountSyncState === 'synced'
      ? 'Synced'
      : network.accountSyncState === 'syncing'
        ? 'Syncing'
        : 'Desynced';

  const syncStatusColor =
    network.accountSyncState === 'synced'
      ? 'text-green-400'
      : network.accountSyncState === 'syncing'
        ? 'text-yellow-400'
        : 'text-red-400';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-black text-white overflow-hidden relative">
        {/* Simple Background */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-gray-300">
              Here's an overview of your ChenPilot account and recent activity.
            </p>
          </div>

          {/* Account Lifecycle Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <ShieldCheck className="mr-2 h-6 w-6 text-blue-400" />
                Account Lifecycle
              </h2>
              <div className="flex items-center space-x-2 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800">
                <div className={`w-2 h-2 rounded-full animate-pulse ${status?.isDeployed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs font-medium text-gray-300">
                  {status?.isDeployed ? 'Network Live' : 'Pending Activation'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1: Created */}
              <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${status?.address ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between">
                  <div className="z-10">
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-lg mr-3 ${status?.address ? 'bg-green-500/20' : 'bg-gray-800'}`}>
                        <Wallet className={`h-5 w-5 ${status?.address ? 'text-green-400' : 'text-gray-400'}`} />
                      </div>
                      <h3 className={`font-bold ${status?.address ? 'text-green-400' : 'text-gray-400'}`}>1. Created</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Account identity established on-chain.</p>
                    {status?.address ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-xs font-mono bg-black/40 p-2 rounded border border-gray-800 text-gray-300">
                          {formatAddress(status.address)}
                          <button
                            onClick={() => copyToClipboard(status.address, 'Address')}
                            className="ml-2 hover:text-white transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center text-xs text-green-500 font-medium">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-gray-500 italic">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Initializing...
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Step 2: Funded */}
              <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${status?.isFunded ? 'border-green-500/50 bg-green-500/5' : status?.address ? 'border-blue-500/30 bg-blue-500/5' : 'border-gray-800 opacity-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="z-10">
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-lg mr-3 ${status?.isFunded ? 'bg-green-500/20' : status?.address ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                        <Coins className={`h-5 w-5 ${status?.isFunded ? 'text-green-400' : status?.address ? 'text-blue-400' : 'text-gray-400'}`} />
                      </div>
                      <h3 className={`font-bold ${status?.isFunded ? 'text-green-400' : status?.address ? 'text-blue-400' : 'text-gray-400'}`}>2. Funded</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Resources added for network operations.</p>
                    {status?.isFunded ? (
                      <div className="space-y-2">
                        <div className="text-xl font-bold text-white">
                          {balance ? formatTokenAmount(balance.balance, 4, 'STRK') : '0.00 STRK'}
                        </div>
                        <div className="flex items-center text-xs text-green-500 font-medium">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </div>
                      </div>
                    ) : status?.address ? (
                      <div className="flex items-center text-xs text-blue-400 font-medium animate-pulse">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Detecting funds...
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-gray-500">
                        <Circle className="h-3 w-3 mr-1" /> Waiting for account
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Step 3: Deployed */}
              <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${status?.isDeployed ? 'border-green-500/50 bg-green-500/5' : status?.isFunded ? 'border-purple-500/30 bg-purple-500/5' : 'border-gray-800 opacity-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="z-10">
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-lg mr-3 ${status?.isDeployed ? 'bg-green-500/20' : status?.isFunded ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                        <Zap className={`h-5 w-5 ${status?.isDeployed ? 'text-green-400' : status?.isFunded ? 'text-purple-400' : 'text-gray-400'}`} />
                      </div>
                      <h3 className={`font-bold ${status?.isDeployed ? 'text-green-400' : status?.isFunded ? 'text-purple-400' : 'text-gray-400'}`}>3. Deployed</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Account is live and DeFi-ready.</p>
                    {status?.isDeployed ? (
                      <div className="space-y-2">
                        <div className="text-xs py-1 px-2 bg-green-500/20 text-green-400 rounded-full inline-flex items-center border border-green-500/30">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Full Access
                        </div>
                        <div className="flex items-center text-xs text-green-500 font-medium">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Deployed
                        </div>
                      </div>
                    ) : status?.isFunded ? (
                      <div className="flex items-center text-xs text-purple-400 font-medium animate-pulse">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Finalizing deployment...
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-gray-500">
                        <Circle className="h-3 w-3 mr-1" /> Waiting for funding
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {action.title}
                      </h3>
                      <p className="text-gray-300 mb-4">
                        {action.description}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={action.action}
                      >
                        Get Started
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Liquidity Pool Stats */}
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

          {/* Recent Activity */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Recent Activity
            </h2>
            <Card>
              {messages.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">
                      Recent Chat Messages
        {/* Stellar Network */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Stellar Network
          </h2>
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
                    {network.latestLedger ?? 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ledger Age</span>
                  <span className="text-white font-medium">
                    {network.ledgerAgeSeconds !== null
                      ? `${network.ledgerAgeSeconds}s`
                      : 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Updated</span>
                  <span className="text-white font-medium">
                    {network.lastUpdated
                      ? new Date(network.lastUpdated).toLocaleTimeString()
                      : 'Loading...'}
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
              {network.accountSyncState === 'desynced' && (
                <div className="mt-4 flex items-start space-x-2 rounded-lg bg-red-500/10 p-3 text-red-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span className="text-sm">
                    Account appears out of sync. Try refreshing or check network conditions.
                  </span>
                </div>
              )}
              {network.accountSyncState === 'syncing' && (
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {action.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/chat')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {messages.slice(-5).reverse().map((message, index) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-gray-800/50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${message.type === 'user' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              {message.type === 'user' ? 'You' : 'AI Agent'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 truncate">
                            {(() => {
                              const content = typeof message.content === 'string'
                                ? message.content
                                : (message.content as any)?.message || 'Structured data message';
                              return content.length > 100
                                ? content.substring(0, 100) + '...'
                                : content;
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-white mb-2">
                    No recent activity
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Your recent transactions and interactions will appear here.
                  </p>
                  <Button
                    onClick={() => router.push('/chat')}
                  >
                    Start with AI Agent
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Transaction History */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              On-Chain Transaction History
            </h2>
            <TransactionTable
              transactions={transactions.transactions}
              isLoading={transactions.isLoading}
              error={transactions.error}
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>

        </div>
      </div>
    </ChatLayout>
  );
}
