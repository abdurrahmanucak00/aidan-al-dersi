import React from 'react';

export default function ProgressBar({ completed = 0, total = 100, className = '', showLabel = false }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 bg-surface-700 h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 font-medium w-8 text-right">
          {clampedPercentage}%
        </span>
      )}
    </div>
  );
}
