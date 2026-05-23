import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { containerService, extractRoutesFromContainer } from '../services/containerService';
import { 
  Terminal, 
  Globe, 
  GitBranch, 
  RotateCcw,
  ExternalLink,
  Zap,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Loader2,
  FileText,
  Clock,
  X,
  Info,
  Database,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';

interface BuildJob {
  id: string;
  status: string;
  created_at: string;
  finished_at?: string;
  version?: string;
  build_log?: string;
}

interface LogEntry {
  pod_name: string;
  timestamp: string;
  message: string;
}

const ContainerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'builds' | 'build-logs' | 'exec-logs' | 'networking' | 'volumes' | 'env-vars'>('overview');
  const [container, setContainer] = useState<any>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [pods, setPods] = useState<any[]>([]);
  const [buildJobs, setBuildJobs] = useState<BuildJob[]>([]);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [execLogs, setExecLogs] = useState<LogEntry[]>([]);
  const [envVars, setEnvVars] = useState<{key: string, value: string}[]>([]);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [customDomainEnabled, setCustomDomainEnabled] = useState(true);
  const [loadingBuildLogs, setLoadingBuildLogs] = useState(false);
  const [streamingExec, setStreamingExec] = useState(false);
  const [selectedBuildJobId, setSelectedBuildJobId] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<any[]>([]);
  const [newVolume, setNewVolume] = useState({ name: '', size_mb: 128, mount_path: '/data' });
  const [isCreatingVolume, setIsCreatingVolume] = useState(false);
  const buildLogContainerRef = useRef<HTMLDivElement>(null);
  const execLogContainerRef = useRef<HTMLDivElement>(null);
  const buildJobsRef = useRef<BuildJob[]>([]);

  const fetchContainer = async (pid?: string) => {
    const pId = pid ?? projectId;
    if (!pId) return;
    try {
      const res = await containerService.getContainer(pId, id!);
      const data = extractRoutesFromContainer(res.data.data);
      setContainer(data);
      setPods(data.pods ?? []);

      // コンテナ環境変数（配列形式 or JSON文字列形式を両対応）
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
    } catch (err) {
      console.error(err);
    }
  };

  // 初回: プロジェクト一覧からコンテナの project_id を解決する
  const resolveProjectId = async () => {
    try {
      const projListRes = await containerService.getProjects();
      const projects: any[] = projListRes.data.data ?? [];
      for (const p of projects) {
        try {
          const detailRes = await containerService.getContainer(p.id, id!);
          if (detailRes.data.data) {
            setProjectId(p.id);
            const data = extractRoutesFromContainer(detailRes.data.data);
            setContainer(data);
            setPods(data.pods ?? []);
            const rawEnv = data.env_vars;
            if (Array.isArray(rawEnv)) {
              setEnvVars(rawEnv.map((e: any) => ({ key: e.key, value: e.value })));
            } else if (typeof rawEnv === 'string') {
              try {
                const parsed = JSON.parse(rawEnv);
                setEnvVars(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
              } catch { setEnvVars([]); }
            }
            return p.id;
          }
        } catch { /* このプロジェクトには存在しない */ }
      }
    } catch (err) {
      console.error(err);
    }
    return '';
  };

  const handleSaveEnvVars = async () => {
    if (!projectId) return;
    setIsSavingEnv(true);
    try {
      const filtered = envVars.filter(e => e.key.trim());
      await containerService.updateContainerEnvVars(projectId, id!, filtered);
      alert('環境変数を保存しました。再デプロイで反映されます。');
      fetchContainer();
    } catch (err) {
      console.error(err);
      alert('環境変数の保存に失敗しました。');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const fetchBuildJobs = async () => {
    if (!projectId) return;
    try {
      const res = await containerService.getBuildJobs(projectId, id!);
      const jobs = res.data.data ?? [];
      setBuildJobs(jobs);
      buildJobsRef.current = jobs;
      if (!selectedBuildJobId && jobs.length > 0) {
        setSelectedBuildJobId(jobs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVolumes = async () => {
    if (!projectId) return;
    try {
      const res = await containerService.getVolumes(projectId);
      const all: any[] = res.data.data ?? [];
      const mounted = all.filter((v: any) =>
        (v.mounts ?? []).some((m: any) => m.container_id === id)
      );
      setVolumes(mounted.map((v: any) => {
        const mount = v.mounts.find((m: any) => m.container_id === id);
        return { ...v, mount_path: mount?.mount_path ?? '' };
      }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    resolveProjectId();
  }, [id]);

  useEffect(() => {
    let interval: any;
    if (activeTab === 'volumes') {
      fetchVolumes();
      interval = setInterval(fetchVolumes, 5000); // 5秒ごとに更新
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, id]);

  // Poll container status if it's building or deploying
  useEffect(() => {
    let interval: any;
    const isTransitional = ['Building', 'Deploying', 'Redeploying', 'Scaling'].includes(container?.status ?? '');
    
    if (isTransitional) {
      interval = setInterval(() => {
        fetchContainer();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [container?.status]);

  useEffect(() => {
    if (activeTab === 'builds' || activeTab === 'build-logs') {
      fetchBuildJobs();
    }
    if (activeTab === 'volumes') {
      fetchVolumes();
    }
  }, [id, activeTab]);

  // Poll build jobs if any is in progress
  useEffect(() => {
    let interval: any;
    const hasActiveJob = buildJobs.some(j => j.status === 'Queued' || j.status === 'Running');
    
    if (hasActiveJob) {
      interval = setInterval(() => {
        fetchBuildJobs();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [buildJobs, activeTab]);

  useEffect(() => {
    if (!selectedBuildJobId || activeTab !== 'build-logs') return;

    setBuildLogs([]);
    fetchBuildLogs(selectedBuildJobId);

    const interval = setInterval(() => {
      const job = buildJobsRef.current.find(j => j.id === selectedBuildJobId);
      if (job && (job.status === 'Queued' || job.status === 'Running' || job.status === 'Building')) {
        fetchBuildLogs(selectedBuildJobId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedBuildJobId, activeTab]);

  // 実行ログを3秒ごとにポーリング（Running中は継続、それ以外は1回のみ取得）
  useEffect(() => {
    if (activeTab !== 'exec-logs') return;

    fetchExecLogs();

    const isActive = container?.status === 'Running' || container?.status === 'Deploying' || container?.status === 'Redeploying';
    if (!isActive) return;

    const interval = setInterval(fetchExecLogs, 3000);
    return () => clearInterval(interval);
  }, [id, activeTab, container?.status]);

  useEffect(() => {
    if (buildLogContainerRef.current) {
      const el = buildLogContainerRef.current;
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 150;
      if (isAtBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [buildLogs]);

  useEffect(() => {
    if (execLogContainerRef.current) {
      const el = execLogContainerRef.current;
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 150;
      if (isAtBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [execLogs]);


  const fetchBuildLogs = (jobId: string) => {
    if (!projectId) return;
    setLoadingBuildLogs(true);
    containerService.getBuildLogs(projectId, jobId)
      .then(res => {
        const logs: any[] = res.data.data?.logs ?? [];
        setBuildLogs(logs.map((l: any) => l.message).filter(Boolean));
      })
      .catch(err => {
        console.error("Failed to fetch build logs", err);
      })
      .finally(() => {
        setLoadingBuildLogs(false);
      });
  };

  const fetchExecLogs = () => {
    if (!projectId) return;
    setStreamingExec(true);
    containerService.getLogs(projectId, id!)
      .then(res => {
        const logs: any[] = res.data.data?.logs ?? [];
        setExecLogs(logs.map(l => ({
          pod_name: l.pod_name ?? '',
          timestamp: l.timestamp ?? '',
          message: l.message,
        })));
      })
      .catch(err => console.error("Failed to fetch exec logs", err))
      .finally(() => setStreamingExec(false));
  };

  const handleRedeploy = async () => {
    if (!projectId) return;
    if (!confirm('ビルドは行わずに、現在のイメージでデプロイのみをやり直しますか？')) return;
    try {
      await containerService.redeployContainer(projectId, id!);
      alert('再デプロイを開始しました');
      fetchContainer();
    } catch (err) {
      console.error(err);
      alert('再デプロイの開始に失敗しました。');
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    if (!confirm('本当にこのコンテナを削除しますか？関連するリソースもすべて削除されます。')) return;
    try {
      await containerService.deleteContainer(projectId, id!);
      alert('コンテナを削除しました');
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      alert('コンテナの削除に失敗しました。');
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: Zap },
    { id: 'builds', label: 'ビルド履歴', icon: RotateCcw },
    { id: 'build-logs', label: 'ビルドログ', icon: Terminal },
    { id: 'exec-logs', label: '実行ログ', icon: FileText },
    { id: 'networking', label: 'ネットワーキング', icon: Globe },
    { id: 'volumes', label: 'ボリューム', icon: Database },
    { id: 'env-vars', label: '環境変数', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <Link to={`/projects/${container?.project_id}`} className="flex items-center space-x-2 text-sm text-[#5f6368] hover:text-google-blue transition-colors w-fit">
          <ArrowLeft size={16} />
          <span>プロジェクト詳細へ戻る</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-3xl font-normal text-[#202124]">{container?.name}</h2>
              <div className={cn(
                "px-3 py-0.5 rounded-full text-xs font-medium",
                container?.status === 'Running' ? "bg-green-100 text-green-700" : 
                container?.status === 'Building' ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-[#5f6368]"
              )}>
                {container?.status === 'Running' ? '稼働中' : container?.status}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-[#5f6368]">
              <div className="flex items-center space-x-1.5">
                <GitBranch size={16} className="text-gray-400" />
                <span className="font-medium">{container?.branch}</span>
              </div>
              <span>•</span>
              <span className="truncate max-w-xs">{container?.repository_url}</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={handleDelete}
              className="px-4 py-2 border border-[#dadce0] bg-white rounded-md text-sm font-medium text-google-red hover:bg-red-50 flex items-center space-x-2"
            >
              <X size={16} />
              <span>削除</span>
            </button>
            <button 
              onClick={handleRedeploy}
              className="px-4 py-2 border border-[#dadce0] bg-white rounded-md text-sm font-medium text-[#3c4043] hover:bg-gray-50 flex items-center space-x-2"
            >
              <RotateCcw size={16} />
              <span>再デプロイ</span>
            </button>
            <button 
              onClick={handleRedeploy}
              className="px-4 py-2 border border-google-blue bg-blue-50/30 rounded-md text-sm font-medium text-google-blue hover:bg-blue-50 flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>再ビルド</span>
            </button>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <div className="flex border-b border-[#dadce0] -mx-8 px-8 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-4 text-sm font-medium flex items-center space-x-2 transition-all border-b-2 whitespace-nowrap",
              activeTab === tab.id 
                ? "border-google-blue text-google-blue" 
                : "border-transparent text-[#5f6368] hover:text-[#202124] hover:bg-gray-50"
            )}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="google-card p-8 space-y-6">
                <h3 className="text-lg font-medium text-[#202124]">デプロイ構成</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <div className="space-y-1">
                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">イメージソース</p>
                    <p className="text-sm font-medium text-[#202124] break-all">{container?.repository_url}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">ターゲットブランチ</p>
                    <p className="text-sm font-medium text-[#202124]">{container?.branch}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">ディレクトリ</p>
                    <p className="text-sm font-medium text-[#202124] font-mono">{container?.directory}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">レプリカ数</p>
                    <p className="text-sm font-medium text-[#202124]">{container?.replicas} インスタンス</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">最新バージョン</p>
                    <p className="text-sm font-medium text-[#202124] font-mono">{container?.version || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="google-card p-6 space-y-4">
                <h4 className="text-sm font-medium text-[#202124] flex items-center space-x-2">
                  <Activity size={18} className="text-google-blue" />
                  <span>ヘルスステータス</span>
                </h4>
                <div className={cn(
                  "flex items-center space-x-2",
                  container?.status === 'Running' ? "text-google-green" : "text-gray-400"
                )}>
                  {container?.status === 'Running' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  <span className="text-xs font-medium">{container?.status === 'Running' ? '正常に稼働中' : container?.status}</span>
                </div>
              </div>

              {pods.length > 0 && (
                <div className="google-card p-6 space-y-4">
                  <h4 className="text-sm font-medium text-[#202124] flex items-center space-x-2">
                    <Database size={18} className="text-google-blue" />
                    <span>Pod ステータス</span>
                    <span className="text-xs text-[#5f6368] font-normal">({pods.length} pods)</span>
                  </h4>
                  <div className="space-y-2">
                    {pods.map((pod: any) => (
                      <div key={pod.id} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            pod.phase === 'Running' && pod.ready ? "bg-green-500" :
                            pod.phase === 'Pending' ? "bg-yellow-400" :
                            pod.phase === 'Failed' ? "bg-red-500" : "bg-gray-400"
                          )} />
                          <span className="text-xs font-mono text-[#202124] truncate">{pod.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 ml-2">
                          {pod.restarts > 0 && (
                            <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                              再起動 {pod.restarts}回
                            </span>
                          )}
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            pod.phase === 'Running' && pod.ready ? "bg-green-100 text-green-700" :
                            pod.phase === 'Pending' ? "bg-yellow-100 text-yellow-700" :
                            pod.phase === 'Failed' ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-500"
                          )}>
                            {pod.phase === 'Running' && pod.ready ? 'Ready' : pod.phase}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="google-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-[#202124]">コンテナリソース</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5f6368]">CPU 制限</span>
                    <span className="font-medium">{container?.resources?.limits?.cpu || '500m'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5f6368]">メモリ制限</span>
                    <span className="font-medium">{container?.resources?.limits?.memory || '512Mi'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'build-logs' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-blue-50 text-google-blue rounded-xl">
                  <Terminal size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#202124]">ビルド出力ログ</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {(() => {
                      const job = buildJobs.find(j => j.id === selectedBuildJobId);
                      const isActive = job && (job.status === 'Queued' || job.status === 'Running');
                      return (
                        <>
                          <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-yellow-400 animate-pulse" : "bg-gray-300")} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
                            {isActive ? 'ポーリング中' : 'ログ表示中'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">ジョブ選択:</label>
                <select 
                  value={selectedBuildJobId || ''} 
                  onChange={(e) => setSelectedBuildJobId(e.target.value)}
                  className="google-input !py-1.5 !pr-10 text-sm font-mono min-w-[240px]"
                >
                  {buildJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.id.split('-').pop()} ({job.status}) - {new Date(job.created_at).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div 
              ref={buildLogContainerRef}
              className="bg-[#1e1e1e] text-[#d4d4d4] p-6 font-mono text-[13px] leading-relaxed min-h-[600px] rounded-2xl shadow-2xl border border-[#333] max-h-[75vh] overflow-y-auto custom-scrollbar relative"
            >
              <div className="sticky top-0 right-0 flex justify-end pointer-events-none mb-4">
                 <div className="bg-white/5 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white/40 border border-white/10 uppercase tracking-tighter">
                   Console Output
                 </div>
              </div>
              {buildLogs.length === 0 ? (
                <div className="h-[500px] flex flex-col items-center justify-center text-[#9aa0a6] space-y-4">
                  <div className={cn("p-4 bg-white/5 rounded-full", loadingBuildLogs && "animate-pulse")}>
                    <Terminal size={40} className="opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white/60">
                      {loadingBuildLogs ? 'ログを読み込み中...' : 'ログがありません'}
                    </p>
                    <p className="text-xs opacity-50 mt-1">ジョブを選択してログを表示してください。</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {buildLogs.map((line, i) => (
                    <div key={i} className="flex group hover:bg-white/5 px-2 -mx-2 transition-colors">
                      <span className="text-[#858585] w-12 shrink-0 select-none opacity-40 text-right pr-4 italic font-light">{(i+1)}</span>
                      <span className="break-all whitespace-pre-wrap group-hover:text-white transition-colors">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {activeTab === 'exec-logs' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-green-50 text-google-green rounded-xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#202124]">コンテナ実行ログ</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={cn("w-2 h-2 rounded-full", streamingExec ? "bg-yellow-400 animate-pulse" : "bg-gray-300")} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">{streamingExec ? 'ポーリング中 (3秒ごと)' : 'ログ表示中'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div 
              ref={execLogContainerRef}
              className="bg-[#1e1e1e] text-[#d4d4d4] p-6 font-mono text-[13px] leading-relaxed min-h-[600px] rounded-2xl shadow-2xl border border-[#333] max-h-[75vh] overflow-y-auto custom-scrollbar relative"
            >
              <div className="sticky top-0 right-0 flex justify-end pointer-events-none mb-4">
                 <div className="bg-white/5 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white/40 border border-white/10 uppercase tracking-tighter">
                   Runtime Output
                 </div>
              </div>
              {execLogs.length === 0 ? (
                <div className="h-[500px] flex flex-col items-center justify-center text-[#9aa0a6] space-y-4">
                  <div className="p-4 bg-white/5 rounded-full animate-pulse">
                    <Loader2 size={40} className="opacity-20 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white/60">ログを収集中...</p>
                    <p className="text-xs opacity-50 mt-1">コンテナの出力を待機しています。</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {execLogs.map((entry, i) => (
                    <div key={i} className="flex group hover:bg-white/5 px-2 -mx-2 transition-colors">
                      <span className="text-[#858585] w-12 shrink-0 select-none opacity-40 text-right pr-4 italic font-light">{(i+1)}</span>
                      <span className="break-all whitespace-pre-wrap group-hover:text-white transition-colors">{entry.message || ' '}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'builds' && (
          <div className="google-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#dadce0]">
                <tr>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">ジョブ ID</th>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">ステータス</th>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">バージョン</th>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">日時</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0]">
                {buildJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[#5f6368]">ビルド履歴がありません</td>
                  </tr>
                ) : (
                  buildJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-google-blue font-medium">{job.id.slice(0, 12)}...</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          job.status === 'Success' ? "bg-green-100 text-green-700" : 
                          job.status === 'Failed' ? "bg-red-100 text-red-700" :
                          job.status === 'Running' ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-[#5f6368]"
                        )}>{job.status}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#202124]">{job.version || '---'}</td>
                      <td className="px-6 py-4 text-xs text-[#5f6368]">{new Date(job.created_at).toLocaleString('ja-JP')}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedBuildJobId(job.id);
                            setActiveTab('build-logs');
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-google-blue hover:bg-blue-50 rounded transition-all flex items-center space-x-1 ml-auto"
                        >
                          <Terminal size={14} />
                          <span>ログを表示</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'networking' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
            {/* Service Settings */}
            <div className="google-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-google-blue rounded-lg">
                    <Activity size={20} />
                  </div>
                  <h3 className="text-lg font-medium text-[#202124]">内部サービス設定</h3>
                </div>
                <button
                  onClick={async () => {
                    if (!projectId) return;
                    if (container?.service?.is_active && container.service.id) {
                      await containerService.deleteRoute(projectId, id!, container.service.id);
                      setContainer({ ...container, service: null });
                    } else {
                      await containerService.createServiceRoute(projectId, id!, { port: 80, protocol: 'TCP' });
                      fetchContainer();
                    }
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    container?.service?.is_active ? "bg-google-blue" : "bg-gray-200"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    container?.service?.is_active ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              {container?.service?.is_active ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-3 bg-gray-50 rounded border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider">内部 DNS 名</p>
                      <p className="text-sm font-mono text-[#202124] break-all">{container.name}.ns-{projectId}.svc.cluster.local</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider">Port</p>
                      <p className="text-sm font-mono text-[#202124]">{container.service.port}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!projectId) return;
                      if (container.service.id) {
                        await containerService.deleteRoute(projectId, id!, container.service.id);
                      }
                      await containerService.createServiceRoute(projectId, id!, {
                        port: container.service.port ?? 80,
                        protocol: container.service.protocol ?? 'TCP',
                      });
                      fetchContainer();
                      alert('ネットワーク設定を更新しました。');
                    }}
                    className="w-full py-2 bg-google-blue text-white rounded text-sm font-medium hover:shadow-md transition-all"
                  >
                    設定を保存して適用
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <Activity size={48} className="mx-auto text-gray-200" />
                  <p className="text-sm text-[#5f6368]">
                    内部サービスを有効にすると、プロジェクト内の他のコンテナからこのコンテナへ通信できるようになります。
                  </p>
                  <button
                    onClick={async () => {
                      if (!projectId) return;
                      await containerService.createServiceRoute(projectId, id!, { port: 80, protocol: 'TCP' });
                      fetchContainer();
                    }}
                    className="px-6 py-2 bg-google-blue text-white rounded text-sm font-medium hover:shadow-md transition-all"
                  >
                    サービスを有効化
                  </button>
                </div>
              )}
            </div>

            {/* Ingress Settings */}
            <div className="google-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-50 text-google-green rounded-lg">
                    <Globe size={20} />
                  </div>
                  <h3 className="text-lg font-medium text-[#202124]">外部公開 (Ingress)</h3>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  container?.ingress ? "bg-green-100 text-green-700" : "bg-gray-100 text-[#5f6368]"
                )}>
                  {container?.ingress ? '公開中' : '非公開'}
                </div>
              </div>

              <div className="space-y-6">
                {container?.ingress ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">公開URL</label>
                      <div className="flex items-center space-x-2 bg-[#f8f9fa] p-3 rounded-lg border border-[#dadce0] group">
                        <Globe size={16} className="text-[#5f6368]" />
                        <span className="text-sm font-medium text-google-blue flex-1 truncate">{container.ingress.subdomain}</span>
                        <a
                          href={`https://${container.ingress.subdomain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          <ExternalLink size={14} className="text-[#5f6368]" />
                        </a>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">ターゲットポート</label>
                      <div className="p-3 bg-white border border-gray-100 rounded text-sm font-medium text-[#202124]">
                        Port {container.ingress.port}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={async () => {
                          if (!projectId || !container.ingress.id) return;
                          if (!confirm('外部公開を停止しますか？')) return;
                          await containerService.deleteRoute(projectId, id!, container.ingress.id);
                          setContainer({ ...container, ingress: null });
                        }}
                        className="flex-1 py-2 border border-google-red text-google-red rounded text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        公開を停止する
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-[#5f6368] leading-relaxed">
                      外部公開を有効にすると、インターネットからコンテナへアクセス可能なランダムなサブドメインが発行されます。
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">公開する内部ポート</label>
                      <input
                        id="ingress-target-port"
                        type="number"
                        defaultValue={80}
                        className="google-input"
                        placeholder="80"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!projectId) return;
                        const portEl = document.getElementById('ingress-target-port') as HTMLInputElement;
                        await containerService.createIngressRoute(projectId, id!, { port: parseInt(portEl.value) });
                        fetchContainer();
                      }}
                      className="w-full py-2 bg-google-blue text-white rounded text-sm font-medium hover:shadow-md transition-all flex items-center justify-center space-x-2"
                    >
                      <Globe size={16} />
                      <span>外部公開を有効にする</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {activeTab === 'volumes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Volume List */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Database size={20} />
                    </div>
                    <h3 className="text-lg font-medium text-[#202124]">マウント済みボリューム</h3>
                  </div>
                  <span className="text-xs font-medium text-[#5f6368]">{volumes.length} 個のボリューム</span>
                </div>

                <div className="space-y-4">
                  {volumes.length === 0 ? (
                    <div className="p-12 text-center google-card border-dashed border-2 bg-gray-50/50">
                      <Database size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-[#5f6368]">ボリュームが設定されていません</p>
                      <p className="text-xs text-gray-400 mt-1">右側のフォームから新しく作成できます</p>
                    </div>
                  ) : (
                    volumes.map((vol) => (
                      <div key={vol.id} className="google-card p-5 flex items-center justify-between group hover:shadow-md transition-all">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                            <Database size={20} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-[#202124]">{vol.name}</h4>
                              {vol.status === 'Deleting' && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 animate-pulse font-medium">削除中</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{vol.mount_path}</span>
                              <span className="text-[11px] text-gray-400">•</span>
                              <span className="text-[11px] text-gray-500">{vol.size_mb} MB</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          disabled={vol.status === 'Deleting'}
                          onClick={async () => {
                            if (!confirm('ボリュームを削除しますか？保存されているデータは失われます。')) return;
                            try {
                              await containerService.unmountAndDeleteVolume(projectId, id!, vol.id);
                              fetchVolumes();
                            } catch (err) {
                              console.error(err);
                              alert('ボリュームの削除に失敗しました');
                            }
                          }}
                          className={cn(
                            "p-2 transition-colors",
                            vol.status === 'Deleting' ? "text-gray-200 cursor-not-allowed" : "text-gray-300 hover:text-google-red"
                          )}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                {volumes.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start space-x-3">
                    <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 leading-relaxed">
                      <strong>注意:</strong> ボリュームの追加・削除を反映するには、コンテナの再デプロイが必要です。
                    </div>
                  </div>
                )}
              </div>

              {/* Create Volume Form */}
              <div className="w-full md:w-80 space-y-6">
                <div className="google-card p-6 space-y-6">
                  <h3 className="text-sm font-medium text-[#202124] flex items-center space-x-2">
                    <Plus size={16} className="text-google-blue" />
                    <span>新規ボリューム作成</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">名前</label>
                      <input 
                        type="text" 
                        value={newVolume.name}
                        onChange={(e) => setNewVolume({...newVolume, name: e.target.value})}
                        className="google-input !py-2 text-sm" 
                        placeholder="data-storage"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">マウントパス</label>
                      <input 
                        type="text" 
                        value={newVolume.mount_path}
                        onChange={(e) => setNewVolume({...newVolume, mount_path: e.target.value})}
                        className="google-input !py-2 text-sm font-mono" 
                        placeholder="/data"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">サイズ (MB)</label>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="range" 
                          min="128" 
                          max="5120" 
                          step="128"
                          value={newVolume.size_mb}
                          onChange={(e) => setNewVolume({...newVolume, size_mb: parseInt(e.target.value)})}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-google-blue"
                        />
                        <span className="text-xs font-mono w-16 text-right">{newVolume.size_mb}MB</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 italic">最大 5GB まで選択可能</p>
                    </div>

                    <button 
                      disabled={!newVolume.name || !newVolume.mount_path || isCreatingVolume}
                      onClick={async () => {
                        setIsCreatingVolume(true);
                        try {
                          await containerService.createAndMountVolume(projectId, id!, newVolume);
                          setNewVolume({ name: '', size_mb: 128, mount_path: '/data' });
                          fetchVolumes();
                          alert('ボリュームを作成しました。再デプロイ後にマウントされます。');
                        } catch (err) {
                          console.error(err);
                          alert('ボリュームの作成に失敗しました');
                        } finally {
                          setIsCreatingVolume(false);
                        }
                      }}
                      className={cn(
                        "w-full py-2 rounded text-sm font-medium transition-all shadow-sm hover:shadow-md",
                        (!newVolume.name || !newVolume.mount_path || isCreatingVolume)
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-google-blue text-white hover:bg-blue-600"
                      )}
                    >
                      {isCreatingVolume ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>作成中...</span>
                        </div>
                      ) : (
                        "ボリュームを作成"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'env-vars' && (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#202124]">プロジェクト環境変数</h3>
                  <p className="text-sm text-[#5f6368] mt-1">このプロジェクト内のすべてのコンテナで共有される環境変数です。</p>
                </div>
              </div>
              <button 
                onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}
                className="flex items-center space-x-2 px-4 py-2 border border-[#dadce0] bg-white rounded-md text-sm font-medium text-[#3c4043] hover:bg-gray-50 transition-all"
              >
                <Plus size={16} />
                <span>変数を追加</span>
              </button>
            </div>

            <div className="google-card p-8 space-y-6">
              {envVars.length === 0 ? (
                <div className="py-12 text-center space-y-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <ShieldCheck size={48} className="mx-auto text-gray-200" />
                  <p className="text-sm text-[#5f6368]">環境変数が設定されていません。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex items-center space-x-4 animate-in slide-in-from-left-2 duration-200">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={env.key}
                          onChange={(e) => {
                            const newVars = [...envVars];
                            newVars[idx].key = e.target.value;
                            setEnvVars(newVars);
                          }}
                          placeholder="変数名 (例: API_KEY)"
                          className="google-input font-mono text-sm"
                        />
                      </div>
                      <div className="flex-[2]">
                        <input 
                          type="text" 
                          value={env.value}
                          onChange={(e) => {
                            const newVars = [...envVars];
                            newVars[idx].value = e.target.value;
                            setEnvVars(newVars);
                          }}
                          placeholder="値"
                          className="google-input font-mono text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setEnvVars(envVars.filter((_, i) => i !== idx))}
                        className="p-2 text-gray-400 hover:text-google-red transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#5f6368]">
                  <Info size={16} />
                  <span className="text-xs">保存後、変更を反映するには「再ビルド」または「再デプロイ」を実行してください。</span>
                </div>
                <button 
                  onClick={handleSaveEnvVars}
                  disabled={isSavingEnv}
                  className="flex items-center space-x-2 px-8 py-2.5 bg-google-blue text-white rounded-md hover:shadow-lg font-medium transition-all disabled:opacity-50"
                >
                  {isSavingEnv ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{isSavingEnv ? '保存中...' : '変更を保存'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContainerDetail;

