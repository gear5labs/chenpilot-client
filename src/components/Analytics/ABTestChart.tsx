'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { PromptComparisonData } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Activity, CircleDollarSign, Target, BarChart3 } from 'lucide-react';

interface ABTestChartProps {
  prompt1: PromptComparisonData;
  prompt2: PromptComparisonData;
  isLoading?: boolean;
}

type MetricType = 'latency' | 'cost' | 'accuracy';

const ABTestChart: React.FC<ABTestChartProps> = ({ prompt1, prompt2, isLoading }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('latency');

  if (isLoading) {
    return (
      <Card className="w-full h-[400px] flex flex-col items-center justify-center space-y-4 bg-gray-900 shadow-xl border-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-400 font-medium">Fetching Comparison Data...</p>
      </Card>
    );
  }

  const metricsInfo = {
    latency: {
      label: 'Latency (ms)',
      icon: <Activity className="w-4 h-4" />,
      description: 'Response time in milliseconds. Lower is better.',
      format: (val: number) => `${val.toLocaleString()} ms`,
      color1: '#3B82F6', // Blue-500
      color2: '#06B6D4', // Cyan-500
    },
    cost: {
      label: 'Cost (USD)',
      icon: <CircleDollarSign className="w-4 h-4" />,
      description: 'Estimated cost per execution. Lower is better.',
      format: (val: number) => `$${val.toFixed(4)}`,
      color1: '#F59E0B', // Amber-500
      color2: '#F97316', // Orange-500
    },
    accuracy: {
      label: 'Accuracy (%)',
      icon: <Target className="w-4 h-4" />,
      description: 'Success rate or quality score. Higher is better.',
      format: (val: number) => `${(val * 100).toFixed(1)}%`,
      color1: '#10B981', // Emerald-500
      color2: '#84CC16', // Lime-500
    }
  };

  const chartData = [
    {
      name: prompt1.name,
      value: prompt1.metrics[selectedMetric],
      fill: metricsInfo[selectedMetric].color1,
    },
    {
      name: prompt2.name,
      value: prompt2.metrics[selectedMetric],
      fill: metricsInfo[selectedMetric].color2,
    }
  ];

  const currentInfo = metricsInfo[selectedMetric];

  return (
    <Card className="w-full bg-gray-900 border-gray-800 shadow-2xl p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-bold text-white tracking-tight">Performance Comparison</h3>
          </div>
          <p className="text-sm text-gray-400 max-w-md">{currentInfo.description}</p>
        </div>

        <div className="flex p-1.5 bg-gray-800/80 rounded-xl border border-gray-700 backdrop-blur-sm self-start">
          {(Object.keys(metricsInfo) as MetricType[]).map((metric) => (
            <Button
              key={metric}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 transition-all duration-300 rounded-lg flex items-center space-x-2 group ${
                selectedMetric === metric
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {metricsInfo[metric].icon}
              <span className="capitalize font-semibold">{metric}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Metric Summary Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 bg-gray-800/30 border border-gray-700/50 rounded-2xl hover:border-gray-600 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{prompt1.name}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentInfo.color1 }} />
            </div>
            <p className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">
              {currentInfo.format(prompt1.metrics[selectedMetric])}
            </p>
          </div>

          <div className="p-5 bg-gray-800/30 border border-gray-700/50 rounded-2xl hover:border-gray-600 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{prompt2.name}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentInfo.color2 }} />
            </div>
            <p className="text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">
              {currentInfo.format(prompt2.metrics[selectedMetric])}
            </p>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="lg:col-span-2 h-[320px] bg-gray-950/50 rounded-3xl p-6 border border-gray-800/80 relative group">
          <div className="absolute top-4 right-6 flex items-center space-x-1.5 px-3 py-1 bg-gray-900/80 rounded-full border border-gray-800 text-[10px] font-bold text-gray-500 tracking-tighter uppercase opacity-0 group-hover:opacity-100 transition-opacity">
            <Activity className="w-3 h-3" />
            <span>Interactive Data</span>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.4} />
              <XAxis 
                dataKey="name" 
                stroke="#4b5563" 
                fontSize={11} 
                className="font-bold tracking-tighter"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#4b5563" 
                fontSize={10}
                className="font-medium"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => selectedMetric === 'cost' ? `$${val}` : val}
              />
              <Tooltip
                cursor={{ fill: '#374151', opacity: 0.1 }}
                contentStyle={{ 
                  backgroundColor: '#030712', 
                  border: '1px solid #1f2937', 
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '800' }}
                labelStyle={{ color: '#9ca3af', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                formatter={(val: number) => [currentInfo.format(val), currentInfo.label]}
              />
              <Bar 
                dataKey="value" 
                radius={[12, 12, 0, 0]}
                barSize={70}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

export default ABTestChart;
