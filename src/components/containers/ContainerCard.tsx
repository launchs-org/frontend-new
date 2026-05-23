import React from 'react';
import type { ContainerSummary } from '../../lib/types';
import { ContainerStatusBadge } from './ContainerStatusBadge';
import { formatRelativeTime } from '../../lib/utils';

interface ContainerCardProps {
  container: ContainerSummary;
  onClick: () => void;
}

const resourceLabel: Record<string, { label: string; color: string; bg: string }> = {
  small:  { label: 'Small',  color: 'text-green-700',  bg: 'bg-green-50 ring-1 ring-green-200' },
  medium: { label: 'Medium', color: 'text-orange-700', bg: 'bg-orange-50 ring-1 ring-orange-200' },
  large:  { label: 'Large',  color: 'text-red-700',    bg: 'bg-red-50 ring-1 ring-red-200' },
};

export const ContainerCard: React.FC<ContainerCardProps> = ({ container, onClick }) => {
  const readyRatio = container.replicas > 0
    ? container.ready_replicas / container.replicas
    : 0;
  const res = resourceLabel[container.resource_size] ?? { label: container.resource_size, color: 'text-gray-600', bg: 'bg-gray-100' };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-800 truncate">{container.name}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            更新: {formatRelativeTime(container.updated_at)}
          </p>
        </div>
        <ContainerStatusBadge status={container.status} />
      </div>

      {/* Replicas */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-500">レプリカ</span>
          <span className="text-[11px] font-medium text-gray-600">
            {container.ready_replicas}/{container.replicas}
            {container.failed_replicas > 0 && (
              <span className="text-red-500 ml-1">({container.failed_replicas} 失敗)</span>
            )}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${readyRatio * 100}%`,
              background: readyRatio === 1 ? '#22c55e' : readyRatio > 0 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${res.bg} ${res.color}`}>
          {res.label}
        </span>
        <span className="text-[11px] text-gray-400">
          {(container.pods ?? []).length} Pod
        </span>
      </div>
    </div>
  );
};
