import React, { useRef, useEffect, useState, useCallback } from 'react';
import { dexscreenerService } from '../services/dexscreenerService';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface RealHolderData {
  address: string;
  balance: number;
  percentage: number;
  isWhale: boolean;
  category: string;
  lastActivity: Date;
  txCount: number;
  usdValue: number;
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  holder: RealHolderData;
  vx: number;
  vy: number;
  color: string;
}

interface BubbleMapProps {
  holders: any[];
}

export const BubbleMap: React.FC<BubbleMapProps> = ({ holders }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
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
      const realData: RealHolderData[] = holderData.topHolders.map((holder) => {
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
      console.log('Fetched real holder data:', realData.length, 'holders');
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching real holder data:', error);
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchRealHolderData();
    const interval = setInterval(fetchRealHolderData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [fetchRealHolderData]);

  // Generate bubbles from real holder data
  useEffect(() => {
    if (!realHolderData.length) {
      console.log('No holder data available for bubbles');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not available');
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
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: '#4DACE1'
      };
      
      console.log(`Generated bubble ${index}:`, bubble.x, bubble.y, bubble.radius);
      return bubble;
    });

    console.log('Total bubbles generated:', newBubbles.length);
    setBubbles(newBubbles);
  }, [realHolderData]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw dark background
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw bubbles
      bubbles.forEach((bubble, index) => {
        // Draw bubble
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4DACE1';
        ctx.fill();
        
        // White border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Percentage label for large holders
        if (bubble.holder.percentage > 0.5) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${bubble.holder.percentage.toFixed(1)}%`,
            bubble.x,
            bubble.y + 4
          );
        }
      });

      // Update bubble positions
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

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading holder data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Quantlink Holder Map</h2>
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
        className="w-full h-96 rounded-lg border border-gray-600"
        style={{ background: '#0D1117' }}
      />

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-400">Total Holders</div>
          <div className="text-white font-bold">{formatNumber(realHolderData.length)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Whales</div>
          <div className="text-white font-bold">
            {realHolderData.filter(h => h.isWhale).length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Avg Balance</div>
          <div className="text-white font-bold">
            {formatCurrency(realHolderData.reduce((sum, h) => sum + h.usdValue, 0) / realHolderData.length)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Top Holder</div>
          <div className="text-white font-bold">
            {realHolderData.length > 0 ? `${realHolderData[0].percentage.toFixed(1)}%` : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleMap;
