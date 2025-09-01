import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenHolder, Transaction, PoolData, TokenStats, ChartDataPoint } from '../types';
import { blockchainDataService } from '../services/blockchainData';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export const useTokenData = () => {
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [priceData, setPriceData] = useState<ChartDataPoint[]>([]);
  const [volumeData, setVolumeData] = useState<ChartDataPoint[]>([]);
  const [holderData, setHolderData] = useState<ChartDataPoint[]>([]);
  const [whaleData, setWhaleData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const maxRetries = 3;

  const fetchData = useCallback(async (isRetry = false) => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setConnectionStatus('connecting');

    if (!isRetry) {
      setError(null);
      setRetryCount(0);
    }

    try {
      // Check if we're still connected
      if (signal.aborted) {
        throw new Error('Request was cancelled');
      }

      // Fetch real blockchain data with timeout
      const fetchPromise = Promise.all([
        blockchainDataService.fetchTokenHolders(),
        blockchainDataService.fetchTransactions(),
        blockchainDataService.fetchPoolData(),
        blockchainDataService.fetchTokenStats(),
        blockchainDataService.fetchChartData(7) // Default to 7 days for initial load
      ]);

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const [holdersData, transactionsData, poolDataResult, statsData, chartData] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as [TokenHolder[], Transaction[], PoolData, TokenStats, {
        priceData: ChartDataPoint[],
        volumeData: ChartDataPoint[],
        holderData: ChartDataPoint[],
        whaleData: ChartDataPoint[]
      }];

      // Validate data before setting state
      if (!holdersData || !Array.isArray(holdersData)) {
        throw new Error('Invalid holders data received');
      }
      if (!transactionsData || !Array.isArray(transactionsData)) {
        throw new Error('Invalid transactions data received');
      }
      if (!poolDataResult || typeof poolDataResult !== 'object') {
        throw new Error('Invalid pool data received');
      }
      if (!statsData || typeof statsData !== 'object') {
        throw new Error('Invalid stats data received');
      }

      setHolders(holdersData);
      setTransactions(transactionsData);
      setPoolData(poolDataResult);
      setStats(statsData);
      setPriceData(chartData.priceData);
      setVolumeData(chartData.volumeData);
      setHolderData(chartData.holderData);
      setWhaleData(chartData.whaleData);
      setConnectionStatus('connected');
      setLastUpdate(new Date());
      setError(null);
      setRetryCount(0);

    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setConnectionStatus('disconnected');

      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Failed to fetch blockchain data';

      // Implement retry logic for transient errors
      if (retryCount < maxRetries && !signal.aborted) {
        const isRetriableError =
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('fetch') ||
          (err instanceof Error && 'code' in err && err.code === 'NETWORK_ERROR');

        if (isRetriableError) {
          setRetryCount(prev => prev + 1);
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff

          setTimeout(() => {
            if (!signal.aborted) {
              fetchData(true);
            }
          }, retryDelay);

          setError(`Connection failed. Retrying in ${retryDelay / 1000}s... (${retryCount + 1}/${maxRetries})`);
          return;
        }
      }

      setError(`${errorMessage}${retryCount >= maxRetries ? ' (Max retries exceeded)' : ''}`);
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, maxRetries]);

  useEffect(() => {
    fetchData();

    // Set up real-time updates every 1 minute for Token Statistics
    const interval = setInterval(() => fetchData(), 60000);

    // Cleanup function
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Handle page visibility changes to pause/resume updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionStatus === 'disconnected') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, connectionStatus]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (connectionStatus === 'disconnected') {
        fetchData();
      }
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
      setError('No internet connection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData, connectionStatus]);

  return {
    holders,
    transactions,
    poolData,
    stats,
    priceData,
    volumeData,
    holderData,
    whaleData,
    isLoading,
    error,
    connectionStatus,
    lastUpdate,
    retryCount,
    refetch: () => fetchData(false)
  };
};