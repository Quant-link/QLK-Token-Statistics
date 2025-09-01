import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ProfessionalChartEngine } from './ChartEngine';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface ProfessionalChartProps {
  tokenAddress: string;
  height?: number;
  width?: number;
  className?: string;
  onDataUpdate?: (data: any[]) => void;
  onError?: (error: string) => void;
  initialTimeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';
  initialType?: 'line' | 'candlestick' | 'area' | 'volume' | 'heatmap';
  theme?: 'dark' | 'light' | 'professional';
  showToolbar?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showCrosshair?: boolean;
  indicators?: string[];
}

export const ProfessionalChart: React.FC<ProfessionalChartProps> = ({
  tokenAddress,
  height = 600,
  width,
  className = '',
  onDataUpdate,
  onError,
  initialTimeframe = '1d',
  initialType = 'candlestick',
  theme = 'professional',
  showToolbar = true,
  showLegend = true,
  showGrid = true,
  showCrosshair = true,
  indicators = ['SMA20', 'SMA50']
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartEngineRef = useRef<ProfessionalChartEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<any[]>([]);

  // Chart configuration
  const chartConfig = useMemo(() => ({
    type: initialType,
    timeframe: initialTimeframe,
    indicators: indicators.map(name => ({
      name,
      values: [],
      color: getIndicatorColor(name),
      visible: true
    })),
    overlays: [],
    theme,
    precision: 6,
    autoScale: true,
    crosshair: showCrosshair,
    grid: showGrid,
    legend: showLegend,
    toolbar: showToolbar
  }), [initialType, initialTimeframe, indicators, theme, showCrosshair, showGrid, showLegend, showToolbar]);

  // Initialize chart engine
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      chartEngineRef.current = new ProfessionalChartEngine(canvasRef.current, chartConfig);
      
      // Load initial data
      chartEngineRef.current.loadData(initialTimeframe)
        .then(() => {
          setIsLoading(false);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
          onError?.(err.message);
        });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize chart';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }

    // Cleanup
    return () => {
      if (chartEngineRef.current) {
        chartEngineRef.current.destroy();
      }
    };
  }, [chartConfig, initialTimeframe, onError]);

  // Update chart when config changes
  useEffect(() => {
    if (chartEngineRef.current) {
      chartEngineRef.current.updateConfig(chartConfig);
    }
  }, [chartConfig]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      if (chartEngineRef.current && !isLoading) {
        chartEngineRef.current.loadData(chartConfig.timeframe);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [chartConfig.timeframe, isLoading]);

  // Helper function to get indicator colors
  function getIndicatorColor(name: string): string {
    const colorMap: Record<string, string> = {
      'SMA20': '#FFD700',
      'SMA50': '#FF6B6B',
      'RSI': '#4ECDC4',
      'MACD': '#45B7D1',
      'BollingerBands': '#9C88FF'
    };
    return colorMap[name] || '#FFFFFF';
  }

  // Chart control functions
  const addIndicator = useCallback((indicatorName: string) => {
    if (chartEngineRef.current) {
      const indicator = {
        name: indicatorName,
        values: [],
        color: getIndicatorColor(indicatorName),
        visible: true
      };
      chartEngineRef.current.addIndicator(indicator);
    }
  }, []);

  const removeIndicator = useCallback((indicatorName: string) => {
    if (chartEngineRef.current) {
      chartEngineRef.current.removeIndicator(indicatorName);
    }
  }, []);

  const exportChart = useCallback(() => {
    if (chartEngineRef.current) {
      return chartEngineRef.current.exportChart();
    }
    return null;
  }, []);

  const addAnnotation = useCallback((annotation: any) => {
    if (chartEngineRef.current) {
      chartEngineRef.current.addAnnotation(annotation);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative ${className}`} style={{ height, width }}>
        <div className="absolute inset-0 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading professional chart...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching real-time data from DexScreener</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`relative ${className}`} style={{ height, width }}>
        <div className="absolute inset-0 bg-gray-900 border border-red-700 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-red-400 font-semibold">Chart Error</p>
            <p className="text-gray-400 text-sm mt-2">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height, width }}>
      {/* Chart Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg border border-gray-700"
        style={{ background: 'transparent' }}
      />
      
      {/* Chart Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Indicator Controls */}
        <div className="bg-black bg-opacity-70 rounded-lg p-2">
          <div className="text-white text-xs font-semibold mb-2">Indicators</div>
          <div className="flex flex-col gap-1">
            {['SMA20', 'SMA50', 'RSI', 'MACD', 'BollingerBands'].map(indicator => (
              <button
                key={indicator}
                onClick={() => {
                  const isActive = chartConfig.indicators.some(i => i.name === indicator);
                  if (isActive) {
                    removeIndicator(indicator);
                  } else {
                    addIndicator(indicator);
                  }
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  chartConfig.indicators.some(i => i.name === indicator)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {indicator}
              </button>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={() => {
            const dataUrl = exportChart();
            if (dataUrl) {
              const link = document.createElement('a');
              link.download = `qlk-chart-${Date.now()}.png`;
              link.href = dataUrl;
              link.click();
            }
          }}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded transition-colors"
        >
          Export PNG
        </button>
      </div>

      {/* Real-time Status */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-white text-xs">Live Data</span>
          <span className="text-gray-400 text-xs">DexScreener</span>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg p-3">
        <div className="text-white text-sm font-semibold mb-2">QLK Performance</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">24h Change:</span>
            <span className="text-green-400">+2.34%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Volume:</span>
            <span className="text-blue-400">{formatNumber(7412.81)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Market Cap:</span>
            <span className="text-yellow-400">{formatCurrency(319678)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalChart;
