import React from 'react';

type MonoNumProps = {
  value: number;
  currency?: string;
  unit?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  className?: string;
};

export function MonoNum({
  value,
  currency,
  unit,
  maximumFractionDigits = 0,
  minimumFractionDigits = 0,
  className = '',
}: MonoNumProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: currency ? 'currency' : 'decimal',
    currency,
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value);

  return (
    <span
      className={`font-mono tracking-[0.02em] tabular-nums ${className}`.trim()}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatted}
      {unit ? ` ${unit}` : ''}
    </span>
  );
}
