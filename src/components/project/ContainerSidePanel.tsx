import React, { useState, useEffect, useRef } from 'react';
import {
    X, Loader2, RotateCcw, RotateCw, Zap, Terminal,
    FileText, Globe, Database, ShieldCheck, Clock, Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { containerService, extractRoutesFromContainer } from '../../services/containerService';
import { api } from '../../lib/api';

// Tab Components
import { OverviewTab } from './container-side-panel/OverviewTab';
import { BuildHistoryTab } from './container-side-panel/BuildHistoryTab';
import { BuildLogsTab } from './container-side-panel/BuildLogsTab';
import { ExecLogsTab } from './container-side-panel/ExecLogsTab';
import { NetworkingTab } from './container-side-panel/NetworkingTab';
import { VolumesTab } from './container-side-panel/VolumesTab';
import { EnvVarsTab } from './container-side-panel/EnvVarsTab';
import { DeleteTab } from './container-side-panel/DeleteTab';

interface ContainerSidePanelProps {
    containerId: string;
    containerData?: any;
    onClose: () => void;
    initialTab?: SidebarTab;
}

type SidebarTab = 'overview' | 'builds' | 'build-logs' | 'exec-logs' | 'networking' | 'volumes' | 'env-vars' | 'delete';

export const ContainerSidePanel: React.FC<ContainerSidePanelProps> = ({ containerId, containerData, onClose, initialTab }) => {
    const [activeTab, setActiveTab] = useState<SidebarTab>(initialTab || 'overview');

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    const [container, setContainer] = useState<any>(
        containerData ? extractRoutesFromContainer(containerData) : null
    );
    const [pods, setPods] = useState<any[]>([]);
    const [buildJobs, setBuildJobs] = useState<any[]>([]);
    const [buildLogs, setBuildLogs] = useState<string[]>([]);
    const [execLogs, setExecLogs] = useState<any[]>([]);
    const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
    const [isSavingEnv, setIsSavingEnv] = useState(false);
    const [customDomain, setCustomDomain] = useState('');
    const [customDomainEnabled, setCustomDomainEnabled] = useState(true);
    const [selectedBuildJobId, setSelectedBuildJobId] = useState<string | null>(null);
    const [volumes, setVolumes] = useState<any[]>([]);

    const [loadingBuildLogs, setLoadingBuildLogs] = useState(false);
    const [execLogConnected, setExecLogConnected] = useState(false);
    const buildJobsRef = useRef<any[]>([]);

    const projectId: string = container?.project_id ?? containerData?.project_id ?? '';

    const fetchData = async () => {
        if (!projectId) return;
        try {
            const res = await containerService.getContainer(projectId, containerId);
            const raw = res.data.data;
            const data = extractRoutesFromContainer(raw);

            setContainer(data);
            setPods(data.pods ?? []);

            if (data.ingress) {
                setCustomDomain('');
                setCustomDomainEnabled(true);
            }

            // env_vars: 配列形式（新仕様）またはJSON文字列形式（旧仕様）を両対応
            const rawEnv = data.env_vars;
            if (Array.isArray(rawEnv)) {
                setEnvVars(rawEnv.map((e: any) => ({ key: e.key, value: e.value })));
            } else if (typeof rawEnv === 'string') {
                try {
                    const parsed = JSON.parse(rawEnv);
                    setEnvVars(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
                } catch { setEnvVars([]); }
            } else {
                setEnvVars([]);
            }
        } catch (err) { console.error(err); }
    };

    const fetchBuildJobs = async () => {
        if (!projectId) return;
        try {
            const res = await containerService.getBuildJobs(projectId, containerId);
            const jobs = res.data.data ?? [];
            setBuildJobs(jobs);
            buildJobsRef.current = jobs;
            if (!selectedBuildJobId && jobs.length > 0) setSelectedBuildJobId(jobs[0].id);
        } catch (err) { console.error(err); }
    };

    const fetchVolumes = async () => {
        if (!projectId) return;
        try {
            const res = await containerService.getVolumes(projectId);
            // コンテナにマウントされているボリュームのみ表示
            const all: any[] = res.data.data ?? [];
            const mounted = all.filter((v: any) =>
                (v.mounts ?? []).some((m: any) => m.container_id === containerId)
            );
            setVolumes(mounted.map((v: any) => {
                const mount = v.mounts.find((m: any) => m.container_id === containerId);
                return { ...v, mount_path: mount?.mount_path ?? '' };
            }));
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, [containerId]);

    useEffect(() => {
        if (!containerData) return;
        setContainer(extractRoutesFromContainer(containerData));
        setPods(containerData.pods ?? []);
    }, [containerData]);

    useEffect(() => {
        if (activeTab === 'builds' || activeTab === 'build-logs') {
            fetchBuildJobs();
            const interval = setInterval(fetchBuildJobs, 5000);
            return () => clearInterval(interval);
        }
    }, [containerId, activeTab]);

    useEffect(() => {
        if (activeTab === 'volumes') fetchVolumes();
    }, [containerId, activeTab]);

    const fetchBuildLogs = (jobId: string) => {
        if (!projectId) return;
        setLoadingBuildLogs(true);
        containerService.getBuildLogs(projectId, jobId)
            .then(res => {
                const logs: any[] = res.data.data?.logs ?? [];
                setBuildLogs(logs.map((l: any) => l.message).filter(Boolean));
            })
            .catch(err => console.error('Failed to fetch build logs', err))
            .finally(() => setLoadingBuildLogs(false));
    };

    useEffect(() => {
        if (!selectedBuildJobId || activeTab !== 'build-logs') return;

        setBuildLogs([]);
        fetchBuildLogs(selectedBuildJobId);

        const interval = setInterval(() => {
            const job = buildJobsRef.current.find(j => j.id === selectedBuildJobId);
            if (job && (job.status === 'pending' || job.status === 'running')) {
                fetchBuildLogs(selectedBuildJobId);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [selectedBuildJobId, activeTab]);

    useEffect(() => {
        if (activeTab !== 'exec-logs' || !projectId) return;

        const fetchExecLogs = () => {
            setExecLogConnected(true);
            containerService.getLogs(projectId, containerId)
                .then(res => {
                    const logs: any[] = res.data.data?.logs ?? [];
                    setExecLogs(logs.map(l => ({ pod_name: l.pod_name ?? '', timestamp: l.timestamp ?? '', message: l.message })));
                })
                .catch(err => console.error('Failed to fetch exec logs', err))
                .finally(() => setExecLogConnected(false));
        };

        fetchExecLogs();

        const isActive = container?.status === 'running' || container?.status === 'deploying';
        if (!isActive) return;

        const interval = setInterval(fetchExecLogs, 3000);
        return () => clearInterval(interval);
    }, [containerId, activeTab, container?.status]);

    const handleSaveEnvVars = async () => {
        if (!projectId) return;
        setIsSavingEnv(true);
        try {
            const filtered = envVars.filter(e => e.key.trim());
            await containerService.updateContainerEnvVars(projectId, containerId, filtered);
            fetchData();
        } catch (err) { alert('保存に失敗しました。'); }
        finally { setIsSavingEnv(false); }
    };

    const tabs: { id: SidebarTab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: '概要', icon: Zap },
        { id: 'builds', label: '履歴', icon: Clock },
        { id: 'build-logs', label: 'ビルド', icon: Terminal },
        { id: 'exec-logs', label: '実行', icon: FileText },
        { id: 'networking', label: 'ネット', icon: Globe },
        { id: 'volumes', label: 'Vol', icon: Database },
        { id: 'env-vars', label: 'ENV', icon: ShieldCheck },
        { id: 'delete', label: '削除', icon: Trash2 },
    ];

    const isDatabase = container?.container_type === 'database';

    if (!container) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    const visibleTabs = tabs.filter(tab => {
        if (isDatabase && (tab.id === 'builds' || tab.id === 'build-logs')) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-white text-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b bg-gray-50/50">
                <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold truncate">{container.name}</h2>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{container.id}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded transition-colors"><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="flex gap-2">
                    {isDatabase ? (
                        <>
                            {container.status === 'stopped' && (
                                <button onClick={() => confirm('起動しますか？') && containerService.scaleContainer(projectId, containerId, 1).then(fetchData)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 shadow-sm transition-all"><RotateCw size={12} /><span>起動</span></button>
                            )}
                            {container.status === 'running' && (
                                <button onClick={() => confirm('停止しますか？') && containerService.scaleContainer(projectId, containerId, 0).then(fetchData)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all"><RotateCcw size={12} /><span>停止</span></button>
                            )}
                            <button onClick={() => confirm('再デプロイしますか？') && containerService.redeployContainer(projectId, containerId).then(fetchData)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all"><RotateCcw size={12} /><span>再デプロイ</span></button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => confirm('再デプロイしますか？') && containerService.redeployContainer(projectId, containerId).then(fetchData)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all"><RotateCcw size={12} /><span>再デプロイ</span></button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex overflow-x-auto scrollbar-hide border-b bg-white">
                {visibleTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 text-[12px] font-bold transition-all whitespace-nowrap border-b-2 min-w-[56px]",
                        activeTab === tab.id
                            ? (tab.id === 'delete' ? "border-red-500 text-red-600 bg-red-50/30" : "border-blue-500 text-blue-600 bg-blue-50/30")
                            : "border-transparent text-gray-400 hover:text-gray-600"
                    )}>
                        <tab.icon size={14} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' && <OverviewTab container={container} pods={pods} onScaled={fetchData} />}

                {activeTab === 'networking' && (
                    <NetworkingTab
                        projectId={projectId}
                        containerId={containerId}
                        container={container}
                        setContainer={setContainer}
                        customDomain={customDomain}
                        setCustomDomain={setCustomDomain}
                        customDomainEnabled={customDomainEnabled}
                        setCustomDomainEnabled={setCustomDomainEnabled}
                        fetchData={fetchData}
                    />
                )}

                {activeTab === 'volumes' && (
                    <VolumesTab
                        projectId={projectId}
                        containerId={containerId}
                        volumes={volumes}
                        fetchVolumes={fetchVolumes}
                    />
                )}

                {activeTab === 'env-vars' && (
                    <EnvVarsTab
                        envVars={envVars}
                        setEnvVars={setEnvVars}
                        handleSaveEnvVars={handleSaveEnvVars}
                        isSavingEnv={isSavingEnv}
                    />
                )}

                {activeTab === 'build-logs' && (
                    <BuildLogsTab
                        buildJobs={buildJobs}
                        selectedBuildJobId={selectedBuildJobId}
                        setSelectedBuildJobId={setSelectedBuildJobId}
                        buildLogs={buildLogs}
                        loadingBuildLogs={loadingBuildLogs}
                    />
                )}

                {activeTab === 'exec-logs' && (
                    <ExecLogsTab
                        execLogs={execLogs}
                        connected={execLogConnected}
                    />
                )}

                {activeTab === 'builds' && (
                    <BuildHistoryTab
                        buildJobs={buildJobs}
                        onSelectJob={(jobId) => {
                            setSelectedBuildJobId(jobId);
                            setActiveTab('build-logs');
                        }}
                    />
                )}

                {activeTab === 'delete' && (
                    <DeleteTab
                        projectId={projectId}
                        containerId={containerId}
                        containerName={container.name}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    );
};
