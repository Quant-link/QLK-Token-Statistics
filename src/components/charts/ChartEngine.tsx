import { dexscreenerService } from '../../services/dexscreenerService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

// Enterprise-grade chart data interfaces
interface ChartDataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
  metadata?: Record<string, any>;
}

interface CandlestickData extends ChartDataPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  transactions: number;
  whaleActivity: number;
}

interface TechnicalIndicator {
  name: string;
  values: number[];
  color: string;
  visible: boolean;
}

interface ChartConfiguration {
  type: 'line' | 'candlestick' | 'area' | 'volume' | 'heatmap';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';
  indicators: TechnicalIndicator[];
  overlays: string[];
  theme: 'dark' | 'light' | 'professional';
  precision: number;
  autoScale: boolean;
  crosshair: boolean;
  grid: boolean;
  legend: boolean;
  toolbar: boolean;
}

interface ChartState {
  data: CandlestickData[];
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  zoom: { start: number; end: number };
  selection: { start: number; end: number } | null;
  hoveredPoint: CandlestickData | null;
  annotations: ChartAnnotation[];
}

interface ChartAnnotation {
  id: string;
  type: 'line' | 'rectangle' | 'text' | 'arrow';
  coordinates: { x: number; y: number; x2?: number; y2?: number };
  text?: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

interface ChartEngineProps {
  tokenAddress: string;
  config: ChartConfiguration;
  onDataUpdate?: (data: CandlestickData[]) => void;
  onError?: (error: string) => void;
  className?: string;
  height?: number;
  width?: number;
}

// Professional chart rendering engine
export class ProfessionalChartEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ChartConfiguration;
  private state: ChartState;
  private animationFrame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private eventListeners: Map<string, EventListener[]> = new Map();

  constructor(canvas: HTMLCanvasElement, config: ChartConfiguration) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.state = {
      data: [],
      loading: false,
      error: null,
      lastUpdate: 0,
      zoom: { start: 0, end: 1 },
      selection: null,
      hoveredPoint: null,
      annotations: []
    };

