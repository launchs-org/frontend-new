import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { RefreshCw, Database, Folder, GitBranch, ChevronRight, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STATUS_STYLES } from '../treeUtils';

interface Props {
    data: {
        id: string;
        name: string;
        status?: string;
        repo?: string;
        branch?: string;
        version?: string;
        replicas?: number;
        container_type?: string;
        template_name?: string;
        image_id?: string;
        podIndex?: number;
        isInGroup?: boolean;
        isSelected?: boolean;
        onSelect?: (id: string) => void;
    };
}

const TEMPLATE_ICON_MAP: Record<string, React.ElementType> = {
    mysql:      Database,
    postgresql: Database,
    redis:      Zap,
};

const TEMPLATE_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    mysql:      { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    postgresql: { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100'   },
    redis:      { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100'     },
};

export const ContainerNode: React.FC<Props> = ({ data }) => {
    const isDatabase = data.container_type === 'database';
    const isRunning = data.status === 'Running';
    const isTransitional = ['Building', 'Deploying', 'Redeploying', 'Queued', 'Pending', 'Scaling'].includes(data.status || '');
    const isSelected = data.isSelected;
    const statusInfo = STATUS_STYLES[data.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.Unknown;
    const isInGroup = data.isInGroup === true;

    const templateKey = data.template_name ?? '';
    const NodeIcon = isDatabase ? (TEMPLATE_ICON_MAP[templateKey] ?? Database) : Database;
    const templateColors = isDatabase ? (TEMPLATE_COLOR_MAP[templateKey] ?? TEMPLATE_COLOR_MAP.mysql) : null;

    const iconBgClass = isDatabase
        ? `${templateColors!.bg} ${templateColors!.text}`
        : isRunning
        ? 'bg-green-50 text-green-600'
        : isTransitional
        ? 'bg-blue-50 text-blue-600'
        : 'bg-gray-50 text-gray-400';

    const borderClass = isSelected
        ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-xl'
        : isDatabase
        ? templateColors!.border
        : isRunning
        ? 'border-green-100'
        : isTransitional
        ? 'border-blue-100'
        : 'border-gray-100';

    return (
        <div
            className={cn(
                'px-4 py-4 rounded-xl bg-white border-2 transition-all w-[260px] h-40 flex flex-col justify-between',
                isInGroup
                    ? 'shadow-sm hover:shadow-md cursor-pointer'
                    : 'shadow-md hover:shadow-2xl cursor-pointer',
                borderClass,
            )}
            onClick={() => data.onSelect?.(data.id)}
        >
            {!isInGroup && (
                <>
                    <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-gray-300 border-2 border-white opacity-100!" />
                    <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-gray-300 border-2 border-white opacity-100!" />
                </>
            )}

            <div className="flex justify-between items-start shrink-0">
                <div className={cn('p-2 rounded-lg', iconBgClass)}>
                    <NodeIcon size={20} />
                </div>
                <div className={cn(
                    'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    isRunning ? 'bg-green-100 text-green-700'
                    : isTransitional ? 'bg-blue-100 text-blue-700 animate-pulse'
                    : 'bg-gray-100 text-gray-500'
                )}>
                    {isTransitional && <RefreshCw size={10} className="animate-spin" />}
                    <span>{statusInfo.label}</span>
                </div>
            </div>

            <div className="space-y-1 my-2">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-900 truncate">{data.name}</div>
                    {isInGroup && data.podIndex !== undefined && (
                        <div className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                            pod-{data.podIndex + 1}
                        </div>
                    )}
                    {!isInGroup && (
                        <div className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0',
                            isDatabase
                                ? `${templateColors!.bg} ${templateColors!.text}`
                                : 'bg-slate-100 text-slate-600'
                        )}>
                            {isDatabase ? templateKey.toUpperCase() : `${data.replicas || 1} pods`}
                        </div>
                    )}
                </div>
                <div className="flex items-center text-[10px] text-gray-400 font-mono bg-gray-50 p-1 rounded">
                    {isDatabase ? (
                        <>
                            <Database size={10} className="mr-1 shrink-0" />
                            <span className="truncate">{data.image_id || 'Template deployment'}</span>
                        </>
                    ) : (
                        <>
                            <Folder size={10} className="mr-1 shrink-0" />
                            <span className="truncate">{data.repo}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[10px] shrink-0">
                <div className="flex items-center space-x-3 text-gray-500">
                    {isDatabase ? (
                        <div className="flex items-center space-x-1">
                            <NodeIcon size={12} />
                            <span className="font-medium">{data.version || templateKey}</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1">
                            <GitBranch size={12} />
                            <span className="font-medium">{data.branch || 'main'}</span>
                        </div>
                    )}
                </div>
                <ChevronRight size={14} className={cn('transition-transform', isSelected ? 'rotate-90 text-blue-500' : 'text-gray-300')} />
            </div>
        </div>
    );
};
