import React from 'react';
import type { ContainerStatus } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { StatusDot } from '../ui/StatusDot';

interface ContainerStatusBadgeProps {
  status: ContainerStatus;
  showDot?: boolean;
}

export const ContainerStatusBadge: React.FC<ContainerStatusBadgeProps> = ({
  status,
  showDot = false,
}) => {
  if (showDot) {
    return (
      <div className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className="text-xs text-gray-600">{status}</span>
      </div>
    );
  }
  return <Badge status={status} />;
};
