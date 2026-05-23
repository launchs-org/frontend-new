import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', color }) => {
  return (
    <div
      className={`${sizeMap[size]} ${className} border-2 border-gray-200 rounded-full animate-spin`}
      style={{ borderTopColor: color ?? '#1a73e8' }}
      role="status"
      aria-label="読み込み中"
    />
  );
};
