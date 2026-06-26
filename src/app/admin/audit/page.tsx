'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiService from '@/services/api';
import { formatRelativeTime, formatAddress } from '@/utils/format';
import {
  AuditLogEntry,
  AuditLogsQueryParams,
  AuditLogsResponse,
  AuditAction,
  AuditSeverity,
} from '@/types';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  X,
  AlertTriangle,
  Info,
  AlertCircle,
  ShieldAlert,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  Key,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Activity,
  FileText,
  ExternalLink,
  Loader2,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Severity Badge ───────────────────────────────────────────────────────────

const severityConfig: Record<AuditSeverity, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  info: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    icon: <Info className="h-3 w-3" />,
    label: 'Info',
  },
  warning: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Warning',
  },
  error: {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: <AlertCircle className="h-3 w-3" />,
    label: 'Error',
  },
  critical: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/20',
    icon: <ShieldAlert className="h-3 w-3" />,
    label: 'Critical',
  },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AuditLogEntry['status'] }) {
  const config = {
    success: { color: 'text-green-400', bg: 'bg-green-500/20' },
    failure: { color: 'text-red-400', bg: 'bg-red-500/20' },
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  }[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      {status}
    </span>
  );
}

// ─── Action Icon Map ──────────────────────────────────────────────────────────

function ActionIcon({ action }: { action: AuditAction }) {
  const iconClass = 'h-4 w-4 text-gray-400';
  if (action.startsWith('user.login')) return <LogIn className={iconClass} />;
  if (action.startsWith('user.logout')) return <LogOut className={iconClass} />;
  if (action.startsWith('user.register') || action.startsWith('user.update')) return <UserCheck className={iconClass} />;
  if (action.startsWith('user.delete')) return <UserX className={iconClass} />;
  if (action.startsWith('user.password')) return <Key className={iconClass} />;
  if (action.startsWith('admin')) return <ShieldAlert className={iconClass} />;
  return <Activity className={iconClass} />;
}

// ─── Action Formatter ─────────────────────────────────────────────────────────

