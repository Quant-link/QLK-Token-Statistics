import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { ChartDataPoint, TokenStats } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

interface ChartsSectionProps {
  priceData: ChartDataPoint[];
  volumeData: ChartDataPoint[];
  holderData: ChartDataPoint[];
  whaleData: ChartDataPoint[];
  stats: TokenStats;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';
type ChartType = 'price' | 'volume' | 'holders' | 'whale';



export const ChartsSection: React.FC<ChartsSectionProps> = ({
  priceData,
  volumeData,
  holderData,
  whaleData,
  stats
}) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('price');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Process real DexScreener data with memoization for performance
  const processedData = useMemo(() => {
    // All data is already filtered by timeframe from DexScreener
    // No need to filter again, just format for display
    const formatData = (data: ChartDataPoint[], formatter: (value: number) => string) => {
      return data.map(point => ({
        timestamp: point.timestamp.toISOString(),
        date: point.timestamp,
        value: point.value,
        formattedValue: formatter(point.value)
      }));
    };

    const priceFormatted = formatData(priceData, formatCurrency);
    const volumeFormatted = formatData(volumeData, formatNumber);
    const holdersFormatted = formatData(holderData, (val) => val.toString());
    const whaleFormatted = formatData(whaleData, (val) => `${val.toFixed(1)}%`);

    return {
      price: priceFormatted,
      volume: volumeFormatted,
      holders: holdersFormatted,
      whale: whaleFormatted
    };
  }, [priceData, volumeData, holderData, whaleData, timeRange]);

  const currentData = processedData[selectedChart];

  // Use real price change from DexScreener
  const priceChange = useMemo(() => {
    return {
      value: stats.priceChange24h * stats.price / 100, // Calculate absolute change
      percentage: stats.priceChange24h
    };
  }, [stats.priceChange24h, stats.price]);

  // Custom tooltip component for enhanced interactivity
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { formattedValue: string } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const date = new Date(label);

      return (
        <div className="bg-white border border-black rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{formatDate(date)}</p>
          <p className="text-sm" style={{ color: '#4DACE1' }}>
            <span className="font-semibold">
              {selectedChart === 'price' && 'Price: '}
              {selectedChart === 'volume' && 'Volume: '}
              {selectedChart === 'holders' && 'Holders: '}
              {selectedChart === 'whale' && 'Whale Activity: '}
            </span>
            {data.payload.formattedValue}
          </p>
        </div>
      );
    }
    return null;
  };

  // Render appropriate chart based on selection
  const renderChart = () => {
    const commonProps = {
      data: currentData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (selectedChart) {
      case 'price':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4DACE1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4DACE1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatDate(new Date(value))}
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4DACE1"
              strokeWidth={3}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        );

      case 'volume':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatDate(new Date(value))}
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={formatNumber}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#4DACE1" stroke="#000000" strokeWidth={1} />
          </BarChart>
        );

      case 'holders':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatDate(new Date(value))}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4DACE1"
              strokeWidth={3}
              dot={{ fill: '#4DACE1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#000000', strokeWidth: 1 }}
            />
          </LineChart>
        );

      case 'whale':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="whaleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatDate(new Date(value))}
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={formatNumber}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f59e0b"
              strokeWidth={3}
              fill="url(#whaleGradient)"
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  const chartTitles = {
    price: 'Token Price History',
    volume: 'Trading Volume',
    holders: 'Holder Count Over Time',
    whale: 'Whale Activity'
  };

  return (
    <div className="bg-white border border-black rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold" style={{ color: '#4DACE1' }}>
          {chartTitles[selectedChart]}
        </h2>

        <div className="flex gap-2">
          <div className="flex bg-gray-100 border border-black rounded-lg p-1">
            {(['price', 'volume', 'holders', 'whale'] as const).map((chart) => (
              <button
                key={chart}
                onClick={() => setSelectedChart(chart)}
                className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                  selectedChart === chart
                    ? 'text-white border border-black'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedChart === chart ? '#4DACE1' : 'transparent'
                }}
              >
                {chart.charAt(0).toUpperCase() + chart.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-100 border border-black rounded-lg p-1">
            {(['24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                  timeRange === range
                    ? 'text-white border border-black'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: timeRange === range ? '#4DACE1' : 'transparent'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Chart Container with Loading State */}
      <div className="h-80 border border-black rounded-lg bg-gray-50">
        {currentData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        )}
      </div>

      {/* Enhanced Statistics Panel */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold" style={{ color: '#4DACE1' }}>
            {formatCurrency(stats.price)}
          </div>
          <div className="text-xs text-gray-600">Current Price</div>
        </div>
        <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className={`text-2xl font-bold ${priceChange.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {priceChange.percentage >= 0 ? '+' : ''}{priceChange.percentage.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-600">24h Change</div>
        </div>
        <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {formatNumber(stats.dailyActiveWallets)}
          </div>
          <div className="text-xs text-gray-600">Active Wallets</div>
        </div>
        <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(stats.marketCap)}
          </div>
          <div className="text-xs text-gray-600">Market Cap</div>
        </div>
      </div>

      {/* Chart Data Summary */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          Showing {currentData.length} data points over the last {timeRange}
          {selectedChart === 'whale' && ' • Whale activity represents large transactions (>1000 tokens)'}
        </p>
      </div>
    </div>
  );
};