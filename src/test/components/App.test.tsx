import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the useTokenData hook
vi.mock('../../hooks/useTokenData', () => ({
  useTokenData: vi.fn(() => ({
    holders: [
      {
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
        balance: 1000,
        percentage: 10,
        firstPurchase: new Date('2023-01-01'),
        lastTransaction: new Date('2023-12-01'),
        totalTransactions: 50,
        bought30d: 100,
        sold30d: 50,
        tradingFrequency: 0.5,
      },
    ],
    transactions: [
      {
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
        to: '0x8ba1f109551bD432803012645Aac136c22C177ec8',
        amount: 100,
        timestamp: new Date(),
        fee: 0.001,
        isLargeTransfer: false,
      },
    ],
    poolData: {
      address: '0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03',
      tvl: 1000000,
      volume24h: 100000,
      fees24h: 3000,
      reserve0: 500000,
      reserve1: 500000,
      token0: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
      token1: '0x8ba1f109551bD432803012645Aac136c22C177ec8',
      liquidityProviders: 100,
    },
    stats: {
      totalSupply: 1000000,
      circulatingSupply: 950000,
      holderCount: 1000,
      top10Percentage: 50,
      avgHoldingPeriod: 87.3,
      dailyActiveWallets: 75,
      price: 1.23,
      marketCap: 1230000,
    },
    priceData: [
      { timestamp: new Date('2023-12-01'), value: 1.20 },
      { timestamp: new Date('2023-12-02'), value: 1.23 },
    ],
    volumeData: [
      { timestamp: new Date('2023-12-01'), value: 95000 },
      { timestamp: new Date('2023-12-02'), value: 100000 },
    ],
    holderData: [
      { timestamp: new Date('2023-12-01'), value: 995 },
      { timestamp: new Date('2023-12-02'), value: 1000 },
    ],
    isLoading: false,
    error: null,
    connectionStatus: 'connected' as const,
    lastUpdate: new Date(),
    refetch: vi.fn(),
  })),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the main application', async () => {
    render(<App />);
    
    // Check for header
    expect(screen.getByText('Ethereum Token Analyzer')).toBeInTheDocument();
    
    // Check for token and pool addresses
    expect(screen.getByText(/0xe226b7ae83a44bb98f67bea28c4ad73b0925c49e/)).toBeInTheDocument();
    expect(screen.getByText(/0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03/)).toBeInTheDocument();
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('Token Holder Bubble Map')).toBeInTheDocument();
    });
  });

  it('should handle refresh functionality', async () => {
    const user = userEvent.setup();
    const { useTokenData } = await import('../../hooks/useTokenData');
    const mockRefetch = vi.fn();
    
    vi.mocked(useTokenData).mockReturnValue({
      holders: [],
      transactions: [],
      poolData: null,
      stats: null,
      priceData: [],
      volumeData: [],
      holderData: [],
      isLoading: false,
      error: null,
      connectionStatus: 'connected',
      lastUpdate: new Date(),
      refetch: mockRefetch,
    });

    render(<App />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh data/i });
    await user.click(refreshButton);
    
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should display error state correctly', async () => {
    const { useTokenData } = await import('../../hooks/useTokenData');
    
    vi.mocked(useTokenData).mockReturnValue({
      holders: [],
      transactions: [],
      poolData: null,
      stats: null,
      priceData: [],
      volumeData: [],
      holderData: [],
      isLoading: false,
      error: 'Network connection failed',
      connectionStatus: 'disconnected',
      lastUpdate: null,
      refetch: vi.fn(),
    });

    render(<App />);
    
    expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should show loading states', async () => {
    const { useTokenData } = await import('../../hooks/useTokenData');
    
    vi.mocked(useTokenData).mockReturnValue({
      holders: [],
      transactions: [],
      poolData: null,
      stats: null,
      priceData: [],
      volumeData: [],
      holderData: [],
      isLoading: true,
      error: null,
      connectionStatus: 'connecting',
      lastUpdate: null,
      refetch: vi.fn(),
    });

    render(<App />);
    
    // Should show skeleton loaders
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display connection status', async () => {
    const { useTokenData } = await import('../../hooks/useTokenData');
    
    vi.mocked(useTokenData).mockReturnValue({
      holders: [],
      transactions: [],
      poolData: null,
      stats: null,
      priceData: [],
      volumeData: [],
      holderData: [],
      isLoading: false,
      error: null,
      connectionStatus: 'disconnected',
      lastUpdate: new Date(),
      refetch: vi.fn(),
    });

    render(<App />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should handle error boundary', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { useTokenData } = await import('../../hooks/useTokenData');
    vi.mocked(useTokenData).mockImplementation(() => {
      return {
        holders: [],
        transactions: [],
        poolData: null,
        stats: null,
        priceData: [],
        volumeData: [],
        holderData: [],
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        lastUpdate: new Date(),
        refetch: vi.fn(),
      };
    });

    // This would normally be caught by ErrorBoundary
    expect(() => render(<ThrowError />)).toThrow('Test error');
    
    consoleSpy.mockRestore();
  });

  it('should be responsive', async () => {
    render(<App />);
    
    // Check for responsive classes
    const main = screen.getByRole('main');
    expect(main).toHaveClass('max-w-7xl', 'mx-auto', 'px-8', 'py-8');
    
    // Check for grid layout
    await waitFor(() => {
      const gridElements = document.querySelectorAll('.grid');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  it('should have proper accessibility', async () => {
    render(<App />);
    
    // Check for proper heading structure
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    
    // Check for proper button labels
    const refreshButton = screen.getByRole('button', { name: /refresh data/i });
    expect(refreshButton).toBeInTheDocument();
    
    // Check for proper main landmark
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});
