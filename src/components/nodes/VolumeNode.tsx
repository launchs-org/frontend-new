import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { HardDrive } from 'lucide-react';

interface Props {
    data: { name?: string; mountPath?: string; size?: number };
}

export const VolumeNode: React.FC<Props> = ({ data }) => (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-orange-100 min-w-[200px] h-[80px] flex items-center">
        <div className="flex items-center space-x-3 w-full">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg shadow-sm shrink-0">
                <HardDrive size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div className="text-[9px] uppercase tracking-wider text-orange-400 font-bold truncate">{data.name || 'Volume'}</div>
                    <div className="text-[9px] bg-orange-100 text-orange-700 px-1 rounded font-mono shrink-0">{data.size || 0}MB</div>
                </div>
                <div className="text-[10px] font-mono text-gray-600 truncate mt-1 bg-gray-50 p-1 rounded border border-gray-100">
                    {data.mountPath || '/data'}
                </div>
            </div>
        </div>
        <Handle type="target" position={Position.Left} className="w-2 h-2 bg-orange-400 border-2 border-white !opacity-100" />
    </div>
);
