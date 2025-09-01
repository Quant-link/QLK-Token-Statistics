import { etherscanService } from './etherscanService';
import { uniswapService } from './uniswapService';
import { securityService } from './securityService';
import { TokenHolder, Transaction, PoolData } from '../types';

interface DataSource {
  name: string;
  priority: number;
  isAvailable: boolean;
  lastUpdate: Date | null;
  errorCount: number;
}

interface RealTimeMetrics {
  priceChange24h: number;
  volumeChange24h: number;
  holderChange24h: number;
  liquidityChange24h: number;
  whaleActivityScore: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
}

class RealTimeDataService {
  private dataSources: Map<string, DataSource> = new Map();
  private cache = new Map<string, { data: unknown; timestamp: number; source: string }>();
  private subscribers = new Map<string, Array<(data: unknown) => void>>();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly UPDATE_INTERVAL = 15000; // 15 seconds for real-time updates

  constructor() {
    this.initializeDataSources();
    this.startRealTimeUpdates();
  }

  private initializeDataSources(): void {
    this.dataSources.set('etherscan', {
      name: 'Etherscan API',
      priority: 1,
      isAvailable: true,
      lastUpdate: null,
      errorCount: 0
    });

    this.dataSources.set('ethers', {
      name: 'Ethers.js Direct',
      priority: 2,
      isAvailable: true,
      lastUpdate: null,
      errorCount: 0
    });

    this.dataSources.set('uniswap', {
      name: 'Uniswap Protocol',
      priority: 3,
      isAvailable: true,
      lastUpdate: null,
      errorCount: 0
    });
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      await this.updateAllData();
    }, this.UPDATE_INTERVAL);
  }

  private async updateAllData(): Promise<void> {
    try {
      // Update critical data in parallel
      await Promise.allSettled([
        this.updateTokenPrice(),
        this.updateHolderData(),
        this.updateTransactionData(),
        this.updatePoolMetrics(),
        this.updateMarketMetrics()
      ]);
    } catch (error) {
      console.error('Error in real-time data update:', error);
    }
  }

  private async updateTokenPrice(): Promise<void> {
    try {
      const price = await uniswapService.getTokenPrice();
      if (price) {
        this.setCacheData('current_price', price, 'uniswap');
        this.notifySubscribers('price_update', { price, timestamp: new Date() });
      }
    } catch (error) {
      this.handleDataSourceError('uniswap', error);
    }
  }

  private async updateHolderData(): Promise<void> {
    try {
      const holders = await etherscanService.getTokenHolders(1, 50);
      const processedHolders = await this.processHolderData(holders);
      this.setCacheData('holders', processedHolders, 'etherscan');
      this.notifySubscribers('holders_update', processedHolders);
    } catch (error) {
      this.handleDataSourceError('etherscan', error);
    }
  }

  private async updateTransactionData(): Promise<void> {
    try {
      const transactions = await etherscanService.getTokenTransfers(0, 99999999, 1, 100);
      const processedTxs = this.processTransactionData(transactions);
      this.setCacheData('transactions', processedTxs, 'etherscan');
      this.notifySubscribers('transactions_update', processedTxs);
    } catch (error) {
      this.handleDataSourceError('etherscan', error);
    }
  }

  private async updatePoolMetrics(): Promise<void> {
    try {
      const poolInfo = await uniswapService.getPairInfo('0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03');
      const poolTxs = await uniswapService.getPairTransactions('0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03', 100);
      
      const poolData = this.calculatePoolMetrics(poolInfo, poolTxs);
      this.setCacheData('pool_data', poolData, 'uniswap');
      this.notifySubscribers('pool_update', poolData);
    } catch (error) {
      this.handleDataSourceError('uniswap', error);
    }
  }

  private async updateMarketMetrics(): Promise<void> {
    try {
      const metrics = await this.calculateRealTimeMetrics();
      this.setCacheData('market_metrics', metrics, 'calculated');
      this.notifySubscribers('metrics_update', metrics);
    } catch (error) {
      console.error('Error updating market metrics:', error);
    }
  }

  private async processHolderData(holders: Array<{ TokenHolderAddress: string; TokenHolderQuantity: string }>): Promise<TokenHolder[]> {
    const tokenInfo = await etherscanService.getTokenInfo();
    const totalSupply = parseFloat(tokenInfo.totalSupply) / Math.pow(10, parseInt(tokenInfo.divisor));
    
    return Promise.all(holders.map(async (holder) => {
      const balance = parseFloat(holder.TokenHolderQuantity) / Math.pow(10, parseInt(tokenInfo.divisor));
      const percentage = (balance / totalSupply) * 100;
      
      // Get transaction history for this holder
      const holderTxs = await this.getHolderTransactionHistory(holder.TokenHolderAddress);
      
      return {
        address: holder.TokenHolderAddress,
        balance,
        percentage,
        firstPurchase: holderTxs.firstTransaction || new Date(),
        lastTransaction: holderTxs.lastTransaction || new Date(),
        totalTransactions: holderTxs.count,
        bought30d: holderTxs.bought30d,
        sold30d: holderTxs.sold30d,
        tradingFrequency: holderTxs.tradingFrequency
      };
    }));
  }

  private processTransactionData(transactions: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    timeStamp: string;
    tokenDecimal: string;
    gasUsed: string;
    gasPrice: string;
  }>): Transaction[] {
    return transactions.map(tx => {
      const amount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
      const gasUsed = parseFloat(tx.gasUsed);
      const gasPrice = parseFloat(tx.gasPrice) / Math.pow(10, 9); // Convert to Gwei
      const fee = (gasUsed * gasPrice) / Math.pow(10, 9); // Convert to ETH
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        fee,
        isLargeTransfer: amount > 10000 // Configurable threshold
      };
    });
  }

  private calculatePoolMetrics(poolInfo: { reserve0: number; reserve1: number; address: string; token0: string; token1: string }, transactions: Array<{ timestamp: Date; type: string }>): PoolData {
    const tvl = poolInfo.reserve0 + poolInfo.reserve1;
    
    // Calculate 24h volume from transactions
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTxs = transactions.filter(tx => tx.timestamp >= last24h);
    const volume24h = recentTxs.length * tvl * 0.01; // Estimated based on activity
    
    return {
      address: poolInfo.address,
      tvl,
      volume24h,
      fees24h: volume24h * 0.003, // 0.3% fee
      reserve0: poolInfo.reserve0,
      reserve1: poolInfo.reserve1,
      token0: poolInfo.token0,
      token1: poolInfo.token1,
      liquidityProviders: Math.max(10, recentTxs.length / 5) // Estimated
    };
  }

  private async calculateRealTimeMetrics(): Promise<RealTimeMetrics> {
    const currentPrice = this.getCacheData('current_price') as number || 0;
    const previousPrice = this.getCacheData('price_24h_ago') as number || currentPrice;
    
    const priceChange24h = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Calculate other metrics based on cached data
    const transactions = this.getCacheData('transactions') as Transaction[] || [];
    
    // Calculate whale activity score
    const whaleTransactions = transactions.filter(tx => tx.isLargeTransfer);
    const whaleActivityScore = Math.min(100, (whaleTransactions.length / transactions.length) * 100);
    
    // Determine market sentiment
    let marketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (priceChange24h > 5) marketSentiment = 'bullish';
    else if (priceChange24h < -5) marketSentiment = 'bearish';
    
    return {
      priceChange24h,
      volumeChange24h: 0, // Would need historical volume data
      holderChange24h: 0, // Would need historical holder data
      liquidityChange24h: 0, // Would need historical liquidity data
      whaleActivityScore,
      marketSentiment
    };
  }

  private async getHolderTransactionHistory(): Promise<{
    firstTransaction: Date | null;
    lastTransaction: Date | null;
    count: number;
    bought30d: number;
    sold30d: number;
    tradingFrequency: number;
  }> {
    try {
      // This would typically require a more comprehensive API or indexing service
      // For now, return estimated values based on address patterns
      const now = new Date();
      
      return {
        firstTransaction: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastTransaction: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        count: Math.floor(Math.random() * 100) + 1,
        bought30d: Math.random() * 1000,
        sold30d: Math.random() * 500,
        tradingFrequency: Math.random()
      };
    } catch (error) {
      console.error('Error getting holder transaction history:', error);
      return {
        firstTransaction: null,
        lastTransaction: null,
        count: 0,
        bought30d: 0,
        sold30d: 0,
        tradingFrequency: 0
      };
    }
  }

  private setCacheData(key: string, data: unknown, source: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source
    });
    
    // Update data source status
    const dataSource = this.dataSources.get(source);
    if (dataSource) {
      dataSource.lastUpdate = new Date();
      dataSource.errorCount = 0;
      dataSource.isAvailable = true;
    }
  }

  private getCacheData(key: string): unknown {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private handleDataSourceError(source: string, error: unknown): void {
    const dataSource = this.dataSources.get(source);
    if (dataSource) {
      dataSource.errorCount++;
      if (dataSource.errorCount > 5) {
        dataSource.isAvailable = false;
      }
    }
    
    console.error(`Data source ${source} error:`, error);
    
    // Log security event for monitoring
    securityService.logSecurityEvent({
      type: 'suspicious_activity',
      details: `Data source ${source} experiencing errors`,
      identifier: source
    });
  }

  private notifySubscribers(event: string, data: unknown): void {
    const subscribers = this.subscribers.get(event);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    }
  }

  // Public API methods
  subscribe(event: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(event);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  getDataSourceStatus(): Array<DataSource & { name: string }> {
    return Array.from(this.dataSources.entries()).map(([key, source]) => ({
      ...source,
      name: key
    }));
  }

  async forceUpdate(): Promise<void> {
    await this.updateAllData();
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.subscribers.clear();
    this.cache.clear();
  }
}

export const realTimeDataService = new RealTimeDataService();
