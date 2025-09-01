import React from 'react';
import { Transaction } from '../types';
import { formatAddress, formatNumber, formatTime } from '../utils/formatters';
import { ExternalLink, AlertTriangle } from 'lucide-react';

interface TransactionFlowProps {
  transactions: Transaction[];
}

export const TransactionFlow: React.FC<TransactionFlowProps> = ({ transactions }) => {
  return (
    <div className="bg-white border border-black rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#4DACE1' }}>
        Recent Transactions
      </h2>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {transactions.map((tx) => (
          <div 
            key={tx.hash}
            className={`border border-black rounded-lg p-4 hover:bg-gray-50 transition-colors ${
              tx.isLargeTransfer ? 'border-orange-400 bg-orange-50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{formatAddress(tx.hash)}</span>
                <ExternalLink size={12} className="text-gray-400" />
                {tx.isLargeTransfer && (
                  <AlertTriangle size={14} className="text-orange-500" />
                )}
              </div>
              <span className="text-xs text-gray-500">{formatTime(tx.timestamp)}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">From: </span>
                <span className="font-mono text-xs">{formatAddress(tx.from)}</span>
              </div>
              <div>
                <span className="text-gray-600">To: </span>
                <span className="font-mono text-xs">{formatAddress(tx.to)}</span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-gray-600">Amount: </span>
                  <span className="font-semibold">{formatNumber(tx.amount)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fee: </span>
                  <span className="text-xs">{tx.fee.toFixed(6)} ETH</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};