function formatAction(action: string): string {
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: AuditLogEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;

  const copyField = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const severity = severityConfig[entry.severity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${severity.bg}`}>
              {severity.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Audit Log Detail</h2>
              <p className="text-xs text-gray-400 font-mono">ID: {entry.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
            <p className="text-white">{entry.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">Action</p>
              <div className="flex items-center space-x-1.5">
                <ActionIcon action={entry.action} />
                <span className="text-sm text-white font-medium">{formatAction(entry.action)}</span>
              </div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <StatusBadge status={entry.status} />
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">User</p>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm text-white font-medium">{entry.userName || entry.userEmail}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{entry.userEmail}</p>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">User ID</p>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm text-white font-mono">{formatAddress(entry.userId, 8, 8)}</span>
                <button onClick={() => copyField(entry.userId, 'User ID')} className="text-gray-500 hover:text-white transition-colors">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">Resource</p>
              <span className="text-sm text-white">{entry.resource}</span>
              {entry.resourceId && (
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{formatAddress(entry.resourceId, 8, 8)}</p>
              )}
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">Duration</p>
              <span className="text-sm text-white">{entry.duration ? `${entry.duration}ms` : 'N/A'}</span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Timestamp</p>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-white">{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            {entry.createdAt !== entry.timestamp && (
              <p className="text-xs text-gray-500 mt-1">
                Created: {new Date(entry.createdAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* IP & User Agent */}
          <div className="grid grid-cols-2 gap-4">
            {entry.ipAddress && (
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-0.5">IP Address</p>
                <span className="text-sm text-white font-mono">{entry.ipAddress}</span>
              </div>
            )}
            {entry.userAgent && (
              <div className="p-3 bg-gray-800/50 rounded-lg col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">User Agent</p>
                <span className="text-xs text-gray-300 break-all">{entry.userAgent}</span>
              </div>
            )}
          </div>

          {/* Metadata */}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Metadata</h3>
              <div className="bg-gray-800/30 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Data state
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Search & filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | ''>('');
  const [filterStatus, setFilterStatus] = useState<'success' | 'failure' | 'pending' | ''>('');

  // Sort state
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'userEmail' | 'severity'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Build query params
  const queryParams = useMemo<AuditLogsQueryParams>(() => {
    const params: AuditLogsQueryParams = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterAction) params.action = filterAction as AuditAction;
    if (filterSeverity) params.severity = filterSeverity as AuditSeverity;
    if (filterStatus) params.status = filterStatus as 'success' | 'failure' | 'pending';
    return params;
  }, [page, limit, debouncedSearch, filterAction, filterSeverity, filterStatus, sortBy, sortOrder]);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getAuditLogs(queryParams);
      if (response.success) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('[AdminAuditLogs] Failed to fetch logs:', err);
      // Fall back to mock data for development
      setLogs(generateMockLogs());
      setTotal(100);
      setTotalPages(4);
      toast.error('Could not connect to server. Showing sample data.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, queryParams]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export logs
  const handleExport = async () => {
    try {
      const blob = await apiService.exportAuditLogs(queryParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Audit logs exported successfully');
    } catch (err) {
      console.error('[AdminAuditLogs] Export failed:', err);
      toast.error('Export failed. Please try again.');
    }
  };

  // Sort toggle
  const toggleSort = (field: 'timestamp' | 'action' | 'userEmail' | 'severity') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Pagination helpers
  const paginationRange = useMemo(() => {
    const range: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  // If not authenticated, show loading
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-black text-white overflow-hidden relative">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="flex-1 overflow-auto relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <ShieldAlert className="h-6 w-6 text-blue-400" />
                  <h1 className="text-2xl font-bold text-white">Admin Audit Logs</h1>
                </div>
                <p className="text-gray-400 text-sm">
                  Monitor all user activity and system events. {total > 0 && `${total} total entries`}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6 border-gray-800">
              <div className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search by user email, name, or description..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Action filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <select
                      value={filterAction}
                      onChange={(e) => { setFilterAction(e.target.value as AuditAction | ''); setPage(1); }}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors min-w-[160px]"
                    >
                      <option value="">All Actions</option>
                      <optgroup label="User">
                        <option value="user.login">Login</option>
                        <option value="user.logout">Logout</option>
                        <option value="user.register">Register</option>
                        <option value="user.update_profile">Update Profile</option>
                        <option value="user.password_change">Password Change</option>
                        <option value="user.delete_account">Delete Account</option>
                      </optgroup>
                      <optgroup label="Transactions">
                        <option value="transaction.send">Send</option>
                        <option value="transaction.receive">Receive</option>
                        <option value="transaction.swap">Swap</option>
                      </optgroup>
                      <optgroup label="Agent">
                        <option value="agent.query">Agent Query</option>
                        <option value="agent.tool_execute">Tool Execute</option>
                      </optgroup>
                      <optgroup label="Admin">
                        <option value="admin.access">Admin Access</option>
                        <option value="admin.audit_view">Audit View</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Severity filter */}
                  <select
                    value={filterSeverity}
                    onChange={(e) => { setFilterSeverity(e.target.value as AuditSeverity | ''); setPage(1); }}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors min-w-[120px]"
                  >
                    <option value="">All Severities</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>

                  {/* Status filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value as 'success' | 'failure' | 'pending' | ''); setPage(1); }}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors min-w-[120px]"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="pending">Pending</option>
                  </select>

                  {/* Per page */}
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors min-w-[80px]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Error state */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-300 text-sm font-medium">Error loading audit logs</p>
                  <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
                </div>
                <button
                  onClick={fetchLogs}
                  className="ml-auto px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading ? (
              <Card className="border-gray-800">
                <div className="p-6 space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="h-10 w-10 rounded-lg bg-gray-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-800 rounded w-3/4" />
                        <div className="h-3 bg-gray-800 rounded w-1/2" />
                      </div>
                      <div className="h-6 w-16 bg-gray-800 rounded-full" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <>
                {/* Empty state */}
                {logs.length === 0 ? (
                  <Card className="border-gray-800">
                    <div className="p-12 text-center">
                      <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">No audit logs found</h3>
                      <p className="text-gray-500 text-sm mb-4">
                        {debouncedSearch || filterAction || filterSeverity || filterStatus
                          ? 'Try adjusting your search filters.'
                          : 'No activity has been recorded yet.'}
                      </p>
                      {(debouncedSearch || filterAction || filterSeverity || filterStatus) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch('');
                            setDebouncedSearch('');
                            setFilterAction('');
                            setFilterSeverity('');
                            setFilterStatus('');
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Table */}
                    <Card className="border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-800">
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                <button
                                  onClick={() => toggleSort('severity')}
                                  className="flex items-center space-x-1 hover:text-white transition-colors"
                                >
                                  <span>Severity</span>
                                  {sortBy === 'severity' ? (
                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                <button
                                  onClick={() => toggleSort('timestamp')}
                                  className="flex items-center space-x-1 hover:text-white transition-colors"
                                >
                                  <span>Timestamp</span>
                                  {sortBy === 'timestamp' ? (
                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                <button
                                  onClick={() => toggleSort('userEmail')}
                                  className="flex items-center space-x-1 hover:text-white transition-colors"
                                >
                                  <span>User</span>
                                  {sortBy === 'userEmail' ? (
                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                <button
                                  onClick={() => toggleSort('action')}
                                  className="flex items-center space-x-1 hover:text-white transition-colors"
                                >
                                  <span>Action</span>
                                  {sortBy === 'action' ? (
                                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Resource
                              </th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Details
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/50">
                            {logs.map((entry) => {
                              const sev = severityConfig[entry.severity];
                              return (
                                <tr
                                  key={entry.id}
                                  className="hover:bg-white/[0.02] transition-colors group"
                                >
                                  <td className="px-4 py-3">
                                    <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.color}`}>
                                      {sev.icon}
                                      <span>{sev.label}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                      <span className="text-sm text-gray-300" title={new Date(entry.timestamp).toLocaleString()}>
                                        {formatRelativeTime(entry.timestamp)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="h-7 w-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-medium text-indigo-300 flex-shrink-0">
                                        {(entry.userName || entry.userEmail).charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm text-white truncate max-w-[180px]">
                                          {entry.userName || entry.userEmail}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                          {entry.userEmail}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-1.5">
                                      <ActionIcon action={entry.action} />
                                      <span className="text-sm text-gray-300">{formatAction(entry.action)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <StatusBadge status={entry.status} />
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-400">{entry.resource}</span>
                                    {entry.duration !== undefined && (
                                      <span className="text-xs text-gray-600 ml-2">({entry.duration}ms)</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setSelectedEntry(entry)}
                                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
                                      title="View details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-gray-500">
                          Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} entries
                        </p>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          {paginationRange.map((p) => (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                p === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </ChatLayout>
  );
}

// ─── Mock Data Generator (for development without backend) ────────────────────

function generateMockLogs(): AuditLogEntry[] {
  const severities: AuditSeverity[] = ['info', 'warning', 'error', 'critical'];
  const actions: AuditAction[] = [
    'user.login',
    'user.logout',
    'user.register',
    'user.update_profile',
    'user.password_change',
    'transaction.send',
    'transaction.swap',
    'contact.create',
    'agent.query',
    'agent.tool_execute',
    'admin.access',
    'admin.audit_view',
    'account.deploy',
    'account.fund',
    'liquidity.query',
  ];
  const statuses: AuditLogEntry['status'][] = ['success', 'failure', 'pending'];
  const users = [
    { id: 'usr_001', email: 'alice@example.com', name: 'Alice Johnson' },
    { id: 'usr_002', email: 'bob@example.com', name: 'Bob Smith' },
    { id: 'usr_003', email: 'charlie@example.com', name: 'Charlie Brown' },
    { id: 'usr_004', email: 'diana@example.com', name: 'Diana Prince' },
    { id: 'admin_001', email: 'admin@chenpilot.io', name: 'Admin User' },
  ];
  const resources = ['user', 'transaction', 'contact', 'agent', 'account', 'liquidity', 'admin'];

  const logs: AuditLogEntry[] = [];
  for (let i = 0; i < 25; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const severity = Math.random() > 0.7 ? 'warning' : Math.random() > 0.9 ? 'error' : 'info';
    const status = Math.random() > 0.2 ? 'success' : Math.random() > 0.5 ? 'failure' : 'pending';
    const resource = resources[Math.floor(Math.random() * resources.length)];
    const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    logs.push({
      id: `audit_${String(i + 1).padStart(4, '0')}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action,
      resource,
      resourceId: `${resource}_${Math.random().toString(36).slice(2, 10)}`,
      description: `${formatAction(action)} by ${user.name} on ${resource}`,
      metadata: { browser: 'Chrome 120', platform: 'web' },
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      severity: severity as AuditSeverity,
      status: status as AuditLogEntry['status'],
      duration: Math.floor(Math.random() * 500),
      timestamp: date.toISOString(),
      createdAt: date.toISOString(),
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}