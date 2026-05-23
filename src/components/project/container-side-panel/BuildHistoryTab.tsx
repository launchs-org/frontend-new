import React from 'react';
import { Terminal } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BuildHistoryTabProps {
    buildJobs: any[];
    onSelectJob: (jobId: string) => void;
}

export const BuildHistoryTab: React.FC<BuildHistoryTabProps> = ({ buildJobs, onSelectJob }) => {
    return (
        <div className="p-4 space-y-3">
            {buildJobs.map(job => (
                <div key={job.id} className="p-3 border rounded-xl bg-white shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                job.status === 'Success' ? 'bg-green-500' : 'bg-yellow-500'
                            )} />
                            <p className="text-[11px] font-bold">{job.id.slice(0, 8)}</p>
                        </div>
                        <p className="text-[12px] text-gray-400">{new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    <button
                        onClick={() => onSelectJob(job.id)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                        <Terminal size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
