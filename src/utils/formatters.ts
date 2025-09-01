export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
};

export const formatCurrency = (num: number): string => {
  // For very small numbers (like token prices), show more decimals
  if (num < 0.01 && num > 0) {
    return `$${num.toFixed(6)}`;
  }
  if (num < 1 && num > 0) {
    return `$${num.toFixed(4)}`;
  }
  return `$${formatNumber(num)}`;
};

export const formatPercentage = (num: number): string => {
  return `${num.toFixed(2)}%`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};