import React from 'react';
import { LogViewer } from './LogViewer';

interface BuildLogsTabProps {
    buildJobs: any[];
    selectedBuildJobId: string | null;
    setSelectedBuildJobId: (id: string) => void;
    buildLogs: string[];
    loadingBuildLogs: boolean;
}

export const BuildLogsTab: React.FC<BuildLogsTabProps> = ({
    buildJobs,
    selectedBuildJobId,
    setSelectedBuildJobId,
    buildLogs,
    loadingBuildLogs,
}) => {
    const selectedJob = buildJobs.find(j => j.id === selectedBuildJobId);
    const isPolling = !!selectedJob && (
        selectedJob.status === 'Queued' || selectedJob.status === 'Running' || selectedJob.status === 'Building'
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-2 border-b bg-gray-50/50 space-y-1">
                <p className="text-[9px] font-bold text-gray-400 ml-1 uppercase">ジョブを選択</p>
                <select
                    value={selectedBuildJobId || ''}
                    onChange={e => setSelectedBuildJobId(e.target.value)}
                    className="w-full p-1.5 text-[10px] font-bold border rounded-lg bg-white"
                >
                    {buildJobs.length === 0
                        ? <option>ジョブがありません</option>
                        : buildJobs.map(job => (
                            <option key={job.id} value={job.id}>
                                Job: {job.id.slice(0, 8)} ({job.status})
                            </option>
                        ))
                    }
                </select>
            </div>

            <div className="flex-1 min-h-0">
                <LogViewer
                    lines={buildLogs}
                    isPolling={isPolling}
                    pollingLabel="ビルド中 (3秒ごと)"
                    emptyMessage={loadingBuildLogs ? '読み込み中...' : 'ログがありません'}
                />
            </div>
        </div>
    );
};
