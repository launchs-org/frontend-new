import React from 'react';
import { LogViewer } from './LogViewer';

interface ExecLogsTabProps {
    execLogs: any[];
    connected: boolean;
}

export const ExecLogsTab: React.FC<ExecLogsTabProps> = ({ execLogs, connected }) => {
    const lines = execLogs.map(l => l.message as string);

    return (
        <div className="h-full">
            <LogViewer
                lines={lines}
                isPolling={connected}
                pollingLabel="取得中 (3秒ごと)"
                emptyMessage="ログを待機中..."
            />
        </div>
    );
};
