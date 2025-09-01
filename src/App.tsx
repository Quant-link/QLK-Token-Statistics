import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { LoadingSpinner, CardSkeleton } from './components/LoadingSpinner';
import { useTokenData } from './hooks/useTokenData';
import { AlertCircle } from 'lucide-react';

// Lazy load components for better performance
const BubbleMap = lazy(() => import('./components/BubbleMapFixed').then(module => ({ default: module.BubbleMap })));
const HolderAnalysis = lazy(() => import('./components/HolderAnalysis').then(module => ({ default: module.HolderAnalysis })));
const PoolDataAnalysis = lazy(() => import('./components/PoolDataAnalysis').then(module => ({ default: module.PoolDataAnalysis })));
const StatisticsPanel = lazy(() => import('./components/StatisticsPanel').then(module => ({ default: module.StatisticsPanel })));
const TransactionFlow = lazy(() => import('./components/TransactionFlow').then(module => ({ default: module.TransactionFlow })));
const ChartsSection = lazy(() => import('./components/ChartsSection').then(module => ({ default: module.ChartsSection })));
const EnterpriseChartsSection = lazy(() => import('./components/charts/EnterpriseChartsSection').then(module => ({ default: module.EnterpriseChartsSection })));

function App() {
  const {
    holders,
    transactions,
    poolData,
    stats,
    priceData,
    volumeData,
    holderData,
    whaleData,
    isLoading,
    error,
    connectionStatus,
    lastUpdate,
    refetch
  } = useTokenData();

  // Enhanced error handling with retry functionality
  if (error) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-white">
          <Header onRefresh={refetch} isLoading={isLoading} />
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">Error Loading Data</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={refetch}
                      disabled={isLoading}
                      className="px-4 py-2 text-white border border-black rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#4DACE1' }}
                    >
                      {isLoading ? 'Retrying...' : 'Try Again'}
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-gray-100 border border-black rounded-lg font-medium transition-colors hover:bg-gray-200"
                    >
                      Reload Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white font-sans">
        <Header
          onRefresh={refetch}
          isLoading={isLoading}
          lastUpdate={lastUpdate}
          connectionStatus={connectionStatus}
        />

        <main className="max-w-7xl mx-auto px-8 py-8">
          <div className="space-y-8">
            {/* Statistics Panel */}
            <ErrorBoundary fallback={<CardSkeleton />}>
              <Suspense fallback={<CardSkeleton />}>
                {isLoading || !stats ? (
                  <CardSkeleton />
                ) : (
                  <StatisticsPanel stats={stats} />
                )}
              </Suspense>
            </ErrorBoundary>

            {/* Charts Section */}
            <ErrorBoundary fallback={<CardSkeleton className="h-96" />}>
              <Suspense fallback={<CardSkeleton className="h-96" />}>
                {isLoading || priceData.length === 0 ? (
                  <CardSkeleton className="h-96" />
                ) : (
                  <EnterpriseChartsSection
                    priceData={priceData}
                    volumeData={volumeData}
                    holderData={holderData}
                    whaleData={whaleData}
                    stats={stats}
                  />
                )}
              </Suspense>
            </ErrorBoundary>

            {/* Bubble Map */}
            <ErrorBoundary fallback={<CardSkeleton className="h-96" />}>
              <div className="bg-white border border-black rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#4DACE1' }}>
                  Token Holder Bubble Map
                </h2>
                <Suspense fallback={<LoadingSpinner message="Loading bubble map..." />}>
                  {isLoading || holders.length === 0 ? (
                    <LoadingSpinner message="Loading holder data..." />
                  ) : (
                    <BubbleMap holders={holders} />
                  )}
                </Suspense>
              </div>
            </ErrorBoundary>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pool Data */}
              <ErrorBoundary fallback={<CardSkeleton />}>
                <Suspense fallback={<CardSkeleton />}>
                  {isLoading || !poolData ? (
                    <CardSkeleton />
                  ) : (
                    <PoolDataAnalysis poolData={poolData} />
                  )}
                </Suspense>
              </ErrorBoundary>

              {/* Transaction Flow */}
              <ErrorBoundary fallback={<CardSkeleton />}>
                <Suspense fallback={<CardSkeleton />}>
                  {isLoading || transactions.length === 0 ? (
                    <CardSkeleton />
                  ) : (
                    <TransactionFlow transactions={transactions} />
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>

            {/* Holder Analysis */}
            <ErrorBoundary fallback={<CardSkeleton className="h-96" />}>
              <Suspense fallback={<CardSkeleton className="h-96" />}>
                {isLoading || holders.length === 0 ? (
                  <CardSkeleton className="h-96" />
                ) : (
                  <HolderAnalysis holders={holders} />
                )}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;