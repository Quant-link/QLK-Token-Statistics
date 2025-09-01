import React, { useState, useCallback, memo } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import logoBlack from '../assets/logo-black.svg';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdate?: Date;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
}

export const Header: React.FC<HeaderProps> = memo(({
  onRefresh,
  isLoading,
  lastUpdate,
  connectionStatus = 'connected'
}) => {
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshCount(prev => prev + 1);
    onRefresh();
  }, [onRefresh]);

  const formatLastUpdate = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    return date.toLocaleTimeString();
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi size={16} className="text-green-500" />;
      case 'connecting':
        return <Wifi size={16} className="text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff size={16} className="text-red-500" />;
      default:
        return <Wifi size={16} className="text-gray-500" />;
    }
  };

  return (
    <header className="bg-white border-b border-black py-6 px-8 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logoBlack}
              alt="Quantlink Logo"
              className="h-10 w-auto"
            />
            <div>
              <div className="text-gray-600 text-xs lg:text-sm space-y-1">
                <p className="font-mono">
                  Token: 0xe226b7ae83a44bb98f67bea28c4ad73b0925c49e
                </p>
                <p className="font-mono">
                  Pool: 0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {getConnectionIcon()}
              <span className="hidden sm:inline">
                {connectionStatus === 'connected' && 'Connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
              </span>
            </div>

            {/* Last Update */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                <span className="hidden sm:inline">
                  Updated: {formatLastUpdate(lastUpdate)}
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-black rounded-lg font-medium transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#4DACE1' }}
              title={`Refresh data (${refreshCount} times refreshed)`}
            >
              <RefreshCw
                size={16}
                className={`transition-transform duration-200 ${isLoading ? 'animate-spin' : 'hover:rotate-180'}`}
              />
              <span className="hidden sm:inline">
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});