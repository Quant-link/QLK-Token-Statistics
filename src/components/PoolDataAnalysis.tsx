import React from 'react';
import { PoolData } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface PoolDataAnalysisProps {
  poolData: PoolData;
}

export const PoolDataAnalysis: React.FC<PoolDataAnalysisProps> = ({ poolData }) => {
  return (
    <div className="bg-white border border-black rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#4DACE1' }}>
        Pool Data Analysis
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Total Value Locked</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(poolData.tvl)}
          </p>
        </div>
        
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">24h Volume</h3>
          <p className="text-2xl font-bold" style={{ color: '#4DACE1' }}>
            {formatCurrency(poolData.volume24h)}
          </p>
        </div>
        
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">24h Fees</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(poolData.fees24h)}
          </p>
        </div>
        
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Reserve Ratio</h3>
          <p className="text-lg font-semibold">
            {formatNumber(poolData.reserve0)} : {formatNumber(poolData.reserve1)}
          </p>
        </div>
        
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Liquidity Providers</h3>
          <p className="text-2xl font-bold text-orange-600">
            {poolData.liquidityProviders.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Pool Address</h3>
          <p className="text-xs font-mono">
            {poolData.address}
          </p>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Recent Pool Transactions</h3>
        <div className="bg-gray-50 border border-black rounded-lg p-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                <span className="font-mono text-xs">0x{Math.random().toString(16).substr(2, 8)}...</span>
                <span className="text-sm">{formatCurrency(Math.random() * 10000)}</span>
                <span className="text-xs text-gray-500">{Math.floor(Math.random() * 60)} min ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};