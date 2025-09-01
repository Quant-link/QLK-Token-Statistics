import React, { useState } from 'react';
import { TokenHolder } from '../types';
import { formatAddress, formatNumber, formatPercentage, formatDate } from '../utils/formatters';
import { ArrowUpDown } from 'lucide-react';

interface HolderAnalysisProps {
  holders: TokenHolder[];
}

type SortField = 'balance' | 'percentage' | 'totalTransactions' | 'firstPurchase' | 'lastTransaction' | 'tradingFrequency';
type SortDirection = 'asc' | 'desc';

export const HolderAnalysis: React.FC<HolderAnalysisProps> = ({ holders }) => {
  const [sortField, setSortField] = useState<SortField>('balance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedHolders = [...holders].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'firstPurchase' || sortField === 'lastTransaction') {
      aValue = aValue instanceof Date ? aValue.getTime() : aValue;
      bValue = bValue instanceof Date ? bValue.getTime() : bValue;
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : 1;
    }
    return aValue > bValue ? -1 : 1;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-white border border-black rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#4DACE1' }}>
        Token Holder Analysis
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left p-3 font-semibold">Address</th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('balance')}
              >
                <div className="flex items-center gap-1">
                  Balance <ArrowUpDown size={14} />
                </div>
              </th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('percentage')}
              >
                <div className="flex items-center gap-1">
                  Percentage <ArrowUpDown size={14} />
                </div>
              </th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('firstPurchase')}
              >
                <div className="flex items-center gap-1">
                  First Purchase <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="text-left p-3 font-semibold">Last Transaction</th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('totalTransactions')}
              >
                <div className="flex items-center gap-1">
                  Total Txns <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="text-left p-3 font-semibold">30d Bought</th>
              <th className="text-left p-3 font-semibold">30d Sold</th>
            </tr>
          </thead>
          <tbody>
            {sortedHolders.map((holder, index) => (
              <tr 
                key={holder.address} 
                className={`border-b border-gray-200 hover:bg-gray-50 ${index < 10 ? 'bg-blue-50' : ''}`}
              >
                <td className="p-3 font-mono text-xs">
                  {formatAddress(holder.address)}
                </td>
                <td className="p-3 font-semibold">
                  {formatNumber(holder.balance)}
                </td>
                <td className="p-3">
                  {formatPercentage(holder.percentage)}
                </td>
                <td className="p-3 text-gray-600">
                  {formatDate(holder.firstPurchase)}
                </td>
                <td className="p-3 text-gray-600">
                  {formatDate(holder.lastTransaction)}
                </td>
                <td className="p-3">
                  {holder.totalTransactions.toLocaleString()}
                </td>
                <td className="p-3 text-green-600">
                  +{formatNumber(holder.bought30d)}
                </td>
                <td className="p-3 text-red-600">
                  -{formatNumber(holder.sold30d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};