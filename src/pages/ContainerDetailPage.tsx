import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ContainerDetail, ContainerSummary, EnvVar,
  NetworkRoute, Mount, BuildJob, Volume,
} from '../lib/types';
import {
  getContainer, redeployContainer, rebuildContainer, deleteContainer, scaleContainer,
  listContainerEnvVars, upsertContainerEnvVars, deleteContainerEnvVars,
  listPorts,
  listRoutes, createServiceRoute, createIngressRoute, deleteRoute,
  createMount, deleteMount, listBuildJobs,
} from '../services/containers';
import { listVolumes } from '../services/volumes';
import { getBuildJobLogs } from '../services/logs';
import { ContainerStatusBadge } from '../components/containers/ContainerStatusBadge';
import { PodStatusList } from '../components/containers/PodStatusList';
import { EnvVarEditor } from '../components/envvars/EnvVarEditor';
import { LogViewer } from '../components/logs/LogViewer';
import { MetricsChart } from '../components/metrics/MetricsChart';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { TopBar } from '../components/layout/TopBar';
import { toastError, toastSuccess } from '../components/ui/Toast';
import { formatDate, formatRelativeTime } from '../lib/utils';
import type { Project } from '../lib/types';

type Tab = 'overview' | 'logs' | 'metrics' | 'buildjobs' | 'envvars' | 'network' | 'mounts';

interface ContainerDetailPageProps {
  project: Project;
  container: ContainerSummary;
  initialTab?: string;
  onBack: () => void;
  onTabChange?: (tab: string) => void;
}

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

