import axios from 'axios';

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourEtherscanAPIKey';
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';
const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || '0xe226B7Ae83a44Bb98F67BEA28C4ad73B0925C49E';
const POOL_ADDRESS = import.meta.env.VITE_POOL_ADDRESS || '0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03';

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

interface BlockInfo {
  number: string;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  transactions: string[];
  uncles: string[];
}

interface InternalTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
}

interface ContractABI {
  inputs: Array<{
    internalType: string;
    name: string;
    type: string;
  }>;
  name: string;
  outputs: Array<{
    internalType: string;
    name: string;
    type: string;
  }>;
  stateMutability: string;
  type: string;
}

interface ContractSourceCode {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

interface TokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string;
  tokenType: string;
  totalSupply: string;
  blueCheckmark: string;
  description: string;
  website: string;
  email: string;
  blog: string;
  reddit: string;
  slack: string;
  facebook: string;
  twitter: string;
  bitcointalk: string;
  github: string;
  telegram: string;
  wechat: string;
  linkedin: string;
  discord: string;
  whitepaper: string;
  tokenPriceUSD: string;
}

interface TokenHolder {
  TokenHolderAddress: string;
  TokenHolderQuantity: string;
}

interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

class EtherscanService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheExpiry = 30000; // 30 seconds
  private lastRequestTime = 0;
  private readonly minRequestInterval = 2000; // 2 seconds between requests (0.5 req/sec to be very safe)

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(params: Record<string, string>): Promise<T> {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as T;
    }

    // Add rate limiting
    await this.rateLimit();

    try {
      const response = await axios.get<EtherscanResponse<T>>(ETHERSCAN_BASE_URL, {
        params: {
          ...params,
          apikey: ETHERSCAN_API_KEY,
        },
        timeout: 10000,
      });

      if (response.data.status !== '1') {
        // Handle specific API errors gracefully
        if (response.data.message === 'NOTOK' || response.data.result?.toString().includes('rate limit')) {
          console.warn('Etherscan API rate limit or error:', response.data.result);
          // Return cached data if available
          const lastCached = this.cache.get(cacheKey);
          if (lastCached && Date.now() - lastCached.timestamp < this.cacheExpiry * 3) {
            console.log('Using extended cached data due to API error');
            return lastCached.data as T;
          }
        }
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }

      this.cache.set(cacheKey, { data: response.data.result, timestamp: Date.now() });
      return response.data.result;
    } catch (error) {
      console.error('Etherscan API request failed:', error);
      throw error;
    }
  }

  async getTokenInfo(): Promise<TokenInfo> {
    // Get real token supply from Etherscan (free endpoint)
    const supply = await this.makeRequest<string>({
      module: 'stats',
      action: 'tokensupply',
      contractaddress: TOKEN_ADDRESS,
    });

    // Return real Quantlink (QLK) token info
    return {
      contractAddress: TOKEN_ADDRESS,
      tokenName: 'Quantlink',
      symbol: 'QLK',
      divisor: '18',
      tokenType: 'ERC20',
      totalSupply: supply,
      blueCheckmark: 'Disabled',
      description: 'Quantlink - AI-powered blockchain analytics platform',
      website: 'https://quantlinkai.com/',
      email: '',
      blog: '',
      reddit: '',
      slack: '',
      facebook: '',
      twitter: '',
      bitcointalk: '',
      github: '',
      telegram: '',
      wechat: '',
      linkedin: '',
      discord: '',
      whitepaper: '',
      tokenPriceUSD: '0.00' // Will be fetched from price API
    };
  }

  async getTokenHolders(_page: number = 1, offset: number = 100): Promise<TokenHolder[]> {
    // Use alternative method to get real holders by analyzing recent transactions
    const transfers = await this.getTokenTransfers(0, 99999999, 1, 200); // Reduce to 200 to avoid rate limits

    // Extract unique addresses and their transaction counts
    const holderMap = new Map<string, number>();

    transfers.forEach(tx => {
      // Count transactions for each address
      if (tx.to && tx.to !== '0x0000000000000000000000000000000000000000') {
        holderMap.set(tx.to, (holderMap.get(tx.to) || 0) + 1);
      }
      if (tx.from && tx.from !== '0x0000000000000000000000000000000000000000') {
        holderMap.set(tx.from, (holderMap.get(tx.from) || 0) + 1);
      }
    });

    // Get top active addresses and fetch their balances (limit to 10 to avoid rate limits)
    const topAddresses = Array.from(holderMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(10, offset))
      .map(([address]) => address);

    const holders: TokenHolder[] = [];

    // Get balance for each top address with longer delays
    for (const address of topAddresses) {
      try {
        const balance = await this.getAccountTokenBalance(address);
        if (balance && balance !== '0') {
          holders.push({
            TokenHolderAddress: address,
            TokenHolderQuantity: balance
          });
        }
      } catch (error) {
        console.warn(`Failed to get balance for ${address}:`, error);
      }

      // Add longer delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 second delay
    }

    return holders.sort((a, b) =>
      parseFloat(b.TokenHolderQuantity) - parseFloat(a.TokenHolderQuantity)
    );
  }



  async getTokenTransfers(
    startblock: number = 0,
    endblock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<Transaction[]> {
    // Get real token transfers from Etherscan
    return this.makeRequest<Transaction[]>({
      module: 'account',
      action: 'tokentx',
      contractaddress: TOKEN_ADDRESS,
      startblock: startblock.toString(),
      endblock: endblock.toString(),
      page: page.toString(),
      offset: offset.toString(),
      sort: 'desc',
    });
  }

  async getAccountTokenBalance(address: string): Promise<string> {
    const result = await this.makeRequest<string>({
      module: 'account',
      action: 'tokenbalance',
      contractaddress: TOKEN_ADDRESS,
      address: address,
      tag: 'latest',
    });
    return result;
  }

  async getTokenSupply(): Promise<string> {
    return this.makeRequest<string>({
      module: 'stats',
      action: 'tokensupply',
      contractaddress: TOKEN_ADDRESS,
    });
  }

  async getEthPrice(): Promise<{ ethusd: string; ethbtc: string }> {
    return this.makeRequest<{ ethusd: string; ethbtc: string }>({
      module: 'stats',
      action: 'ethprice',
    });
  }

  async getContractABI(): Promise<ContractABI[]> {
    return this.makeRequest<ContractABI[]>({
      module: 'contract',
      action: 'getabi',
      address: TOKEN_ADDRESS,
    });
  }

  async getContractSourceCode(): Promise<ContractSourceCode[]> {
    return this.makeRequest<ContractSourceCode[]>({
      module: 'contract',
      action: 'getsourcecode',
      address: TOKEN_ADDRESS,
    });
  }

  // Get pool/pair information from Etherscan
  async getPoolTransactions(): Promise<Transaction[]> {
    // Get real pool transactions from Etherscan
    return this.makeRequest<Transaction[]>({
      module: 'account',
      action: 'txlist',
      address: POOL_ADDRESS,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '100',
      sort: 'desc',
    });
  }

  async getInternalTransactions(address: string): Promise<InternalTransaction[]> {
    return this.makeRequest<InternalTransaction[]>({
      module: 'account',
      action: 'txlistinternal',
      address: address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '100',
      sort: 'desc',
    });
  }

  // Get gas tracker information
  async getGasOracle(): Promise<{
    SafeGasPrice: string;
    StandardGasPrice: string;
    FastGasPrice: string;
  }> {
    return this.makeRequest<{
      SafeGasPrice: string;
      StandardGasPrice: string;
      FastGasPrice: string;
    }>({
      module: 'gastracker',
      action: 'gasoracle',
    });
  }

  // Get block information
  async getBlockByNumber(blockNumber: string): Promise<BlockInfo> {
    return this.makeRequest<BlockInfo>({
      module: 'proxy',
      action: 'eth_getBlockByNumber',
      tag: blockNumber,
      boolean: 'true',
    });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }





  // Batch request helper for multiple addresses
  async batchGetTokenBalances(addresses: string[]): Promise<Map<string, string>> {
    const balances = new Map<string, string>();
    
    for (const address of addresses) {
      try {
        const balance = await this.getAccountTokenBalance(address);
        balances.set(address, balance);
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      } catch (error) {
        console.error(`Failed to get balance for ${address}:`, error);
        balances.set(address, '0');
      }
    }
    
    return balances;
  }
}

export const etherscanService = new EtherscanService();
