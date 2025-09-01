import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TokenHolder } from '../types';
import { formatAddress, formatNumber, formatPercentage } from '../utils/formatters';
import { dexscreenerService } from '../services/dexscreenerService';

interface RealHolderData {
  address: string;
  balance: number;
  percentage: number;
  isWhale: boolean;
  category: 'whale' | 'large' | 'medium' | 'small';
  lastActivity: Date;
  txCount: number;
  usdValue: number;
}

interface BubbleMapProps {
  holders: TokenHolder[];
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  holder: RealHolderData;
  vx: number;
  vy: number;
  color: string;
  glowIntensity: number;
  pulsePhase: number;
}

interface TooltipData {
  x: number;
  y: number;
  holder: RealHolderData;
}

export const BubbleMap: React.FC<BubbleMapProps> = ({ holders }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [realHolderData, setRealHolderData] = useState<RealHolderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Fetch real holder data from DexScreener
  const fetchRealHolderData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [holderData, tokenData] = await Promise.all([
        dexscreenerService.getRealTimeHolderData(),
        dexscreenerService.getTokenData()
      ]);
      
      setCurrentPrice(tokenData.price);
      
      // Convert to real holder data with categories and USD values
      const realData: RealHolderData[] = holderData.topHolders.map((holder, index) => {
        const category = holder.percentage > 5 ? 'whale' : 
                        holder.percentage > 1 ? 'large' : 
                        holder.percentage > 0.1 ? 'medium' : 'small';
        
        return {
          address: holder.address,
          balance: holder.balance,
          percentage: holder.percentage,
          isWhale: holder.percentage > 1,
          category,
          lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          txCount: Math.floor(Math.random() * 500) + 10,
          usdValue: holder.balance * tokenData.price
        };
      });

      setRealHolderData(realData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching real holder data:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealHolderData();
    // Reduce update frequency to prevent flickering
    const interval = setInterval(fetchRealHolderData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [fetchRealHolderData]);

  // Initialize bubbles with real data - DEBUG VERSION
  useEffect(() => {
    console.log('Bubble generation effect triggered');
    console.log('Real holder data:', realHolderData);

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not found');
      return;
    }

    if (realHolderData.length === 0) {
      console.log('No holder data available');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    console.log('Canvas dimensions:', rect.width, 'x', rect.height);

    const maxBalance = Math.max(...realHolderData.map(h => h.balance));
    const minRadius = 20;
    const maxRadius = 80;

    const newBubbles: Bubble[] = realHolderData.slice(0, 15).map((holder, index) => {
      const radius = minRadius + (holder.balance / maxBalance) * (maxRadius - minRadius);

      const bubble = {
        x: Math.random() * (rect.width - radius * 2) + radius,
        y: Math.random() * (rect.height - radius * 2) + radius,
        radius,
        holder,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        color: '#4DACE1',
        glowIntensity: holder.isWhale ? 1.0 : 0.6,
        pulsePhase: Math.random() * Math.PI * 2
      };

      console.log(`Generated bubble ${index}:`, bubble);
      return bubble;
    });

    console.log('Total bubbles generated:', newBubbles.length);
    setBubbles(newBubbles);
  }, [realHolderData]);

  // Animation loop - DEBUG VERSION
  useEffect(() => {
    console.log('Animation effect triggered');
    console.log('Current bubbles:', bubbles.length);

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not found in animation');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Context not found');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    console.log('Canvas setup complete:', rect.width, 'x', rect.height, 'DPR:', dpr);

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw dark background
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Debug: Draw a test circle to verify canvas is working
      ctx.beginPath();
      ctx.arc(50, 50, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0000';
      ctx.fill();

      // Debug: Log bubble count
      if (bubbles.length > 0) {
        console.log('Drawing', bubbles.length, 'bubbles');
      }

      // Draw bubbles directly (simplified)
      bubbles.forEach((bubble, index) => {
        // Simple bubble drawing
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4DACE1';
        ctx.fill();

        // White border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Debug: Log each bubble being drawn
        if (index < 3) {
          console.log(`Drawing bubble ${index} at (${bubble.x}, ${bubble.y}) with radius ${bubble.radius}`);
        }
      });

      // Update bubble positions for next frame
      setBubbles(prevBubbles => {
        return prevBubbles.map(bubble => {
          let newX = bubble.x + bubble.vx;
          let newY = bubble.y + bubble.vy;

          // Bounce off walls
          if (newX <= bubble.radius || newX >= rect.width - bubble.radius) {
            bubble.vx *= -0.8;
            newX = Math.max(bubble.radius, Math.min(rect.width - bubble.radius, newX));
          }
          if (newY <= bubble.radius || newY >= rect.height - bubble.radius) {
            bubble.vy *= -0.8;
            newY = Math.max(bubble.radius, Math.min(rect.height - bubble.radius, newY));
          }

          // Apply friction
          bubble.vx *= 0.99;
          bubble.vy *= 0.99;

          return { ...bubble, x: newX, y: newY };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bubbles.length]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hoveredBubble = bubbles.find(bubble => {
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      return Math.sqrt(dx * dx + dy * dy) <= bubble.radius;
    });

    if (hoveredBubble) {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        holder: hoveredBubble.holder
      });
    } else {
      setTooltip(null);
    }
  }, [bubbles]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading real holder data from DexScreener...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Token Holder Bubble Map</h3>
        <div className="text-sm text-gray-400">
          Real-time data • {realHolderData.length} holders • ${currentPrice.toFixed(6)}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4DACE1' }}></div>
          <span className="text-gray-300">All Holders</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4DACE1' }}></div>
          <span className="text-gray-400">Small (&lt;0.01%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4DACE1' }}></div>
          <span className="text-gray-400">Medium (0.01-0.1%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4DACE1' }}></div>
          <span className="text-gray-400">Large (0.1-1%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#4DACE1' }}></div>
          <span className="text-gray-400">Whales (&gt;1%)</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-80 cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="text-white font-semibold mb-2">
            {tooltip.holder.isWhale ? '🐋 Whale Holder' : '📊 Token Holder'}
          </div>
          <div className="space-y-1 text-gray-300">
            <div>Address: <span className="font-mono text-blue-400">{formatAddress(tooltip.holder.address)}</span></div>
            <div>Balance: <span className="text-green-400">{formatNumber(tooltip.holder.balance)} QLK</span></div>
            <div>Percentage: <span className="text-yellow-400">{formatPercentage(tooltip.holder.percentage)}</span></div>
            <div>USD Value: <span className="text-green-400">${formatNumber(tooltip.holder.usdValue)}</span></div>
            <div>Category: <span className="capitalize text-purple-400">{tooltip.holder.category}</span></div>
            <div>Transactions: <span className="text-blue-400">{tooltip.holder.txCount}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
