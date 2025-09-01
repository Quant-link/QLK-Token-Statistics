import { ethers } from 'ethers';

// Token contract ABI (minimal ERC-20)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Uniswap V2 Pair ABI (minimal)
const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
];

const TOKEN_ADDRESS = '0xe226b7ae83a44bb98f67bea28c4ad73b0925c49e';
const POOL_ADDRESS = '0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03';

class EthersService {
  private provider: ethers.JsonRpcProvider;
  private tokenContract: ethers.Contract;
  private poolContract: ethers.Contract;

  constructor() {
    // Using public Ethereum RPC endpoints
    this.provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    this.tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, this.provider);
    this.poolContract = new ethers.Contract(POOL_ADDRESS, PAIR_ABI, this.provider);
  }

  async getTokenBasicInfo() {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.tokenContract.name(),
        this.tokenContract.symbol(),
        this.tokenContract.decimals(),
        this.tokenContract.totalSupply()
      ]);

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: Number(ethers.formatUnits(totalSupply, decimals))
      };
    } catch (error) {
      console.error('Error fetching token basic info:', error);
      throw error;
    }
  }

  async getPoolReserves() {
    try {
      const [reserve0, reserve1, timestamp] = await this.poolContract.getReserves();
      const [token0, token1] = await Promise.all([
        this.poolContract.token0(),
        this.poolContract.token1()
      ]);

      return {
        reserve0: Number(ethers.formatEther(reserve0)),
        reserve1: Number(ethers.formatEther(reserve1)),
        timestamp: Number(timestamp),
        token0,
        token1
      };
    } catch (error) {
      console.error('Error fetching pool reserves:', error);
      throw error;
    }
  }

  async getRecentTransfers(fromBlock: number = -100) {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const filter = this.tokenContract.filters.Transfer();
      
      const events = await this.tokenContract.queryFilter(
        filter,
        currentBlock + fromBlock,
        currentBlock
      );

      const transactions = await Promise.all(
        events.slice(-100).map(async (event) => {
          const block = await event.getBlock();
          const tx = await event.getTransaction();

          // Type guard to check if event is EventLog
          if ('args' in event && event.args) {
            return {
              hash: event.transactionHash,
              from: event.args[0] as string,
              to: event.args[1] as string,
              amount: Number(ethers.formatUnits(event.args[2] as bigint, 18)),
              timestamp: new Date(block.timestamp * 1000),
              fee: Number(ethers.formatEther(tx.gasPrice * tx.gasLimit)),
              blockNumber: event.blockNumber
            };
          }

          // Fallback for Log type - return null to filter out later
          return null;
        }).filter(Boolean)
      );

      return transactions.reverse(); // Most recent first
    } catch (error) {
      console.error('Error fetching recent transfers:', error);
      throw error;
    }
  }

  async getHolderBalance(address: string, decimals: number): Promise<number> {
    try {
      const balance = await this.tokenContract.balanceOf(ethers.getAddress(address));
      return Number(ethers.formatUnits(balance, decimals));
    } catch (error) {
      console.error('Error fetching holder balance:', error);
      return 0;
    }
  }
}

export const ethersService = new EthersService();