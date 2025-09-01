# Ethereum Token Analyzer

A comprehensive, production-ready web application for analyzing Ethereum tokens with real-time data from Etherscan API.

## Features

### 🎯 Core Features
- **Real-time Token Analysis** - Live data from Etherscan API
- **Interactive Bubble Map** - Visual representation of token holders
- **Comprehensive Charts** - Price history, volume, holder count, and whale activity
- **Holder Analysis** - Detailed breakdown of all token holders
- **Pool Data Analysis** - Liquidity pool metrics and statistics
- **Transaction Flow** - Real-time transaction monitoring
- **Security & Validation** - Input validation, rate limiting, and error handling

### 🚀 Technical Features
- **Production-Ready** - Comprehensive error handling and logging
- **Performance Optimized** - Code splitting, lazy loading, and caching
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Real-time Updates** - 30-second interval data refresh
- **Security Hardened** - Rate limiting, input sanitization, and CSP headers
- **Comprehensive Testing** - Unit, integration, and component tests

## Token Information

**Analyzed Token:** `0xe226B7Ae83a44Bb98F67BEA28C4ad73B0925C49E`
**Pool Contract:** `0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03`

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Etherscan API Key (free at [etherscan.io](https://etherscan.io/apis))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd QLK-Token-Analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Etherscan API key:
   ```env
   VITE_ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

## Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Project Structure
```
src/
├── components/          # React components
│   ├── BubbleMap.tsx   # Interactive bubble visualization
│   ├── ChartsSection.tsx # Interactive charts with Recharts
│   ├── ErrorBoundary.tsx # Error handling component
│   └── ...
├── services/           # API and data services
│   ├── etherscanService.ts # Etherscan API integration
│   ├── blockchainData.ts   # Data processing service
│   └── securityService.ts  # Security and validation
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── test/               # Test files
```

### Key Technologies
- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Blockchain:** Ethers.js, Etherscan API
- **Testing:** Vitest, Testing Library
- **Security:** Input validation, rate limiting, CSP

## API Integration

### Etherscan API
The application integrates with Etherscan API for real-time data:
- Token information and metadata
- Holder balances and distribution
- Transaction history
- Pool data and liquidity metrics

### Rate Limiting
- 5 requests per second (Etherscan free tier)
- Automatic retry with exponential backoff
- Request caching (30-second expiry)

## Security Features

### Input Validation
- Ethereum address validation with checksum verification
- Numeric input validation with range checks
- XSS protection with input sanitization

### Rate Limiting
- Per-IP rate limiting (60 requests/minute)
- Automatic blocking for excessive requests
- Security event logging

### Content Security Policy
- Strict CSP headers
- XSS protection
- Clickjacking prevention

## Performance Optimizations

### Code Splitting
- Lazy loading of components
- Dynamic imports for better initial load time

### Caching Strategy
- API response caching (30 seconds)
- Browser caching for static assets
- Memoization for expensive calculations

### Real-time Updates
- Efficient polling with abort controllers
- Automatic pause when tab is inactive
- Connection status monitoring

## Testing

### Test Coverage
- Unit tests for services and utilities
- Component tests with React Testing Library
- Integration tests for API interactions
- Security tests for validation functions

### Running Tests
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test src/test/services/securityService.test.ts
```

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Set the following in your production environment:
```env
VITE_ETHERSCAN_API_KEY=your_production_api_key
VITE_TOKEN_ADDRESS=0xe226B7Ae83a44Bb98F67BEA28C4ad73B0925C49E
VITE_POOL_ADDRESS=0x60a5773f77Af4c9ee34d16870d65A5f139Fb8F03
```

### Hosting Recommendations
- **Vercel** - Optimal for React applications
- **Netlify** - Great for static site deployment
- **AWS S3 + CloudFront** - Enterprise-grade hosting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for usage examples
