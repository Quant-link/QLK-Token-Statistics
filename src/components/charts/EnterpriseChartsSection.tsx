import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuantlinkChart } from './QuantlinkChart';
import { dexscreenerService } from '../../services/dexscreenerService';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import { TokenStats, ChartDataPoint } from '../../types';

interface EnterpriseChartsSectionProps {
  priceData: ChartDataPoint[];
  volumeData: ChartDataPoint[];
  holderData: ChartDataPoint[];
  whaleData: ChartDataPoint[];
  stats: TokenStats;
}

interface MarketMetrics {
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  whaleActivity: number;
  lastUpdate: Date;
}

interface ChartLayout {
  id: string;
  title: string;
  type: 'line' | 'candlestick' | 'area' | 'volume' | 'heatmap';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';
  indicators: string[];
  height: number;
  span: number; // Grid span
}

export const EnterpriseChartsSection: React.FC<EnterpriseChartsSectionProps> = ({
  priceData,
  volumeData,
  holderData,
  whaleData,
  stats
}) => {
  const [selectedLayout, setSelectedLayout] = useState<'single' | 'dual' | 'quad' | 'professional'>('professional');
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Quantlink Chart layouts configuration - Alt alta düzenli layout
  const chartLayouts = useMemo(() => ({
    single: [
      {
        id: 'main',
        title: 'Quantlink (QLK) Price Analysis',
        type: 'price' as const,
        timeframe: '24h' as const,
        height: 400
      }
    ],
    dual: [
      {
        id: 'price',
        title: 'QLK Price Movement',
        type: 'price' as const,
        timeframe: '24h' as const,
        height: 350
      },
      {
        id: 'volume',
        title: 'Trading Volume',
        type: 'volume' as const,
        timeframe: '24h' as const,
        height: 300
      }
    ],
    quad: [
      {
        id: 'price',
        title: 'QLK Price Chart',
        type: 'price' as const,
        timeframe: '24h' as const,
        height: 320
      },
      {
        id: 'volume',
        title: 'Volume Analysis',
        type: 'volume' as const,
        timeframe: '24h' as const,
        height: 280
      },
      {
        id: 'holders',
        title: 'Holder Growth',
        type: 'holders' as const,
        timeframe: '7d' as const,
        height: 280
      },
      {
        id: 'whale',
        title: 'Whale Activity',
        type: 'whale' as const,
        timeframe: '24h' as const,
        height: 280
      }
    ],
    professional: [
      {
        id: 'main',
        title: 'Quantlink Professional Analysis',
        type: 'price' as const,
        timeframe: '24h' as const,
        height: 380
      },
      {
        id: 'volume',
        title: 'Volume & Liquidity',
        type: 'volume' as const,
        timeframe: '24h' as const,
        height: 280
      },
      {
        id: 'whale',
        title: 'Whale Activity Monitor',
        type: 'whale' as const,
        timeframe: '24h' as const,
        height: 280
      },
      {
        id: 'holders',
        title: 'Holder Growth Analysis',
        type: 'holders' as const,
        timeframe: '7d' as const,
        height: 280
      }
    ]
  }), []);

  // Fetch real-time market metrics
  const fetchMarketMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tokenData, holderData] = await Promise.all([
        dexscreenerService.getTokenData(),
        dexscreenerService.getRealTimeHolderData()
      ]);

      setMarketMetrics({
        price: tokenData.price,
        priceChange24h: tokenData.priceChange24h,
        priceChange7d: tokenData.priceChange6h * 7, // Estimate 7d from 6h
        volume24h: tokenData.volume24h,
        marketCap: tokenData.marketCap,
        liquidity: tokenData.liquidity,
        holders: holderData.totalHolders,
        whaleActivity: holderData.whaleActivity,
        lastUpdate: new Date()
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      console.error('Market metrics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchMarketMetrics();
  }, [fetchMarketMetrics]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMarketMetrics, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMarketMetrics]);

  // Chart error handler
  const handleChartError = useCallback((error: string) => {
    console.error('Chart error:', error);
    setError(error);
  }, []);

  // Chart data update handler
  const handleDataUpdate = useCallback((data: any[]) => {
    console.log('Chart data updated:', data.length, 'points');
  }, []);

  // Render market metrics header
  const renderMarketMetrics = () => {
    if (!marketMetrics) return null;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Quantlink (QLK)</h2>
              <p className="text-gray-400 text-sm">Real-time Market Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-sm text-gray-400">
                {autoRefresh ? 'Live' : 'Paused'}
              </span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                autoRefresh 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
              }`}
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">Price</div>
            <div className="text-white text-lg font-bold">{formatCurrency(marketMetrics.price)}</div>
            <div className={`text-xs ${marketMetrics.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketMetrics.priceChange24h >= 0 ? '+' : ''}{marketMetrics.priceChange24h.toFixed(2)}%
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">24h Volume</div>
            <div className="text-white text-lg font-bold">{formatCurrency(marketMetrics.volume24h)}</div>
            <div className="text-blue-400 text-xs">DexScreener</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">Market Cap</div>
            <div className="text-white text-lg font-bold">{formatCurrency(marketMetrics.marketCap)}</div>
            <div className="text-yellow-400 text-xs">Real-time</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">Liquidity</div>
            <div className="text-white text-lg font-bold">{formatCurrency(marketMetrics.liquidity)}</div>
            <div className="text-purple-400 text-xs">Pool TVL</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">Holders</div>
            <div className="text-white text-lg font-bold">{formatNumber(marketMetrics.holders)}</div>
            <div className="text-green-400 text-xs">Analyzed</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">Whale Activity</div>
            <div className="text-white text-lg font-bold">{marketMetrics.whaleActivity.toFixed(1)}%</div>
            <div className="text-red-400 text-xs">Live</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">7d Change</div>
            <div className={`text-lg font-bold ${marketMetrics.priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketMetrics.priceChange7d >= 0 ? '+' : ''}{marketMetrics.priceChange7d.toFixed(2)}%
            </div>
            <div className="text-gray-400 text-xs">Estimated</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs">Last Update</div>
            <div className="text-white text-sm font-bold">
              {marketMetrics.lastUpdate.toLocaleTimeString()}
            </div>
            <div className="text-gray-400 text-xs">
              {marketMetrics.lastUpdate.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render layout selector
  const renderLayoutSelector = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Quantlink Chart Views</h3>
        <div className="flex gap-2">
          {Object.keys(chartLayouts).map((layout) => (
            <button
              key={layout}
              onClick={() => setSelectedLayout(layout as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLayout === layout
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {layout.charAt(0).toUpperCase() + layout.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render charts grid - Alt alta profesyonel layout
  const renderChartsGrid = () => {
    const layouts = chartLayouts[selectedLayout];

    return (
      <div className="space-y-4">
        {layouts.map((layout, index) => (
          <div key={layout.id} className="w-full">
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
              {/* Chart Header */}
              <div className="bg-gradient-to-r from-gray-800 to-gray-750 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-lg">{layout.title}</h4>
                    <div className="text-gray-400 text-sm mt-1">
                      {layout.type} • {layout.timeframe} • Real-time DexScreener data
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">Live</span>
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="p-2 bg-gray-900">
                <div className="w-full" style={{ height: `${layout.height}px` }}>
                  <QuantlinkChart
                    type={layout.type}
                    timeframe={layout.timeframe}
                    height={layout.height}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (isLoading && !marketMetrics) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Loading Quantlink Charts</h3>
          <p className="text-gray-400 text-sm">Fetching real-time data from DexScreener...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Metrics Header */}
      {renderMarketMetrics()}

      {/* Layout Selector */}
      {renderLayoutSelector()}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-red-400 text-xl">⚠️</div>
            <div>
              <div className="text-red-300 font-semibold">Chart Error</div>
              <div className="text-red-400 text-sm">{error}</div>
            </div>
            <button
              onClick={fetchMarketMetrics}
              className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {renderChartsGrid()}

      {/* Footer Info */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="text-center text-gray-400 text-sm">
          <div className="mb-2">
            📊 <strong>Quantlink (QLK) Professional Analytics</strong> 📊
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <strong className="text-white">Real-Time Data:</strong> DexScreener API with live price feeds and volume analysis
            </div>
            <div>
              <strong className="text-white">Market Analysis:</strong> Price movements, trading volume, holder growth, whale activity
            </div>
            <div>
              <strong className="text-white">Quantlink Features:</strong> Multi-timeframe charts, live updates, professional visualization
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseChartsSection;
