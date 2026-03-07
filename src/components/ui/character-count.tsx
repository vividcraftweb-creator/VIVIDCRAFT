import React from 'react';
import type { ValidationStatus } from '@/types/profile-editor.types';

interface CharacterCountProps {
  current: number;
  min?: number;
  max?: number;
  ideal?: number;
  showHelper?: boolean;
}

export function CharacterCount({
  current,
  min,
  max,
  ideal,
  showHelper = true
}: CharacterCountProps) {
  const getStatus = (): ValidationStatus => {
    if (min && current < min) return 'error';
    if (ideal && current >= ideal && max && current <= max) return 'ideal';
    if (max && current > max * 0.9) return 'warning';
    return 'normal';
  };

  const status = getStatus();

  const colors = {
    error: 'text-destructive',
    ideal: 'text-chart-2',
    warning: 'text-amber-500',
    normal: 'text-muted-foreground',
  };

  const getMessage = (): string => {
    if (status === 'error' && min) {
      const remaining = min - current;
      return `At least ${remaining} more character${remaining !== 1 ? 's' : ''} needed`;
    }
    if (status === 'ideal') {
      return 'Perfect length!';
    }
    if (status === 'warning' && max) {
      const remaining = max - current;
      return remaining > 0
        ? `${remaining} character${remaining !== 1 ? 's' : ''} remaining`
        : `Exceeds limit by ${Math.abs(remaining)}`;
    }
    return 'Looking good';
  };

  return (
    <div className="flex items-center justify-between text-xs mt-1">
      {showHelper && (
        <span className={colors[status]}>
          {getMessage()}
        </span>
      )}
      <span className={`${colors[status]} ${!showHelper ? 'ml-auto' : ''}`}>
        {current}{max && `/${max}`}
      </span>
    </div>
  );
}