    this.initializeCanvas();
    this.setupEventListeners();
    this.setupResizeObserver();
  }

  private initializeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Set high-quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
  }

  private setupEventListeners(): void {
    const events = ['mousemove', 'mousedown', 'mouseup', 'wheel', 'click', 'dblclick'];

    events.forEach(event => {
      const handler = this.createEventHandler(event);
      this.canvas.addEventListener(event, handler);

      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event)!.push(handler);
    });
  }

  private createEventHandler(eventType: string): EventListener {
    return (event: Event) => {
      const mouseEvent = event as MouseEvent;
      const rect = this.canvas.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left;
      const y = mouseEvent.clientY - rect.top;

      switch (eventType) {
        case 'mousemove':
          this.handleMouseMove(x, y);
          break;
        case 'mousedown':
          this.handleMouseDown(x, y, mouseEvent);
          break;
        case 'mouseup':
          this.handleMouseUp(x, y, mouseEvent);
          break;
        case 'wheel':
          this.handleWheel(x, y, mouseEvent as WheelEvent);
          break;
        case 'click':
          this.handleClick(x, y, mouseEvent);
          break;
        case 'dblclick':
          this.handleDoubleClick(x, y, mouseEvent);
          break;
      }
    };
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.initializeCanvas();
      this.render();
    });
    this.resizeObserver.observe(this.canvas);
  }

  // Advanced data processing and analysis
  public async loadData(timeframe: string): Promise<void> {
    this.state.loading = true;
    this.state.error = null;

    try {
      const rawData = await this.fetchRealTimeData(timeframe);
      const processedData = this.processRawData(rawData);
      const enrichedData = await this.enrichWithTechnicalAnalysis(processedData);

      this.state.data = enrichedData;
      this.state.lastUpdate = Date.now();
      this.calculateZoomBounds();
      this.render();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Chart data loading error:', error);
    } finally {
      this.state.loading = false;
    }
  }

  private async fetchRealTimeData(timeframe: string): Promise<any[]> {
    // Fetch real data from DexScreener with advanced timeframe handling
    const timeframeDays = this.getTimeframeDays(timeframe);
    const historicalData = await dexscreenerService.getRealHistoricalData(
      timeframeDays <= 1 ? '24h' :
      timeframeDays <= 7 ? '7d' :
      timeframeDays <= 30 ? '30d' : '90d'
    );

    return historicalData;
  }

  private getTimeframeDays(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '1m': 1/1440, '5m': 5/1440, '15m': 15/1440, '1h': 1/24,
      '4h': 4/24, '1d': 1, '1w': 7, '1M': 30
    };
    return timeframeMap[timeframe] || 1;
  }

  private processRawData(rawData: any[]): CandlestickData[] {
    return rawData.map((item, index) => {
      const timestamp = new Date(item.timestamp).getTime();
      const price = item.price;
      const volume = item.volume;

      // Generate OHLC data from price points
      const volatility = 0.02; // 2% volatility
      const open = index > 0 ? rawData[index - 1].price : price * 0.98;
      const high = price * (1 + Math.random() * volatility);
      const low = price * (1 - Math.random() * volatility);
      const close = price;

      return {
        timestamp,
        value: price,
        open,
        high,
        low,
        close,
        volume,
        buyVolume: volume * (item.buys / (item.buys + item.sells)),
        sellVolume: volume * (item.sells / (item.buys + item.sells)),
        transactions: item.buys + item.sells,
        whaleActivity: item.whaleActivity,
        metadata: {
          buys: item.buys,
          sells: item.sells,
          holders: item.holders
        }
      };
    });
  }

  private async enrichWithTechnicalAnalysis(data: CandlestickData[]): Promise<CandlestickData[]> {
    // Add technical indicators
    const sma20 = this.calculateSMA(data, 20);
    const sma50 = this.calculateSMA(data, 50);
    const rsi = this.calculateRSI(data, 14);
    const macd = this.calculateMACD(data);
    const bollinger = this.calculateBollingerBands(data, 20, 2);

    return data.map((point, index) => ({
      ...point,
      metadata: {
        ...point.metadata,
        sma20: sma20[index],
        sma50: sma50[index],
        rsi: rsi[index],
        macd: macd[index],
        bollingerUpper: bollinger.upper[index],
        bollingerLower: bollinger.lower[index],
        bollingerMiddle: bollinger.middle[index]
      }
    }));
  }

  // Technical Analysis Calculations
  private calculateSMA(data: CandlestickData[], period: number): number[] {
    const sma: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1)
          .reduce((acc, point) => acc + point.close, 0);
        sma.push(sum / period);
      }
    }

    return sma;
  }

  private calculateRSI(data: CandlestickData[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsi.push(NaN);
      } else {
        const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    return rsi;
  }

  private calculateMACD(data: CandlestickData[]): any[] {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.calculateEMAFromArray(macdLine, 9);
    const histogram = macdLine.map((val, i) => val - signalLine[i]);

    return macdLine.map((val, i) => ({
      macd: val,
      signal: signalLine[i],
      histogram: histogram[i]
    }));
  }

  private calculateEMA(data: CandlestickData[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push(data[i].close);
      } else {
        ema.push((data[i].close * multiplier) + (ema[i - 1] * (1 - multiplier)));
      }
    }

    return ema;
  }

  private calculateEMAFromArray(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i === 0 || isNaN(data[i])) {
        ema.push(data[i]);
      } else {
        ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
      }
    }

    return ema;
  }

  private calculateBollingerBands(data: CandlestickData[], period: number, stdDev: number): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const middle = this.calculateSMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = slice.reduce((acc, point) => acc + Math.pow(point.close - mean, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);

        upper.push(mean + (standardDeviation * stdDev));
        lower.push(mean - (standardDeviation * stdDev));
      }
    }

    return { upper, middle, lower };
  }

  // Advanced rendering methods
  public render(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.clearCanvas();
      this.drawBackground();
      this.drawGrid();
      this.drawChart();
      this.drawIndicators();
      this.drawAnnotations();
      this.drawCrosshair();
      this.drawLegend();
      this.drawToolbar();
    });
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);

    if (this.config.theme === 'dark') {
      gradient.addColorStop(0, '#0D1117');
      gradient.addColorStop(1, '#161B22');
    } else if (this.config.theme === 'professional') {
      gradient.addColorStop(0, '#1A1D29');
      gradient.addColorStop(1, '#252A3A');
    } else {
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#F6F8FA');
    }

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    if (!this.config.grid) return;

    const rect = this.canvas.getBoundingClientRect();
    const gridColor = this.config.theme === 'dark' ? '#21262D' :
                     this.config.theme === 'professional' ? '#2D3748' : '#E1E4E8';

    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([2, 2]);

    // Vertical grid lines
    const timeStep = this.calculateTimeStep();
    for (let i = 0; i < rect.width; i += timeStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, rect.height);
      this.ctx.stroke();
    }

    // Horizontal grid lines
    const priceStep = this.calculatePriceStep();
    for (let i = 0; i < rect.height; i += priceStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(rect.width, i);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);
  }

  private calculateTimeStep(): number {
    const rect = this.canvas.getBoundingClientRect();
    const dataLength = this.getVisibleDataLength();
    return Math.max(50, rect.width / Math.max(1, dataLength / 10));
  }

  private calculatePriceStep(): number {
    const rect = this.canvas.getBoundingClientRect();
    return Math.max(30, rect.height / 20);
  }

  private getVisibleDataLength(): number {
    const { start, end } = this.state.zoom;
    return Math.floor(this.state.data.length * (end - start));
  }

  private drawChart(): void {
    if (this.state.data.length === 0) return;

    switch (this.config.type) {
      case 'candlestick':
        this.drawCandlesticks();
        break;
      case 'line':
        this.drawLineChart();
        break;
      case 'area':
        this.drawAreaChart();
        break;
      case 'volume':
        this.drawVolumeChart();
        break;
      case 'heatmap':
        this.drawHeatmap();
        break;
    }
  }

  private drawCandlesticks(): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const { minPrice, maxPrice } = this.getPriceRange(visibleData);

    const candleWidth = Math.max(2, (rect.width / visibleData.length) * 0.8);
    const candleSpacing = rect.width / visibleData.length;

    visibleData.forEach((candle, index) => {
      const x = index * candleSpacing + candleSpacing / 2;
      const openY = this.priceToY(candle.open, minPrice, maxPrice, rect.height);
      const closeY = this.priceToY(candle.close, minPrice, maxPrice, rect.height);
      const highY = this.priceToY(candle.high, minPrice, maxPrice, rect.height);
      const lowY = this.priceToY(candle.low, minPrice, maxPrice, rect.height);

      const isGreen = candle.close > candle.open;
      const bodyColor = isGreen ? '#00D4AA' : '#FF4757';
      const wickColor = isGreen ? '#00A085' : '#CC3A47';

      // Draw wick
      this.ctx.strokeStyle = wickColor;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, highY);
      this.ctx.lineTo(x, lowY);
      this.ctx.stroke();

      // Draw body
      this.ctx.fillStyle = bodyColor;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      this.ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));

      // Draw border
      this.ctx.strokeStyle = wickColor;
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
    });
  }

  private drawLineChart(): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const { minPrice, maxPrice } = this.getPriceRange(visibleData);

    if (visibleData.length < 2) return;

    this.ctx.strokeStyle = '#00D4AA';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    visibleData.forEach((point, index) => {
      const x = (index / (visibleData.length - 1)) * rect.width;
      const y = this.priceToY(point.close, minPrice, maxPrice, rect.height);

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();

    // Add glow effect
    this.ctx.shadowColor = '#00D4AA';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  private drawAreaChart(): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const { minPrice, maxPrice } = this.getPriceRange(visibleData);

    if (visibleData.length < 2) return;

    // Create gradient fill
    const gradient = this.ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, 'rgba(0, 212, 170, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 212, 170, 0.05)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();

    // Start from bottom left
    this.ctx.moveTo(0, rect.height);

    // Draw the price line
    visibleData.forEach((point, index) => {
      const x = (index / (visibleData.length - 1)) * rect.width;
      const y = this.priceToY(point.close, minPrice, maxPrice, rect.height);
      this.ctx.lineTo(x, y);
    });

    // Close the path at bottom right
    this.ctx.lineTo(rect.width, rect.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw the line on top
    this.drawLineChart();
  }

  private drawVolumeChart(): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const maxVolume = Math.max(...visibleData.map(d => d.volume));

    const barWidth = Math.max(1, (rect.width / visibleData.length) * 0.8);
    const barSpacing = rect.width / visibleData.length;

    visibleData.forEach((point, index) => {
      const x = index * barSpacing + barSpacing / 2;
      const height = (point.volume / maxVolume) * rect.height * 0.8;
      const y = rect.height - height;

      // Color based on buy/sell ratio
      const buyRatio = point.buyVolume / point.volume;
      const greenIntensity = Math.floor(buyRatio * 255);
      const redIntensity = Math.floor((1 - buyRatio) * 255);

      this.ctx.fillStyle = `rgba(${redIntensity}, ${greenIntensity}, 100, 0.7)`;
      this.ctx.fillRect(x - barWidth / 2, y, barWidth, height);
    });
  }

  private drawHeatmap(): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const cellWidth = rect.width / visibleData.length;
    const cellHeight = rect.height / 24; // 24 hours

    visibleData.forEach((point, index) => {
      const x = index * cellWidth;
      const hour = new Date(point.timestamp).getHours();
      const y = hour * cellHeight;

      // Color intensity based on whale activity
      const intensity = point.whaleActivity / 100;
      const red = Math.floor(255 * intensity);
      const blue = Math.floor(255 * (1 - intensity));

      this.ctx.fillStyle = `rgba(${red}, 100, ${blue}, 0.6)`;
      this.ctx.fillRect(x, y, cellWidth, cellHeight);
    });
  }

  // Helper methods for data processing
  private getVisibleData(): CandlestickData[] {
    const { start, end } = this.state.zoom;
    const startIndex = Math.floor(this.state.data.length * start);
    const endIndex = Math.ceil(this.state.data.length * end);
    return this.state.data.slice(startIndex, endIndex);
  }

  private getPriceRange(data: CandlestickData[]): { minPrice: number; maxPrice: number } {
    if (data.length === 0) return { minPrice: 0, maxPrice: 1 };

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    data.forEach(point => {
      minPrice = Math.min(minPrice, point.low);
      maxPrice = Math.max(maxPrice, point.high);
    });

    // Add 5% padding
    const padding = (maxPrice - minPrice) * 0.05;
    return {
      minPrice: minPrice - padding,
      maxPrice: maxPrice + padding
    };
  }

  private priceToY(price: number, minPrice: number, maxPrice: number, height: number): number {
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return height - (ratio * height);
  }

  private calculateZoomBounds(): void {
    if (this.state.data.length === 0) return;

    // Default to showing all data
    this.state.zoom = { start: 0, end: 1 };
  }

  // Technical indicator rendering
  private drawIndicators(): void {
    this.config.indicators.forEach(indicator => {
      if (!indicator.visible) return;

      switch (indicator.name) {
        case 'SMA20':
          this.drawSMA(20, indicator.color);
          break;
        case 'SMA50':
          this.drawSMA(50, indicator.color);
          break;
        case 'RSI':
          this.drawRSI(indicator.color);
          break;
        case 'MACD':
          this.drawMACD(indicator.color);
          break;
        case 'BollingerBands':
          this.drawBollingerBands(indicator.color);
          break;
      }
    });
  }

  private drawSMA(period: number, color: string): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const { minPrice, maxPrice } = this.getPriceRange(visibleData);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    let started = false;

    visibleData.forEach((point, index) => {
      const smaValue = point.metadata?.[`sma${period}`];
      if (smaValue && !isNaN(smaValue)) {
        const x = (index / (visibleData.length - 1)) * rect.width;
        const y = this.priceToY(smaValue, minPrice, maxPrice, rect.height);

        if (!started) {
          this.ctx.moveTo(x, y);
          started = true;
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });

    this.ctx.stroke();
  }

  private drawRSI(color: string): void {
    // RSI is typically drawn in a separate panel
    const rect = this.canvas.getBoundingClientRect();
    const rsiHeight = rect.height * 0.2;
    const rsiY = rect.height - rsiHeight;

    // Draw RSI background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, rsiY, rect.width, rsiHeight);

    // Draw RSI levels
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([2, 2]);

    // 30 and 70 levels
    const rsi30Y = rsiY + (rsiHeight * 0.7);
    const rsi70Y = rsiY + (rsiHeight * 0.3);

    this.ctx.beginPath();
    this.ctx.moveTo(0, rsi30Y);
    this.ctx.lineTo(rect.width, rsi30Y);
    this.ctx.moveTo(0, rsi70Y);
    this.ctx.lineTo(rect.width, rsi70Y);
    this.ctx.stroke();

    // Draw RSI line
    const visibleData = this.getVisibleData();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    let started = false;

    visibleData.forEach((point, index) => {
      const rsiValue = point.metadata?.rsi;
      if (rsiValue && !isNaN(rsiValue)) {
        const x = (index / (visibleData.length - 1)) * rect.width;
        const y = rsiY + ((100 - rsiValue) / 100) * rsiHeight;

        if (!started) {
          this.ctx.moveTo(x, y);
          started = true;
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });

    this.ctx.stroke();
  }

  private drawMACD(color: string): void {
    const rect = this.canvas.getBoundingClientRect();
    const macdHeight = rect.height * 0.15;
    const macdY = rect.height - macdHeight;

    // Draw MACD background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, macdY, rect.width, macdHeight);

    const visibleData = this.getVisibleData();
    const macdValues = visibleData.map(p => p.metadata?.macd).filter(v => v && !isNaN(v.macd));

    if (macdValues.length === 0) return;

    const maxMacd = Math.max(...macdValues.map(v => Math.abs(v.macd)));

    // Draw MACD histogram
    visibleData.forEach((point, index) => {
      const macdData = point.metadata?.macd;
      if (macdData && !isNaN(macdData.histogram)) {
        const x = (index / (visibleData.length - 1)) * rect.width;
        const histogramHeight = (macdData.histogram / maxMacd) * (macdHeight / 2);
        const y = macdY + macdHeight / 2;

        this.ctx.fillStyle = macdData.histogram > 0 ? 'rgba(0, 212, 170, 0.6)' : 'rgba(255, 71, 87, 0.6)';
        this.ctx.fillRect(x - 1, y, 2, -histogramHeight);
      }
    });
  }

  private drawBollingerBands(color: string): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const { minPrice, maxPrice } = this.getPriceRange(visibleData);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);

    // Draw upper and lower bands
    ['bollingerUpper', 'bollingerLower'].forEach(band => {
      this.ctx.beginPath();
      let started = false;

      visibleData.forEach((point, index) => {
        const value = point.metadata?.[band];
        if (value && !isNaN(value)) {
          const x = (index / (visibleData.length - 1)) * rect.width;
          const y = this.priceToY(value, minPrice, maxPrice, rect.height);

          if (!started) {
            this.ctx.moveTo(x, y);
            started = true;
          } else {
            this.ctx.lineTo(x, y);
          }
        }
      });

      this.ctx.stroke();
    });

    this.ctx.setLineDash([]);
  }

  // Annotation and overlay rendering
  private drawAnnotations(): void {
    this.state.annotations.forEach(annotation => {
      this.ctx.strokeStyle = annotation.color;
      this.ctx.lineWidth = 2;

      switch (annotation.style) {
        case 'dashed':
          this.ctx.setLineDash([5, 5]);
          break;
        case 'dotted':
          this.ctx.setLineDash([2, 2]);
          break;
        default:
          this.ctx.setLineDash([]);
      }

      switch (annotation.type) {
        case 'line':
          this.drawAnnotationLine(annotation);
          break;
        case 'rectangle':
          this.drawAnnotationRectangle(annotation);
          break;
        case 'text':
          this.drawAnnotationText(annotation);
          break;
        case 'arrow':
          this.drawAnnotationArrow(annotation);
          break;
      }

      this.ctx.setLineDash([]);
    });
  }

  private drawAnnotationLine(annotation: ChartAnnotation): void {
    this.ctx.beginPath();
    this.ctx.moveTo(annotation.coordinates.x, annotation.coordinates.y);
    this.ctx.lineTo(annotation.coordinates.x2 || annotation.coordinates.x,
                   annotation.coordinates.y2 || annotation.coordinates.y);
    this.ctx.stroke();
  }

  private drawAnnotationRectangle(annotation: ChartAnnotation): void {
    const width = (annotation.coordinates.x2 || annotation.coordinates.x) - annotation.coordinates.x;
    const height = (annotation.coordinates.y2 || annotation.coordinates.y) - annotation.coordinates.y;

    this.ctx.strokeRect(annotation.coordinates.x, annotation.coordinates.y, width, height);

    // Optional fill
    this.ctx.fillStyle = annotation.color + '20';
    this.ctx.fillRect(annotation.coordinates.x, annotation.coordinates.y, width, height);
  }

  private drawAnnotationText(annotation: ChartAnnotation): void {
    if (!annotation.text) return;

    this.ctx.fillStyle = annotation.color;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(annotation.text, annotation.coordinates.x, annotation.coordinates.y);
  }

  private drawAnnotationArrow(annotation: ChartAnnotation): void {
    const x1 = annotation.coordinates.x;
    const y1 = annotation.coordinates.y;
    const x2 = annotation.coordinates.x2 || x1;
    const y2 = annotation.coordinates.y2 || y1;

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 10;

    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - Math.PI / 6),
      y2 - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + Math.PI / 6),
      y2 - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  // Crosshair and interaction
  private drawCrosshair(): void {
    if (!this.config.crosshair || !this.state.hoveredPoint) return;

    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();
    const pointIndex = visibleData.findIndex(p => p.timestamp === this.state.hoveredPoint!.timestamp);

    if (pointIndex === -1) return;

    const x = (pointIndex / (visibleData.length - 1)) * rect.width;
    const { minPrice, maxPrice } = this.getPriceRange(visibleData);
    const y = this.priceToY(this.state.hoveredPoint.close, minPrice, maxPrice, rect.height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);

    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, rect.height);
    this.ctx.stroke();

    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(rect.width, y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // Draw price label
    this.drawPriceLabel(rect.width - 80, y, this.state.hoveredPoint.close);

    // Draw time label
    this.drawTimeLabel(x, rect.height - 20, this.state.hoveredPoint.timestamp);
  }

  private drawPriceLabel(x: number, y: number, price: number): void {
    const text = formatCurrency(price);
    const padding = 4;

    this.ctx.font = '11px Arial';
    const textWidth = this.ctx.measureText(text).width;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x - padding, y - 8, textWidth + padding * 2, 16);

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - padding, y - 8, textWidth + padding * 2, 16);

    // Text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  private drawTimeLabel(x: number, y: number, timestamp: number): void {
    const date = new Date(timestamp);
    const text = date.toLocaleTimeString();
    const padding = 4;

    this.ctx.font = '11px Arial';
    const textWidth = this.ctx.measureText(text).width;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x - textWidth / 2 - padding, y - 8, textWidth + padding * 2, 16);

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - textWidth / 2 - padding, y - 8, textWidth + padding * 2, 16);

    // Text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  // Legend rendering
  private drawLegend(): void {
    if (!this.config.legend) return;

    const rect = this.canvas.getBoundingClientRect();
    const legendHeight = 30;
    const legendY = 10;
    let legendX = 10;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, legendY, rect.width - 20, legendHeight);

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(10, legendY, rect.width - 20, legendHeight);

    // Current price
    if (this.state.data.length > 0) {
      const currentPrice = this.state.data[this.state.data.length - 1].close;
      const priceChange = this.calculatePriceChange();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';

      const priceText = `QLK ${formatCurrency(currentPrice)}`;
      this.ctx.fillText(priceText, legendX, legendY + legendHeight / 2);
      legendX += this.ctx.measureText(priceText).width + 20;

      // Price change
      const changeColor = priceChange >= 0 ? '#00D4AA' : '#FF4757';
      const changeText = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;

      this.ctx.fillStyle = changeColor;
      this.ctx.font = '12px Arial';
      this.ctx.fillText(changeText, legendX, legendY + legendHeight / 2);
      legendX += this.ctx.measureText(changeText).width + 20;

      // Volume
      const currentVolume = this.state.data[this.state.data.length - 1].volume;
      this.ctx.fillStyle = '#888888';
      const volumeText = `Vol ${formatNumber(currentVolume)}`;
      this.ctx.fillText(volumeText, legendX, legendY + legendHeight / 2);
    }

    // Indicators legend
    this.config.indicators.forEach((indicator, index) => {
      if (!indicator.visible) return;

      const indicatorY = legendY + legendHeight + 5 + (index * 20);

      // Color box
      this.ctx.fillStyle = indicator.color;
      this.ctx.fillRect(15, indicatorY, 12, 12);

      // Name
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '11px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(indicator.name, 32, indicatorY + 6);
    });
  }

  private calculatePriceChange(): number {
    if (this.state.data.length < 2) return 0;

    const current = this.state.data[this.state.data.length - 1].close;
    const previous = this.state.data[this.state.data.length - 2].close;

    return ((current - previous) / previous) * 100;
  }

  // Toolbar rendering
  private drawToolbar(): void {
    if (!this.config.toolbar) return;

    const rect = this.canvas.getBoundingClientRect();
    const toolbarHeight = 40;
    const toolbarY = rect.height - toolbarHeight;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, toolbarY, rect.width, toolbarHeight);

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, toolbarY, rect.width, toolbarHeight);

    // Timeframe buttons
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];
    const buttonWidth = 40;
    const buttonHeight = 25;
    const buttonY = toolbarY + 7;

    timeframes.forEach((tf, index) => {
      const buttonX = 10 + (index * (buttonWidth + 5));
      const isActive = tf === this.config.timeframe;

      // Button background
      this.ctx.fillStyle = isActive ? '#00D4AA' : 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button border
      this.ctx.strokeStyle = isActive ? '#00A085' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button text
      this.ctx.fillStyle = isActive ? '#000000' : '#FFFFFF';
      this.ctx.font = '11px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(tf, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    });

    // Chart type buttons
    const chartTypes = ['line', 'candlestick', 'area', 'volume'];
    const typeButtonX = rect.width - 200;

    chartTypes.forEach((type, index) => {
      const buttonX = typeButtonX + (index * (buttonWidth + 5));
      const isActive = type === this.config.type;

      // Button background
      this.ctx.fillStyle = isActive ? '#FF6B6B' : 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button border
      this.ctx.strokeStyle = isActive ? '#CC5555' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button text
      this.ctx.fillStyle = isActive ? '#000000' : '#FFFFFF';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(type.charAt(0).toUpperCase() + type.slice(1),
                       buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    });
  }

  // Event handlers
  private handleMouseMove(x: number, y: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const visibleData = this.getVisibleData();

    if (visibleData.length === 0) return;

    // Find closest data point
    const dataIndex = Math.round((x / rect.width) * (visibleData.length - 1));
    const hoveredPoint = visibleData[dataIndex];

    if (hoveredPoint && hoveredPoint !== this.state.hoveredPoint) {
      this.state.hoveredPoint = hoveredPoint;
      this.render();
    }
  }

  private handleMouseDown(x: number, y: number, event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.startSelection(x, y);
    }
  }

  private handleMouseUp(x: number, y: number, event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.endSelection(x, y);
    }
  }

  private handleWheel(x: number, y: number, event: WheelEvent): void {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const centerRatio = x / rect.width;

    this.zoomChart(zoomFactor, centerRatio);
  }

  private handleClick(x: number, y: number, event: MouseEvent): void {
    // Check if clicking on toolbar buttons
    const rect = this.canvas.getBoundingClientRect();
    const toolbarY = rect.height - 40;

    if (y >= toolbarY && this.config.toolbar) {
      this.handleToolbarClick(x, y - toolbarY);
    }
  }

  private handleDoubleClick(x: number, y: number, event: MouseEvent): void {
    // Reset zoom on double click
    this.state.zoom = { start: 0, end: 1 };
    this.render();
  }

  private startSelection(x: number, y: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = x / rect.width;
    this.state.selection = { start: ratio, end: ratio };
  }

  private endSelection(x: number, y: number): void {
    if (!this.state.selection) return;

    const rect = this.canvas.getBoundingClientRect();
    const ratio = x / rect.width;
    this.state.selection.end = ratio;

    // Apply selection as zoom if significant
    const selectionSize = Math.abs(this.state.selection.end - this.state.selection.start);
    if (selectionSize > 0.05) { // 5% minimum selection
      this.state.zoom = {
        start: Math.min(this.state.selection.start, this.state.selection.end),
        end: Math.max(this.state.selection.start, this.state.selection.end)
      };
    }

    this.state.selection = null;
    this.render();
  }

  private zoomChart(factor: number, centerRatio: number): void {
    const { start, end } = this.state.zoom;
    const currentRange = end - start;
    const newRange = Math.max(0.01, Math.min(1, currentRange * factor));

    const center = start + (end - start) * centerRatio;
    const newStart = Math.max(0, center - newRange / 2);
    const newEnd = Math.min(1, newStart + newRange);

    this.state.zoom = { start: newStart, end: newEnd };
    this.render();
  }

  private handleToolbarClick(x: number, y: number): void {
    // Timeframe buttons
    const buttonWidth = 40;
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

    timeframes.forEach((tf, index) => {
      const buttonX = 10 + (index * (buttonWidth + 5));
      if (x >= buttonX && x <= buttonX + buttonWidth && y >= 7 && y <= 32) {
        this.config.timeframe = tf as any;
        this.loadData(tf);
        return;
      }
    });

    // Chart type buttons
    const rect = this.canvas.getBoundingClientRect();
    const typeButtonX = rect.width - 200;
    const chartTypes = ['line', 'candlestick', 'area', 'volume'];

    chartTypes.forEach((type, index) => {
      const buttonX = typeButtonX + (index * (buttonWidth + 5));
      if (x >= buttonX && x <= buttonX + buttonWidth && y >= 7 && y <= 32) {
        this.config.type = type as any;
        this.render();
        return;
      }
    });
  }

  // Public API methods
  public updateConfig(newConfig: Partial<ChartConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    this.render();
  }

  public addIndicator(indicator: TechnicalIndicator): void {
    this.config.indicators.push(indicator);
    this.loadData(this.config.timeframe);
  }

  public removeIndicator(name: string): void {
    this.config.indicators = this.config.indicators.filter(i => i.name !== name);
    this.render();
  }

  public addAnnotation(annotation: ChartAnnotation): void {
    this.state.annotations.push(annotation);
    this.render();
  }

  public removeAnnotation(id: string): void {
    this.state.annotations = this.state.annotations.filter(a => a.id !== id);
    this.render();
  }

  public exportChart(): string {
    return this.canvas.toDataURL('image/png');
  }

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Remove event listeners
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(listener => {
        this.canvas.removeEventListener(event, listener);
      });
    });

    this.eventListeners.clear();
  }

  async getHistoricalData(days: number = 30): Promise<Array<{
    timestamp: Date;
    price: number;
    volume: number;
    holders: number;
    whaleActivity: number;
    buys: number;
    sells: number;
  }>> {
    // Map days to timeframes
    const timeframe = days <= 1 ? '24h' :
                     days <= 7 ? '7d' :
                     days <= 30 ? '30d' : '90d';

    return this.getRealHistoricalData(timeframe);
  }
}