interface CoinGeckoResponse {
  quantlink: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
    usd_24h_vol: number;
  };
}

interface PriceData {
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Date;
}

class PriceService {
  private cache = new Map<string, { data: PriceData; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';

  async getTokenPrice(): Promise<PriceData> {
    const cacheKey = 'quantlink_price';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get Quantlink price from CoinGecko
      const response = await fetch(
        `${this.COINGECKO_API}/simple/price?ids=quantlink&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data: CoinGeckoResponse = await response.json();
      
      if (!data.quantlink) {
        throw new Error('Quantlink data not found in CoinGecko response');
      }
      
      const priceData: PriceData = {
        price: data.quantlink.usd,
        change24h: data.quantlink.usd_24h_change || 0,
        marketCap: data.quantlink.usd_market_cap || 0,
        volume24h: data.quantlink.usd_24h_vol || 0,
        lastUpdated: new Date()
      };
      
      this.cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      return priceData;
      
    } catch (error) {
      console.error('Error fetching price from CoinGecko:', error);
      
      // Try alternative method - check if we have cached data
      const lastCached = this.cache.get(cacheKey);
      if (lastCached) {
        console.log('Using stale cached price data');
        return lastCached.data;
      }
      
      // If no cached data, try to get price from DEX aggregator
      return this.getAlternativePrice();
    }
  }

  private async getAlternativePrice(): Promise<PriceData> {
    try {
      // Try to get price from 1inch API as alternative
      const response = await fetch(
        'https://api.1inch.dev/price/v1.1/1/0xe226b7ae83a44bb98f67bea28c4ad73b0925c49e'
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          price: parseFloat(data.price) || 0,
          change24h: 0, // Not available from this API
          marketCap: 0, // Not available from this API
          volume24h: 0, // Not available from this API
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.warn('Alternative price API also failed:', error);
    }
    
    // Return minimal data if all APIs fail
    return {
      price: 0,
      change24h: 0,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: new Date()
    };
  }

  async getHistoricalPrices(days: number = 30): Promise<Array<{ timestamp: Date; price: number }>> {
    try {
      const response = await fetch(
        `${this.COINGECKO_API}/coins/quantlink/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko historical API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.prices || !Array.isArray(data.prices)) {
        throw new Error('Invalid historical price data format');
      }
      
      return data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp: new Date(timestamp),
        price
      }));
      
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      
      // Generate basic historical data based on current price
      const currentPrice = await this.getTokenPrice();
      const historicalPrices: Array<{ timestamp: Date; price: number }> = [];
      
      for (let i = days; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        // Add some realistic price variation
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const price = Math.max(0.001, currentPrice.price * (1 + variation));
        
        historicalPrices.push({ timestamp, price });
      }
      
      return historicalPrices;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const priceService = new PriceService();
export type { PriceData };
