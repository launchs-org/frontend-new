import React from 'react';
import type { ContainerStatus, BuildJobStatus, VolumeStatus, PodStatusValue } from '../../lib/types';

type StatusVariant = ContainerStatus | BuildJobStatus | VolumeStatus | PodStatusValue | string;

const variantStyles: Record<string, string> = {
  running:   'bg-green-100 text-green-800 ring-1 ring-green-200',
  complete:  'bg-green-100 text-green-800 ring-1 ring-green-200',
  bound:     'bg-green-100 text-green-800 ring-1 ring-green-200',
  Running:   'bg-green-100 text-green-800 ring-1 ring-green-200',
  Succeeded: 'bg-green-100 text-green-800 ring-1 ring-green-200',

  pending:   'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
  building:  'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  deploying: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  scaling:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  Pending:   'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',

  failed:    'bg-red-100 text-red-800 ring-1 ring-red-200',
  lost:      'bg-red-100 text-red-800 ring-1 ring-red-200',
  Failed:    'bg-red-100 text-red-800 ring-1 ring-red-200',

  stopped:   'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  unknown:   'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  Unknown:   'bg-gray-100 text-gray-600 ring-1 ring-gray-200',

  service:   'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  ingress:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',

  TCP:       'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200',
  UDP:       'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200',
};

const labelMap: Record<string, string> = {
  running:   '稼働中',
  complete:  '完了',
  bound:     'バインド済',
  Running:   '実行中',
  Succeeded: '成功',
  pending:   '待機中',
  building:  'ビルド中',
  deploying: 'デプロイ中',
  scaling:   'スケール中',
  Pending:   '待機中',
  failed:    '失敗',
  lost:      '消失',
  Failed:    '失敗',
  stopped:   '停止',
  unknown:   '不明',
  Unknown:   '不明',
  service:   'Service',
  ingress:   'Ingress',
};

interface BadgeProps {
  status: StatusVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const style = variantStyles[status] ?? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
  const label = labelMap[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}>
      {label}
    </span>
  );
};
