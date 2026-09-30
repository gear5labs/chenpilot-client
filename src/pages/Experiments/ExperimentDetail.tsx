import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { analyticsService } from '@/services/analytics.service';
import ABTestChart from '@/components/Analytics/ABTestChart';
import { ABTestComparisonResponse } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Info, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ExperimentDetail: React.FC = () => {
  const router = useRouter();
  const { id1, id2 } = router.query;
  
  const [data, setData] = useState<ABTestComparisonResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id1 || !id2) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsService.getComparisonData(id1 as string, id2 as string);
      setData(response.data);
    } catch (err: any) {
      const errorMsg = err.message || 'Error loading comparison data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && id1 && id2) {
      fetchData();
    }
  }, [router.isReady, id1, id2]);

  if (!id1 || !id2) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card className="p-12 text-center bg-gray-900 border-gray-800">
          <Info className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Comparison Required</h2>
          <p className="text-gray-400 mb-6">Please provide two prompt IDs via URL parameters to compare their performance.</p>
          <Button onClick={() => router.back()} variant="primary">Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <BarChart2 className="w-8 h-8 text-blue-500" />
                A/B Testing Details
              </h1>
              <p className="text-gray-400 text-sm font-medium">Comparing performance trends and reliability</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchData} 
            disabled={loading}
            className="group"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Refresh Analysis
          </Button>
        </div>

        {error ? (
          <Card className="p-8 border-red-500/20 bg-red-500/5 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Failed to load analysis</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={fetchData} variant="secondary">Try Again</Button>
          </Card>
        ) : data ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Chart Component */}
            <ABTestChart prompt1={data.prompt1} prompt2={data.prompt2} isLoading={loading} />
            
            {/* Insights Section */}
            {data.comparisonResult && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  Comparative Insights
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-gray-950/40 rounded-2xl border border-gray-800">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Overall Performance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        {data.comparisonResult.winner === 'prompt1' ? data.prompt1.name : data.comparisonResult.winner === 'prompt2' ? data.prompt2.name : 'Neutral'}
                      </span>

                      <span className="text-green-400 text-xs font-bold px-2 py-0.5 bg-green-400/10 rounded-full">
                        Winner
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">Based on aggregate of all key metrics.</p>
                  </div>

                  <div className="p-6 bg-gray-950/40 rounded-2xl border border-gray-800">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Confidence Level</p>
                    <p className="text-3xl font-black text-blue-400">{(data.comparisonResult.confidence * 100).toFixed(1)}%</p>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full" 
                        style={{ width: `${data.comparisonResult.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-950/40 rounded-2xl border border-gray-800">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Reliability Diff</p>
                    <p className={`text-3xl font-black ${data.comparisonResult.improvements.accuracy >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.comparisonResult.improvements.accuracy >= 0 ? '+' : ''}{(data.comparisonResult.improvements.accuracy * 100).toFixed(1)}%
                    </p>
                    <p className="mt-2 text-sm text-gray-400">Accuracy improvement shift between versions.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl mb-4" />
              <div className="w-32 h-4 bg-gray-800 rounded-full mb-2" />
              <div className="w-24 h-3 bg-gray-800 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperimentDetail;
