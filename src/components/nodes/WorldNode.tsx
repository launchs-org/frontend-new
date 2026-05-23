import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';

export const WorldNode = () => (
    <div className="px-5 py-4 shadow-lg rounded-2xl bg-slate-50 border border-slate-200 min-w-[140px] h-[80px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-1">
            <div className="p-2 bg-white text-blue-500 rounded-full shadow-sm border border-slate-100">
                <Globe size={20} />
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">インターネット</div>
        </div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-400 border-2 border-white !opacity-100" />
    </div>
);
