import React, { useEffect, useState } from 'react';
import { TokenStats } from '../types';
import { formatNumber, formatCurrency, formatPercentage } from '../utils/formatters';
import { TrendingUp, Users, Activity } from 'lucide-react';

interface StatisticsPanelProps {
  stats: TokenStats;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats: initialStats }) => {
  const [stats, setStats] = useState(initialStats);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Update stats when new data comes in
    setStats(initialStats);
    setLastUpdate(new Date());
  }, [initialStats]);

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
  }> = ({ title, value, icon, trend }) => (
    <div className="bg-white border border-black rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-600">{icon}</div>
        {trend && (
          <span className="text-xs text-green-600 font-semibold">{trend}</span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">{title}</h3>
      <p className="text-2xl font-bold" style={{ color: '#4DACE1' }}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: '#4DACE1' }}>
          Token Statistics
        </h2>
        <div className="text-xs text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()} • Updates every 1 min
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Token Price"
          value={formatCurrency(stats.price)}
          icon={<TrendingUp size={20} />}
          trend={`${stats.priceChange24h >= 0 ? '+' : ''}${stats.priceChange24h.toFixed(2)}%`}
        />
        
        <StatCard
          title="Market Cap"
          value={formatCurrency(stats.marketCap)}
          icon={<TrendingUp size={20} />}
        />
        
        <StatCard
          title="Total Supply"
          value={formatNumber(stats.totalSupply)}
          icon={<Activity size={20} />}
        />
        
        <StatCard
          title="Circulating Supply"
          value={formatNumber(stats.circulatingSupply)}
          icon={<Activity size={20} />}
        />
        
        <StatCard
          title="Holder Count"
          value={stats.holderCount.toLocaleString()}
          icon={<Users size={20} />}
        />
        
        <StatCard
          title="Top 10 Control"
          value={formatPercentage(stats.top10Percentage)}
          icon={<Users size={20} />}
        />
        

        <StatCard
          title="Daily Active Wallets"
          value={stats.dailyActiveWallets.toString()}
          icon={<Activity size={20} />}
        />
      </div>
    </div>
  );
};