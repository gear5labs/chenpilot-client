"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Users, Server, Cpu, Database } from "lucide-react";
import apiService from "@/services/api";
import { RealtimeMetrics } from "@/types/agent";
import { cn } from "@/utils/cn";

export const RealtimeMetricsDashboard = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await apiService.getRealtimeStats();
      if (response.success) {
        setMetrics(response.data);
        setError(null);
      }
    } catch (err) {
      setError("Failed to fetch real-time stats");
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // 5-second polling
    return () => clearInterval(interval);
  }, []);

  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* Active Users Card */}
      <Card className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-gray-400">Active Users</p>
          <h3 className="text-2xl font-bold text-white">
            {metrics?.activeUsers ?? 0}
          </h3>
        </div>
        <Users className="text-blue-500 h-8 w-8" />
      </Card>

      {/* Server Health Card */}
      <Card className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-gray-400">Server Health</p>
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

      {/* CPU Usage Card */}
      <Card className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-gray-400">CPU Load</p>
          <h3 className="text-2xl font-bold text-white">
            {metrics?.cpuUsage ?? 0}%
          </h3>
        </div>
        <Cpu className="text-purple-500 h-8 w-8" />
      </Card>

      {/* Memory Usage Card */}
      <Card className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-gray-400">Memory</p>
          <h3 className="text-2xl font-bold text-white">
            {metrics?.memoryUsage ?? 0}%
          </h3>
        </div>
        <Database className="text-orange-500 h-8 w-8" />
      </Card>
    </div>
  );
};
