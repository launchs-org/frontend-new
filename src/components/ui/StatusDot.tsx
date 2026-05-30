import React from 'react';

const variantMap: Record<string, string> = {
  running:   'bg-green-500',
  complete:  'bg-green-500',
  bound:     'bg-green-500',
  Running:   'bg-green-500',
  Succeeded: 'bg-green-500',

  building:  'bg-blue-500 animate-pulse',
  deploying: 'bg-blue-500 animate-pulse',
  applying:  'bg-indigo-500 animate-pulse',
  scaling:   'bg-purple-500 animate-pulse',
  pending:   'bg-yellow-400 animate-pulse',
  Pending:   'bg-yellow-400 animate-pulse',

  failed:    'bg-red-500',
  lost:      'bg-red-500',
  Failed:    'bg-red-500',

  stopped:   'bg-gray-400',
  unknown:   'bg-gray-400',
  Unknown:   'bg-gray-400',

  deleting:  'bg-red-500 animate-pulse',
};

interface StatusDotProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'sm' }) => {
  const cls = variantMap[status] ?? 'bg-gray-400';
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  return <span className={`inline-block rounded-full shrink-0 ${sizeClass} ${cls}`} />;
};
