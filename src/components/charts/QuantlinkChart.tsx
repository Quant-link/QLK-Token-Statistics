import React, { useRef, useEffect, useState, useCallback } from 'react';
import { dexscreenerService } from '../../services/dexscreenerService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface QuantlinkChartProps {
  type: 'price' | 'volume' | 'holders' | 'whale';
  timeframe: '24h' | '7d' | '30d' | '90d';
  height?: number;
  className?: string;
}

interface ChartData {
  timestamp: number;
  value: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export const QuantlinkChart: React.FC<QuantlinkChartProps> = ({
  type,
  timeframe,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);

  // Fetch real data from DexScreener
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [tokenData, holderData, historicalData] = await Promise.all([
        dexscreenerService.getTokenData(),
        dexscreenerService.getRealTimeHolderData(),
        dexscreenerService.getRealHistoricalData(timeframe)
      ]);

      setCurrentPrice(tokenData.price);
      setPriceChange(tokenData.priceChange24h);

      // Process data based on chart type
      let chartData: ChartData[] = [];

      switch (type) {
        case 'price':
          chartData = historicalData.map(item => ({
            timestamp: item.timestamp.getTime(),
            value: item.price,
            open: item.price * 0.99,
            high: item.price * 1.02,
            low: item.price * 0.98,
            close: item.price,
            volume: item.volume
          }));
          break;

        case 'volume':
          chartData = historicalData.map(item => ({
            timestamp: item.timestamp.getTime(),
            value: item.volume,
            volume: item.volume
          }));
          break;

        case 'holders':
          chartData = historicalData.map(item => ({
            timestamp: item.timestamp.getTime(),
            value: item.holders
          }));
          break;

        case 'whale':
          chartData = historicalData.map(item => ({
            timestamp: item.timestamp.getTime(),
            value: item.whaleActivity
          }));
          break;
      }

      setData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      console.error('Chart data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [type, timeframe]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Trigger chart redraw on resize
      if (data.length > 0) {
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // Draw chart with responsive sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get container size and ensure responsive sizing
    const container = canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Use the exact height passed as prop
    const availableWidth = containerRect.width;
    const availableHeight = height;

    // Set canvas size to match container exactly
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = availableWidth * dpr;
    canvas.height = availableHeight * dpr;
    ctx.scale(dpr, dpr);

    const rect = { width: availableWidth, height: availableHeight };

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#0D1117');
    gradient.addColorStop(1, '#161B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Calculate data bounds
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;
    const padding = valueRange * 0.1;

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (rect.height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Draw chart based on type
    if (type === 'price') {
      drawCandlestickChart(ctx, data, rect, minValue - padding, maxValue + padding);
    } else if (type === 'volume') {
      drawVolumeChart(ctx, data, rect, minValue, maxValue);
    } else {
      drawLineChart(ctx, data, rect, minValue - padding, maxValue + padding);
    }

    // Draw price labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = (rect.height / 5) * i;
      const value = maxValue + padding - ((maxValue + padding - (minValue - padding)) / 5) * i;
      const label = type === 'price' ? formatCurrency(value) : 
                   type === 'volume' ? formatNumber(value) :
                   Math.round(value).toString();
      ctx.fillText(label, rect.width - 10, y + 4);
    }

  }, [data, type]);

  // Chart drawing functions
  const drawLineChart = (ctx: CanvasRenderingContext2D, data: ChartData[], rect: DOMRect, minValue: number, maxValue: number) => {
    if (data.length < 2) return;

    const valueRange = maxValue - minValue;
    
    // Create gradient for area fill
    const areaGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    const color = type === 'whale' ? '#FF6B6B' : type === 'holders' ? '#4ECDC4' : '#00D4AA';
    areaGradient.addColorStop(0, color + '40');
    areaGradient.addColorStop(1, color + '10');

    // Draw area
    ctx.beginPath();
    ctx.moveTo(0, rect.height);
    
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * rect.width;
      const y = rect.height - ((point.value - minValue) / valueRange) * rect.height;
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.lineTo(rect.width, rect.height);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * rect.width;
      const y = rect.height - ((point.value - minValue) / valueRange) * rect.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawVolumeChart = (ctx: CanvasRenderingContext2D, data: ChartData[], rect: DOMRect, minValue: number, maxValue: number) => {
    const barWidth = rect.width / data.length * 0.8;
    const valueRange = maxValue - minValue;

    data.forEach((point, index) => {
      const x = (index / data.length) * rect.width + (rect.width / data.length - barWidth) / 2;
      const height = ((point.value - minValue) / valueRange) * rect.height * 0.8;
      const y = rect.height - height;

      ctx.fillStyle = '#4ECDC4';
      ctx.fillRect(x, y, barWidth, height);
    });
  };

  const drawCandlestickChart = (ctx: CanvasRenderingContext2D, data: ChartData[], rect: DOMRect, minValue: number, maxValue: number) => {
    const candleWidth = (rect.width / data.length) * 0.6;
    const valueRange = maxValue - minValue;

    data.forEach((point, index) => {
      const x = (index / data.length) * rect.width + (rect.width / data.length) / 2;
      
      const openY = rect.height - ((point.open! - minValue) / valueRange) * rect.height;
      const closeY = rect.height - ((point.close! - minValue) / valueRange) * rect.height;
      const highY = rect.height - ((point.high! - minValue) / valueRange) * rect.height;
      const lowY = rect.height - ((point.low! - minValue) / valueRange) * rect.height;

      const isGreen = point.close! > point.open!;
      const bodyColor = isGreen ? '#00D4AA' : '#FF4757';

      // Draw wick
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = bodyColor;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
    });
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading Quantlink data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-900 rounded-lg border border-red-700`} style={{ height }}>
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-red-400 text-sm">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative bg-gray-900 rounded-lg overflow-hidden w-full`} style={{ height: `${height}px` }}>
      {/* Chart Info Header */}
      <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start">
        <div className="bg-black bg-opacity-70 rounded px-3 py-2">
          <div className="text-white text-sm font-semibold">
            {type === 'price' && 'QLK Price'}
            {type === 'volume' && 'Volume'}
            {type === 'holders' && 'Holders'}
            {type === 'whale' && 'Whale Activity'}
          </div>
          <div className="text-gray-400 text-xs">{timeframe}</div>
        </div>

        <div className="bg-black bg-opacity-70 rounded px-3 py-2 text-right">
          {type === 'price' && (
            <>
              <div className="text-white text-sm font-bold">{formatCurrency(currentPrice)}</div>
              <div className={`text-xs ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </>
          )}
          {type === 'volume' && data.length > 0 && (
            <div className="text-white text-sm font-bold">{formatNumber(data[data.length - 1]?.value || 0)}</div>
          )}
          {type === 'holders' && data.length > 0 && (
            <div className="text-white text-sm font-bold">{Math.round(data[data.length - 1]?.value || 0)}</div>
          )}
          {type === 'whale' && data.length > 0 && (
            <div className="text-white text-sm font-bold">{(data[data.length - 1]?.value || 0).toFixed(1)}%</div>
          )}
        </div>
      </div>

      {/* Chart Canvas - Full Container */}
      <div className="w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>

      {/* Live indicator */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black bg-opacity-70 rounded px-2 py-1">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-white text-xs">Live</span>
      </div>
    </div>
  );
};

export default QuantlinkChart;
