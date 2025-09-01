export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  firstPurchase: Date;
  lastTransaction: Date;
  totalTransactions: number;
  bought30d: number;
  sold30d: number;
  tradingFrequency: number; // 0-1 scale
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
  fee: number;
  isLargeTransfer: boolean;
}

export interface PoolData {
  address: string;
  tvl: number;
  volume24h: number;
  fees24h: number;
  reserve0: number;
  reserve1: number;
  token0: string;
  token1: string;
  liquidityProviders: number;
}

export interface TokenStats {
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  top10Percentage: number;

  dailyActiveWallets: number;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  liquidityUSD: number;
  transactions24h: number;
  uniqueWallets24h: number;
  avgTransactionSize: number;
  lastUpdated: Date;
}

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
}