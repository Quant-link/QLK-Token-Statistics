import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { blockchainDataService } from '../../services/blockchainData';

// Mock the ethers service
vi.mock('../../services/ethersService', () => ({
  ethersService: {
    getTokenBasicInfo: vi.fn().mockResolvedValue({
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      totalSupply: 1000000,
    }),
    getHolderBalance: vi.fn().mockResolvedValue(1000),
    getRecentTransfers: vi.fn().mockResolvedValue([
      {
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
        to: '0x8ba1f109551bD432803012645Aac136c22C177ec8',
        amount: 100,
        timestamp: new Date(),
        fee: 0.001,
      },
    ]),
    getPoolReserves: vi.fn().mockResolvedValue({
      reserve0: 1000,
      reserve1: 2000,
      timestamp: Math.floor(Date.now() / 1000),
      token0: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
      token1: '0x8ba1f109551bD432803012645Aac136c22C177ec8',
    }),
  },
}));

describe('BlockchainDataService', () => {
  beforeEach(() => {
    // Clear cache before each test
    blockchainDataService.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('fetchTokenHolders', () => {
    it('should fetch and return token holders data', async () => {
      const holders = await blockchainDataService.fetchTokenHolders();
      
      expect(Array.isArray(holders)).toBe(true);
      expect(holders.length).toBeGreaterThan(0);
      
      // Check structure of first holder
      if (holders.length > 0) {
        const holder = holders[0];
        expect(holder).toHaveProperty('address');
        expect(holder).toHaveProperty('balance');
        expect(holder).toHaveProperty('percentage');
        expect(holder).toHaveProperty('firstPurchase');
        expect(holder).toHaveProperty('lastTransaction');
        expect(holder).toHaveProperty('totalTransactions');
        expect(holder).toHaveProperty('bought30d');
        expect(holder).toHaveProperty('sold30d');
        expect(holder).toHaveProperty('tradingFrequency');
        
        expect(typeof holder.address).toBe('string');
        expect(typeof holder.balance).toBe('number');
        expect(typeof holder.percentage).toBe('number');
        expect(holder.firstPurchase instanceof Date).toBe(true);
        expect(holder.lastTransaction instanceof Date).toBe(true);
        expect(typeof holder.totalTransactions).toBe('number');
        expect(typeof holder.bought30d).toBe('number');
        expect(typeof holder.sold30d).toBe('number');
        expect(typeof holder.tradingFrequency).toBe('number');
      }
    });

    it('should cache results', async () => {
      const firstCall = await blockchainDataService.fetchTokenHolders();
      const secondCall = await blockchainDataService.fetchTokenHolders();
      
      expect(firstCall).toEqual(secondCall);
    });

    it('should handle errors gracefully', async () => {
      const { ethersService } = await import('../../services/ethersService');
      vi.mocked(ethersService.getTokenBasicInfo).mockRejectedValueOnce(new Error('Network error'));
      
      const holders = await blockchainDataService.fetchTokenHolders();
      expect(Array.isArray(holders)).toBe(true);
    });
  });

  describe('fetchTransactions', () => {
    it('should fetch and return transaction data', async () => {
      const transactions = await blockchainDataService.fetchTransactions();
      
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);
      
      if (transactions.length > 0) {
        const tx = transactions[0];
        expect(tx).toHaveProperty('hash');
        expect(tx).toHaveProperty('from');
        expect(tx).toHaveProperty('to');
        expect(tx).toHaveProperty('amount');
        expect(tx).toHaveProperty('timestamp');
        expect(tx).toHaveProperty('fee');
        expect(tx).toHaveProperty('isLargeTransfer');
        
        expect(typeof tx.hash).toBe('string');
        expect(typeof tx.from).toBe('string');
        expect(typeof tx.to).toBe('string');
        expect(typeof tx.amount).toBe('number');
        expect(tx.timestamp instanceof Date).toBe(true);
        expect(typeof tx.fee).toBe('number');
        expect(typeof tx.isLargeTransfer).toBe('boolean');
      }
    });

    it('should validate transaction data', async () => {
      const transactions = await blockchainDataService.fetchTransactions();
      
      transactions.forEach(tx => {
        expect(tx.hash).toBeTruthy();
        expect(tx.from).toBeTruthy();
        expect(tx.to).toBeTruthy();
        expect(tx.amount).toBeGreaterThanOrEqual(0);
        expect(tx.timestamp instanceof Date).toBe(true);
      });
    });
  });

  describe('fetchPoolData', () => {
    it('should fetch and return pool data', async () => {
      const poolData = await blockchainDataService.fetchPoolData();
      
      expect(poolData).toHaveProperty('address');
      expect(poolData).toHaveProperty('tvl');
      expect(poolData).toHaveProperty('volume24h');
      expect(poolData).toHaveProperty('fees24h');
      expect(poolData).toHaveProperty('reserve0');
      expect(poolData).toHaveProperty('reserve1');
      expect(poolData).toHaveProperty('token0');
      expect(poolData).toHaveProperty('token1');
      expect(poolData).toHaveProperty('liquidityProviders');
      
      expect(typeof poolData.address).toBe('string');
      expect(typeof poolData.tvl).toBe('number');
      expect(typeof poolData.volume24h).toBe('number');
      expect(typeof poolData.fees24h).toBe('number');
      expect(typeof poolData.reserve0).toBe('number');
      expect(typeof poolData.reserve1).toBe('number');
      expect(typeof poolData.token0).toBe('string');
      expect(typeof poolData.token1).toBe('string');
      expect(typeof poolData.liquidityProviders).toBe('number');
      
      // Validate positive values
      expect(poolData.tvl).toBeGreaterThanOrEqual(0);
      expect(poolData.volume24h).toBeGreaterThanOrEqual(0);
      expect(poolData.fees24h).toBeGreaterThanOrEqual(0);
      expect(poolData.reserve0).toBeGreaterThanOrEqual(0);
      expect(poolData.reserve1).toBeGreaterThanOrEqual(0);
      expect(poolData.liquidityProviders).toBeGreaterThan(0);
    });

    it('should handle invalid pool data', async () => {
      const { ethersService } = await import('../../services/ethersService');
      vi.mocked(ethersService.getPoolReserves).mockResolvedValueOnce({
        reserve0: -1,
        reserve1: 1000,
        timestamp: Math.floor(Date.now() / 1000),
        token0: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
        token1: '0x8ba1f109551bD432803012645Aac136c22C177ec8',
      });
      
      await expect(blockchainDataService.fetchPoolData()).rejects.toThrow('Invalid pool reserves data');
    });
  });

  describe('fetchTokenStats', () => {
    it('should fetch and return token statistics', async () => {
      const stats = await blockchainDataService.fetchTokenStats();
      
      expect(stats).toHaveProperty('totalSupply');
      expect(stats).toHaveProperty('circulatingSupply');
      expect(stats).toHaveProperty('holderCount');
      expect(stats).toHaveProperty('top10Percentage');
      expect(stats).toHaveProperty('avgHoldingPeriod');
      expect(stats).toHaveProperty('dailyActiveWallets');
      expect(stats).toHaveProperty('price');
      expect(stats).toHaveProperty('marketCap');
      
      expect(typeof stats.totalSupply).toBe('number');
      expect(typeof stats.circulatingSupply).toBe('number');
      expect(typeof stats.holderCount).toBe('number');
      expect(typeof stats.top10Percentage).toBe('number');
      expect(typeof stats.avgHoldingPeriod).toBe('number');
      expect(typeof stats.dailyActiveWallets).toBe('number');
      expect(typeof stats.price).toBe('number');
      expect(typeof stats.marketCap).toBe('number');
      
      // Validate ranges
      expect(stats.totalSupply).toBeGreaterThan(0);
      expect(stats.circulatingSupply).toBeGreaterThan(0);
      expect(stats.holderCount).toBeGreaterThan(0);
      expect(stats.top10Percentage).toBeGreaterThanOrEqual(0);
      expect(stats.top10Percentage).toBeLessThanOrEqual(100);
      expect(stats.avgHoldingPeriod).toBeGreaterThan(0);
      expect(stats.dailyActiveWallets).toBeGreaterThan(0);
      expect(stats.price).toBeGreaterThan(0);
      expect(stats.marketCap).toBeGreaterThan(0);
    });
  });

  describe('fetchChartData', () => {
    it('should fetch and return chart data for specified days', async () => {
      const days = 30;
      const chartData = await blockchainDataService.fetchChartData(days);
      
      expect(chartData).toHaveProperty('priceData');
      expect(chartData).toHaveProperty('volumeData');
      expect(chartData).toHaveProperty('holderData');
      
      expect(Array.isArray(chartData.priceData)).toBe(true);
      expect(Array.isArray(chartData.volumeData)).toBe(true);
      expect(Array.isArray(chartData.holderData)).toBe(true);
      
      expect(chartData.priceData).toHaveLength(days + 1);
      expect(chartData.volumeData).toHaveLength(days + 1);
      expect(chartData.holderData).toHaveLength(days + 1);
      
      // Check data point structure
      if (chartData.priceData.length > 0) {
        const dataPoint = chartData.priceData[0];
        expect(dataPoint).toHaveProperty('timestamp');
        expect(dataPoint).toHaveProperty('value');
        expect(dataPoint.timestamp instanceof Date).toBe(true);
        expect(typeof dataPoint.value).toBe('number');
        expect(dataPoint.value).toBeGreaterThan(0);
      }
    });

    it('should generate realistic chart patterns', async () => {
      const chartData = await blockchainDataService.fetchChartData(7);
      
      // Check that values are within reasonable ranges
      chartData.priceData.forEach(point => {
        expect(point.value).toBeGreaterThan(0.1);
        expect(point.value).toBeLessThan(100);
      });
      
      chartData.volumeData.forEach(point => {
        expect(point.value).toBeGreaterThan(1000);
      });
      
      chartData.holderData.forEach(point => {
        expect(point.value).toBeGreaterThan(100);
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const health = await blockchainDataService.getHealthStatus();
      
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('lastUpdate');
      expect(health).toHaveProperty('cacheSize');
      expect(health).toHaveProperty('errors');
      
      expect(typeof health.isHealthy).toBe('boolean');
      expect(health.lastUpdate instanceof Date).toBe(true);
      expect(typeof health.cacheSize).toBe('number');
      expect(Array.isArray(health.errors)).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      blockchainDataService.clearCache();
      const stats = blockchainDataService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });

    it('should provide cache statistics', async () => {
      await blockchainDataService.fetchTokenHolders();
      const stats = blockchainDataService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});
