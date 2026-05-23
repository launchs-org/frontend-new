import React from 'react';
import type { PodStatus } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { formatRelativeTime } from '../../lib/utils';

interface PodStatusListProps {
  pods: PodStatus[];
}

export const PodStatusList: React.FC<PodStatusListProps> = ({ pods }) => {
  if (pods.length === 0) {
    return <p className="text-sm text-gray-400 py-3">Pod なし</p>;
  }

  return (
    <div className="space-y-2">
      {pods.map((pod) => (
        <div
          key={pod.pod_name}
          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-gray-700 truncate">{pod.pod_name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {pod.node_name} &bull; 再起動: {pod.restart_count}回 &bull; 起動 {formatRelativeTime(pod.started_at)}
            </p>
          </div>
          <div className="ml-3 flex items-center gap-2 shrink-0">
            {pod.ready ? (
              <span className="text-[10px] text-green-600 font-medium">Ready</span>
            ) : (
              <span className="text-[10px] text-yellow-600 font-medium">Not Ready</span>
            )}
            <Badge status={pod.status} />
          </div>
        </div>
      ))}
    </div>
  );
};
