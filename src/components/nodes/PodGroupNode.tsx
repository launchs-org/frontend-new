import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '../../lib/utils';
import { STATUS_STYLES } from '../treeUtils';

interface Props {
    data: {
        name: string;
        status?: string;
        replicas: number;
        isSelected?: boolean;
    };
}

export const PodGroupNode: React.FC<Props> = ({ data }) => {
    const isRunning = data.status === 'Running';
    const isTransitional = ['Building', 'Deploying', 'Redeploying', 'Queued', 'Pending', 'Scaling'].includes(data.status || '');
    const statusInfo = STATUS_STYLES[data.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.Unknown;

    return (
        <div
            className={cn(
                'w-full h-full rounded-2xl border-2 border-dashed',
                data.isSelected
                    ? 'border-blue-400 bg-blue-50/30'
                    : isRunning
                    ? 'border-green-200 bg-green-50/20'
                    : isTransitional
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-gray-200 bg-gray-50/30'
            )}
        >
            <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-gray-300 border-2 border-white opacity-100!" />
            <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-gray-300 border-2 border-white opacity-100!" />

            {/* Label bar at top */}
            <div className="absolute -top-6 left-0 flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 truncate max-w-[180px]">{data.name}</span>
                <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                    isRunning ? 'bg-green-100 text-green-700'
                    : isTransitional ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                )}>
                    {statusInfo.label}
                </span>
                <span className="text-[9px] text-gray-400 font-mono">{data.replicas} pods</span>
            </div>
        </div>
    );
};
