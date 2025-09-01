import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Canvas API for bubble map tests
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock ethers provider
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getBlockNumber: vi.fn().mockResolvedValue(18000000),
      getBlock: vi.fn().mockResolvedValue({
        timestamp: Math.floor(Date.now() / 1000),
      }),
    })),
    Contract: vi.fn().mockImplementation(() => ({
      name: vi.fn().mockResolvedValue('Test Token'),
      symbol: vi.fn().mockResolvedValue('TEST'),
      decimals: vi.fn().mockResolvedValue(18),
      totalSupply: vi.fn().mockResolvedValue('1000000000000000000000000'),
      balanceOf: vi.fn().mockResolvedValue('1000000000000000000000'),
      queryFilter: vi.fn().mockResolvedValue([]),
      getReserves: vi.fn().mockResolvedValue([
        '1000000000000000000000',
        '2000000000000000000000',
        Math.floor(Date.now() / 1000),
      ]),
      token0: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      token1: vi.fn().mockResolvedValue('0x0987654321098765432109876543210987654321'),
    })),
    formatUnits: vi.fn((value, decimals) => {
      const num = typeof value === 'string' ? parseInt(value) : value;
      return (num / Math.pow(10, decimals || 18)).toString();
    }),
    formatEther: vi.fn(value => {
      const num = typeof value === 'string' ? parseInt(value) : value;
      return (num / Math.pow(10, 18)).toString();
    }),
    getAddress: vi.fn(address => address),
  },
}));

// Console error suppression for tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