export const ContainerDetailPage: React.FC<ContainerDetailPageProps> = ({
  project, container: initialContainer, initialTab, onBack, onTabChange,
}) => {
  const validTabs: Tab[] = ['overview', 'logs', 'metrics', 'buildjobs', 'envvars', 'network', 'mounts'];
  const resolvedInitialTab = (validTabs.includes(initialTab as Tab) ? initialTab : 'overview') as Tab;
  const [tab, setTabState] = useState<Tab>(resolvedInitialTab);

  const setTab = (t: Tab) => {
    setTabState(t);
    onTabChange?.(t);
  };
  const [detail, setDetail] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeploying, setRedeploying] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleReplicas, setScaleReplicas] = useState('1');
  const [scaling, setScaling] = useState(false);
  const [envVarsEditing, setEnvVarsEditing] = useState(false);

  const [routes, setRoutes] = useState<NetworkRoute[]>([]);
  const [routeCreateOpen, setRouteCreateOpen] = useState(false);
  const [routeType, setRouteType] = useState<'service' | 'ingress'>('service');
  const [serviceRouteForm, setServiceRouteForm] = useState({ port: '', protocol: 'TCP' });
  const [ingressRouteForm, setIngressRouteForm] = useState({ port: '', routeServiceId: '' });
  const [creatingRoute, setCreatingRoute] = useState(false);

  const [mounts, setMounts] = useState<Mount[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [mountCreateOpen, setMountCreateOpen] = useState(false);
  const [mountForm, setMountForm] = useState({ volume_id: '', mount_path: '' });
  const [creatingMount, setCreatingMount] = useState(false);

  const [buildJobs, setBuildJobs] = useState<BuildJob[]>([]);
  const [buildLogJob, setBuildLogJob] = useState<BuildJob | null>(null);
  const [buildLogs, setBuildLogs] = useState<import('../lib/types').LogLine[]>([]);
  const [buildLogsLoading, setBuildLogsLoading] = useState(false);
  const [buildLogSearch, setBuildLogSearch] = useState('');
  const [buildLogAutoScroll, setBuildLogAutoScroll] = useState(true);
  const buildLogScrollRef = useRef<HTMLDivElement>(null);
  const buildLogBottomRef = useRef<HTMLDivElement>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  // ボリューム一覧からこのコンテナのマウントを抽出するヘルパー
  const extractMountsFromVolumes = (vols: Volume[]): Mount[] =>
    vols.flatMap((v) =>
      (v.mounts ?? [])
        .filter((m) => m.container_id === initialContainer.id)
        .map((m) => ({ ...m, volume_name: v.name }))
    );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [det, ev, , rt, bj, vol] = await Promise.allSettled([
        getContainer(project.id, initialContainer.id),
        listContainerEnvVars(project.id, initialContainer.id),
        listPorts(project.id, initialContainer.id),
        listRoutes(project.id, initialContainer.id),
        listBuildJobs(project.id, initialContainer.id),
        listVolumes(project.id),
      ]);
      if (det.status === 'fulfilled') {
        setDetail(det.value);
        setScaleReplicas(String(det.value.replicas));
      }

      console.log('ev:', ev); // これを追加
      if (ev.status === 'fulfilled') setEnvVars(ev.value);
      if (rt.status === 'fulfilled') setRoutes(rt.value);
      if (bj.status === 'fulfilled') setBuildJobs(bj.value);
      if (vol.status === 'fulfilled') {
        setVolumes(vol.value);
        setMounts(extractMountsFromVolumes(vol.value));
      }
    } finally {
      setLoading(false);
    }
  }, [project.id, initialContainer.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // タブごとのポーリング（5秒間隔）
  useEffect(() => {
    const pid = project.id;
    const cid = initialContainer.id;

    const poll = async () => {
      try {
        // コンテナステータスは常に更新
        const updated = await getContainer(pid, cid);
        setDetail(updated);

        if (tab === 'network') {
          const [, rts] = await Promise.all([listPorts(pid, cid), listRoutes(pid, cid)]);
          setRoutes(rts);
        } else if (tab === 'mounts') {
          const vols = await listVolumes(pid);
          setVolumes(vols);
          setMounts(extractMountsFromVolumes(vols));
        } else if (tab === 'envvars') {
          if (!envVarsEditing) {
            const evUpdated = await listContainerEnvVars(pid, cid);
            setEnvVars(evUpdated);
          }
        }
      } catch {
        // silent
      }
    };

    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [tab, project.id, initialContainer.id, envVarsEditing]);

  const handleRedeploy = async () => {
    setRedeploying(true);
    try {
      await redeployContainer(project.id, initialContainer.id);
      toastSuccess('再デプロイを開始しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : '再デプロイに失敗しました');
    } finally {
      setRedeploying(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await rebuildContainer(project.id, initialContainer.id);
      toastSuccess('再ビルドを開始しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : '再ビルドに失敗しました');
    } finally {
      setRebuilding(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteContainer(project.id, initialContainer.id);
      toastSuccess('コンテナを削除しました');
      onBack();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : '削除に失敗しました');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleScale = async () => {
    const replicas = parseInt(scaleReplicas, 10);
    if (isNaN(replicas) || replicas < 0) return;
    setScaling(true);
    try {
      await scaleContainer(project.id, initialContainer.id, { replicas });
      toastSuccess(`${replicas} レプリカにスケールしました`);
      setScaleOpen(false);
      if (detail) setDetail({ ...detail, replicas });
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'スケールに失敗しました');
    } finally {
      setScaling(false);
    }
  };

  const handleSaveEnvVars = async (upsert: { key: string; value: string }[], deleteKeys: string[]) => {
    if (upsert.length > 0) {
      await upsertContainerEnvVars(project.id, initialContainer.id, { env_vars: upsert });
    }
    if (deleteKeys.length > 0) {
      await deleteContainerEnvVars(project.id, initialContainer.id, { keys: deleteKeys });
    }
    const latest = await listContainerEnvVars(project.id, initialContainer.id);
    setEnvVars(latest);
  };

  const handleCreateRoute = async () => {
    setCreatingRoute(true);
    try {
      if (routeType === 'service') {
        const portNum = parseInt(serviceRouteForm.port, 10);
        if (isNaN(portNum)) return;
        await createServiceRoute(project.id, initialContainer.id, { port: portNum, protocol: serviceRouteForm.protocol });
      } else {
        const portNum = parseInt(ingressRouteForm.port, 10);
        if (isNaN(portNum)) return;
        await createIngressRoute(project.id, initialContainer.id, { port: portNum });
      }
      setRouteCreateOpen(false);
      setServiceRouteForm({ port: '', protocol: 'TCP' });
      setIngressRouteForm({ port: '', routeServiceId: '' });
      toastSuccess('ルートを作成しました');
      const updated = await listRoutes(project.id, initialContainer.id);
      setRoutes(updated);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'ルート作成に失敗しました');
    } finally {
      setCreatingRoute(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await deleteRoute(project.id, initialContainer.id, routeId);
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      toastSuccess('ルートを削除しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const handleCreateMount = async () => {
    if (!mountForm.volume_id || !mountForm.mount_path.trim()) return;
    setCreatingMount(true);
    try {
      const m = await createMount(project.id, initialContainer.id, {
        volume_id: mountForm.volume_id,
        mount_path: mountForm.mount_path,
      });
      setMounts((prev) => [...prev, m]);
      setMountCreateOpen(false);
      setMountForm({ volume_id: '', mount_path: '' });
      toastSuccess('ボリュームをマウントしました');
      // マウント後にボリューム一覧を再取得して最新状態に同期
      const vols = await listVolumes(project.id);
      setVolumes(vols);
      setMounts(extractMountsFromVolumes(vols));
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'マウントに失敗しました');
    } finally {
      setCreatingMount(false);
    }
  };

  const handleDeleteMount = async (volumeId: string) => {
    try {
      await deleteMount(project.id, initialContainer.id, volumeId);
      setMounts((prev) => prev.filter((m) => m.volume_id !== volumeId));
      toastSuccess('マウントを解除しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'アンマウントに失敗しました');
    }
  };

  const openBuildLog = useCallback(async (job: BuildJob) => {
    setBuildLogJob(job);
    setBuildLogs([]);
    setBuildLogSearch('');
    setBuildLogAutoScroll(true);
    setBuildLogsLoading(true);
    try {
      const logs = await getBuildJobLogs(project.id, job.id, { limit: '2000' });
      setBuildLogs(logs);
    } catch {
      // silent
    } finally {
      setBuildLogsLoading(false);
    }
  }, [project.id]);

  const refreshBuildLogs = useCallback(async () => {
    if (!buildLogJob) return;
    try {
      const logs = await getBuildJobLogs(project.id, buildLogJob.id, { limit: '2000' });
      setBuildLogs(logs);
    } catch {
      // silent
    }
  }, [project.id, buildLogJob]);

  const refreshBuildJobs = useCallback(async () => {
    try {
      const jobs = await listBuildJobs(project.id, initialContainer.id);
      setBuildJobs(jobs);
      setBuildLogJob((prev) => {
        if (!prev) return prev;
        const updated = jobs.find((j) => j.id === prev.id);
        return updated ?? prev;
      });
    } catch {
      // silent
    }
  }, [project.id, initialContainer.id]);

  useEffect(() => {
    if (tab !== 'buildjobs') return;
    refreshBuildJobs();
    const id = setInterval(refreshBuildJobs, 3000);
    return () => clearInterval(id);
  }, [tab, refreshBuildJobs]);

  useEffect(() => {
    if (tab !== 'buildjobs') return;
    if (!buildLogJob) return;
    refreshBuildLogs();
    const id = setInterval(refreshBuildLogs, 3000);
    return () => clearInterval(id);
  }, [tab, buildLogJob, refreshBuildLogs]);

  useEffect(() => {
    if (buildLogAutoScroll) {
      buildLogBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildLogs, buildLogAutoScroll]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '概要' },
    { key: 'logs', label: 'ログ' },
    { key: 'metrics', label: 'メトリクス' },
    { key: 'buildjobs', label: 'ビルド' },
    { key: 'envvars', label: '環境変数' },
    { key: 'network', label: 'ネットワーク' },
    { key: 'mounts', label: 'マウント' },
  ];

  const container = detail ?? initialContainer;

  return (
    <>
      <TopBar
        breadcrumbs={[
          { label: 'プロジェクト', onClick: () => onBack() },
          { label: project.name, onClick: onBack },
          { label: initialContainer.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setScaleOpen(true)}>
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              スケール
            </Button>
            {detail?.git_repo && (
              <Button variant="primary" size="sm" onClick={handleRebuild} loading={rebuilding}
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
              >
                再ビルド
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleRedeploy} loading={redeploying}
              icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            >
              再デプロイ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(true)}>
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        }
      />

      {/* Container header */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-gray-800">{initialContainer.name}</h1>
              <ContainerStatusBadge status={container.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              更新: {formatRelativeTime(container.updated_at)} &bull;
              レプリカ: {container.ready_replicas}/{container.replicas}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
                ${tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 p-6 min-h-0 ${tab === 'logs' || tab === 'buildjobs' ? 'flex flex-col' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* 概要 */}
            {tab === 'overview' && detail && (
              <div className="space-y-4 max-w-4xl">
                {/* Info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InfoCard label="リソースサイズ" value={detail.resource_size} />
                  <InfoCard label="レプリカ" value={`${detail.ready_replicas} / ${detail.replicas}`} />
                  <InfoCard label="失敗 Pod" value={String(detail.failed_replicas)} />
                </div>

                {/* Git info */}
                {detail.git_repo && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      Git 情報
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">リポジトリ</p>
                        <p className="text-gray-700 font-mono text-xs mt-0.5">{detail.git_repo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">ブランチ</p>
                        <p className="text-gray-700 font-mono text-xs mt-0.5">{detail.git_branch}</p>
                      </div>
                      {detail.git_subdir && (
                        <div>
                          <p className="text-xs text-gray-400">サブディレクトリ</p>
                          <p className="text-gray-700 font-mono text-xs mt-0.5">{detail.git_subdir}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pods */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Pod 一覧</h3>
                  <PodStatusList pods={detail.pods} />
                </div>
              </div>
            )}

            {/* ログ */}
            {tab === 'logs' && (
              <div className="flex-1 flex flex-col" style={{ minHeight: '500px' }}>
                <LogViewer projectId={project.id} containerId={initialContainer.id} pods={container.pods} />
              </div>
            )}

            {/* メトリクス */}
            {tab === 'metrics' && (
              <div>
                <MetricsChart projectId={project.id} containerId={initialContainer.id} />
              </div>
            )}

            {/* ビルドジョブ */}
            {tab === 'buildjobs' && (
              <div className="flex gap-4 flex-1 min-h-0">
                {/* 左: ジョブ一覧 */}
                <div className="w-72 shrink-0 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ビルド履歴 ({buildJobs.length})</p>
                    <span className="flex items-center gap-1 text-[10px] text-green-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      ライブ
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
                    {buildJobs.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-sm">ビルド履歴がありません</div>
                    ) : (
                      buildJobs.map((j) => (
                        <button
                          key={j.id}
                          onClick={() => openBuildLog(j)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all shrink-0 ${buildLogJob?.id === j.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Badge status={j.status} />
                            <span className="text-[10px] text-gray-400 shrink-0">{j.started_at ? formatDate(j.started_at) : formatDate(j.created_at)}</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{j.git_branch || 'unknown'}</p>
                          {j.git_commit && (
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{j.git_commit.slice(0, 7)}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* 右: ログ表示 */}
                <div className="flex-1 min-h-0 bg-gray-900 rounded-xl overflow-hidden flex flex-col">
                  {!buildLogJob ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      ← ビルドジョブを選択してください
                    </div>
                  ) : (
                    <>
                      {/* ツールバー */}
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-800 shrink-0">
                        {/* 検索 */}
                        <div className="flex-1 relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={buildLogSearch}
                            onChange={(e) => setBuildLogSearch(e.target.value)}
                            placeholder="ログを絞り込む..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        {/* 自動スクロールトグル */}
                        <button
                          onClick={() => setBuildLogAutoScroll((v) => !v)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${buildLogAutoScroll ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${buildLogAutoScroll ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                          自動スクロール
                        </button>
                        {/* 件数 */}
                        <span className="text-[11px] text-gray-500 shrink-0">
                          {buildLogs.filter((l) => !buildLogSearch || l.message.toLowerCase().includes(buildLogSearch.toLowerCase())).length} 件
                        </span>
                      </div>

                      {/* ログ本体 */}
                      {buildLogsLoading ? (
                        <div className="flex items-center justify-center flex-1">
                          <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      ) : buildLogs.length === 0 ? (
                        <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
                          ログがありません
                        </div>
                      ) : (
                        <div
                          ref={buildLogScrollRef}
                          onWheel={(e) => { if (e.deltaY < 0) setBuildLogAutoScroll(false); }}
                          className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
                        >
                          {buildLogs
                            .filter((l) => !buildLogSearch || l.message.toLowerCase().includes(buildLogSearch.toLowerCase()))
                            .map((line, idx) => (
                              <div key={idx} className={`flex gap-3 py-0.5 ${line.level === 'ERROR' ? 'text-red-400' : line.level === 'WARN' ? 'text-yellow-400' : 'text-gray-300'}`}>
                                <span className="text-gray-600 shrink-0 select-none tabular-nums">
                                  {new Date(line.timestamp).toLocaleTimeString('ja-JP', { hour12: false })}
                                </span>
                                <span className="whitespace-pre-wrap break-all">{line.message}</span>
                              </div>
                            ))
                          }
                          <div ref={buildLogBottomRef} />
                        </div>
                      )}

                      {/* 最下部へスクロールボタン */}
                      {!buildLogAutoScroll && buildLogs.length > 0 && (
                        <div className="shrink-0 flex justify-center py-2 border-t border-gray-700 bg-gray-800">
                          <button
                            onClick={() => {
                              setBuildLogAutoScroll(true);
                              buildLogBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            最下部へスクロール
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 環境変数 */}
            {tab === 'envvars' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-800">環境変数</h2>
                  <p className="text-xs text-gray-500">このコンテナ専用の環境変数</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <EnvVarEditor
                    envVars={envVars}
                    onSave={handleSaveEnvVars}
                    onEditingChange={setEnvVarsEditing}
                  />
                </div>
              </div>
            )}

            {/* ネットワーク */}
            {tab === 'network' && (
              <div className="space-y-6">
                {/* Service セクション */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Badge status="service" />
                        Service
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">コンテナのポートをクラスタ内に公開します</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => { setRouteType('service'); setRouteCreateOpen(true); }}
                      icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                    >
                      Service を追加
                    </Button>
                  </div>
                  <Table
                    columns={[
                      { key: 'port', header: 'ポート', render: (r) => <span className="font-mono font-semibold text-gray-800">:{r.port}</span> },
                      { key: 'protocol', header: 'プロトコル', render: (r) => <span className="text-gray-600 text-xs font-mono">{r.protocol || '—'}</span> },
                      { key: 'created', header: '作成日', render: (r) => <span className="text-gray-400 text-xs">{formatDate(r.created_at)}</span> },
                      {
                        key: 'actions', header: '',
                        render: (r) => (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRoute(r.id)}>
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        ),
                      },
                    ]}
                    data={routes.filter((r) => r.type === 'service')}
                    keyExtractor={(r) => r.id}
                    emptyMessage="Service がありません"
                  />
                </div>

                {/* Ingress セクション */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Badge status="ingress" />
                        Ingress
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">Service を外部インターネットに公開します</p>
                    </div>
                    <Button variant="primary" size="sm"
                      onClick={() => { setRouteType('ingress'); setRouteCreateOpen(true); }}
                      disabled={routes.filter((r) => r.type === 'service').length === 0}
                      icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                    >
                      Ingress を追加
                    </Button>
                  </div>
                  {routes.filter((r) => r.type === 'service').length === 0 && (
                    <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-100">
                      <p className="text-xs text-yellow-700">Ingress を追加するには先に Service を作成してください</p>
                    </div>
                  )}
                  <Table
                    columns={[
                      { key: 'service', header: '対象 Service', render: (r) => <span className="font-mono text-gray-800">:{r.port}</span> },
                      { key: 'subdomain', header: 'ホスト / サブドメイン', render: (r) => r.subdomain ? <span className="font-mono text-blue-600 text-xs">{r.subdomain}</span> : <span className="text-gray-400 text-xs">—</span> },
                      { key: 'created', header: '作成日', render: (r) => <span className="text-gray-400 text-xs">{formatDate(r.created_at)}</span> },
                      {
                        key: 'actions', header: '',
                        render: (r) => (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRoute(r.id)}>
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        ),
                      },
                    ]}
                    data={routes.filter((r) => r.type === 'ingress')}
                    keyExtractor={(r) => r.id}
                    emptyMessage="Ingress がありません"
                  />
                </div>
              </div>
            )}

            {/* マウント */}
            {tab === 'mounts' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-800">ボリュームマウント</h2>
                    <p className="text-xs text-gray-500">{mounts.length} 件</p>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setMountCreateOpen(true)}
                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                  >
                    ボリュームをマウント
                  </Button>
                </div>
                <Table
                  columns={[
                    { key: 'volume', header: 'ボリューム', render: (m) => <span className="font-mono text-sm text-gray-800">{m.volume_name ?? m.volume_id}</span> },
                    { key: 'path', header: 'マウントパス', render: (m) => <span className="font-mono text-blue-700 text-xs">{m.mount_path}</span> },
                    {
                      key: 'actions', header: '',
                      render: (m) => (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMount(m.volume_id)}>
                          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      ),
                    },
                  ]}
                  data={mounts}
                  keyExtractor={(m) => m.id}
                  emptyMessage="マウントされていません"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* スケールモーダル */}
      <Modal open={scaleOpen} onClose={() => setScaleOpen(false)} title="スケール設定" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScaleOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={handleScale} loading={scaling}>スケール</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={labelCls}>レプリカ数</label>
            <input type="number" value={scaleReplicas}
              onChange={(e) => setScaleReplicas(e.target.value)}
              min={0} max={20} className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1.5">0 にすると停止します。現在: {detail?.replicas ?? '?'} レプリカ</p>
          </div>
        </div>
      </Modal>

      {/* ルート追加モーダル */}
      <Modal
        open={routeCreateOpen}
        onClose={() => setRouteCreateOpen(false)}
        title={routeType === 'service' ? 'Service を追加' : 'Ingress を追加'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRouteCreateOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreateRoute} loading={creatingRoute}
              disabled={routeType === 'service' ? !serviceRouteForm.port : !ingressRouteForm.port}
            >
              作成
            </Button>
          </>
        }
      >
        {routeType === 'service' ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">コンテナのポートをクラスタ内 Service として公開します。</p>
            <div>
              <label className={labelCls}>ポート番号</label>
              <input type="number" value={serviceRouteForm.port}
                onChange={(e) => setServiceRouteForm((r) => ({ ...r, port: e.target.value }))}
                placeholder="8080" className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>プロトコル</label>
              <select value={serviceRouteForm.protocol}
                onChange={(e) => setServiceRouteForm((r) => ({ ...r, protocol: e.target.value }))}
                className={inputCls}
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">既存の Service を選択して外部に公開します。</p>
            <div>
              <label className={labelCls}>対象 Service</label>
              <select value={ingressRouteForm.port}
                onChange={(e) => setIngressRouteForm((r) => ({ ...r, port: e.target.value }))}
                className={inputCls}
              >
                <option key="__empty" value="">Service を選択...</option>
                {routes.filter((r) => r.type === 'service').map((r) => (
                  <option key={r.id} value={String(r.port)}>
                    :{r.port} ({r.protocol || 'tcp'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* マウントモーダル */}
      <Modal open={mountCreateOpen} onClose={() => setMountCreateOpen(false)} title="ボリュームをマウント" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMountCreateOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreateMount} loading={creatingMount}
              disabled={!mountForm.volume_id || !mountForm.mount_path.trim()}
            >
              マウント
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ボリューム</label>
            <select value={mountForm.volume_id}
              onChange={(e) => setMountForm((m) => ({ ...m, volume_id: e.target.value }))}
              className={inputCls}
            >
              <option key="__empty" value="">ボリュームを選択...</option>
              {volumes.map((v) => (
                <option key={v.id} value={v.id}>{v.name || v.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>マウントパス</label>
            <input type="text" value={mountForm.mount_path}
              onChange={(e) => setMountForm((m) => ({ ...m, mount_path: e.target.value }))}
              placeholder="/data" className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      </Modal>

      {/* 削除確認 */}
      <ConfirmModal
        open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="コンテナを削除"
        message={`"${initialContainer.name}" を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する" loading={deleting}
      />
    </>
  );
};

interface InfoCardProps { label: string; value: string; }
const InfoCard: React.FC<InfoCardProps> = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-800 mt-1">{value}</p>
  </div>
);
