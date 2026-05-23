import { Handle, Position } from '@xyflow/react';
import { ShieldCheck } from 'lucide-react';

export const CloudflareTunnelNode = () => (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-orange-100 min-w-[150px] h-[80px] flex items-center">
        <div className="flex items-center space-x-3 w-full">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                <ShieldCheck size={18} />
            </div>
            <div className="flex-1">
                <div className="text-[9px] uppercase tracking-wider text-orange-400 font-bold">Security</div>
                <div className="text-[10px] font-bold text-gray-700">Cloudflare Tunnel</div>
            </div>
        </div>
        <Handle type="target" position={Position.Left}  className="w-2 h-2 bg-orange-400 border-2 border-white !opacity-100" />
        <Handle type="source" position={Position.Right} className="w-2 h-2 bg-orange-400 border-2 border-white !opacity-100" />
    </div>
);
