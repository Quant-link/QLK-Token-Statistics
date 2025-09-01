import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Loading...',
  fullScreen = false,
  overlay = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50'
    : 'flex items-center justify-center py-12';

  const overlayClasses = overlay
    ? 'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10'
    : containerClasses;

  return (
    <div className={overlay ? overlayClasses : containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className={`animate-spin ${sizeClasses[size]}`}
          style={{ color: '#4DACE1' }}
        />
        {message && (
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

// Skeleton loading component for better UX
export const SkeletonLoader: React.FC<{
  lines?: number;
  height?: string;
  className?: string;
}> = ({ lines = 3, height = 'h-4', className = '' }) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded ${height} ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Card skeleton for consistent loading states
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white border border-black rounded-lg p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <div className="mt-6 h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};