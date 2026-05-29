import React, { useEffect, useState, useCallback } from 'react';
import type {
  Project, ContainerSummary, Volume, EnvVar, Job, Snapshot, BuildJob,
  TemplateSummary, TemplateDetail,
} from '../lib/types';
import { listTemplates, getTemplate } from '../services/templates';
import { getAppConfig } from '../services/config';
import type { AppConfig } from '../services/config';
import {
  deleteProject, listProjectEnvVars, upsertProjectEnvVars,
  deleteProjectEnvVars, listJobs, listSnapshots, restoreSnapshot,
} from '../services/projects';
import { listContainers, createContainerFromGitHub, createContainerFromImage, createContainerFromTemplate, listBuildJobs, cancelBuildJob } from '../services/containers';
import { listVolumes, createVolume, deleteVolume } from '../services/volumes';
import { listBranches, listDirectories, parseRepo } from '../services/github';
import { ContainerCard } from '../components/containers/ContainerCard';
import { EnvVarEditor } from '../components/envvars/EnvVarEditor';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { TopBar } from '../components/layout/TopBar';
import { toastError, toastSuccess } from '../components/ui/Toast';
import { formatDate, formatBytes, formatRelativeTime } from '../lib/utils';

type Tab = 'containers' | 'volumes' | 'envvars' | 'jobs' | 'snapshots';

interface ProjectDetailPageProps {
  project: Project;
  initialTab?: string;
  onBack: () => void;
  onSelectContainer: (container: ContainerSummary) => void;
  onTabChange?: (tab: string) => void;
}

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  project, initialTab, onBack, onSelectContainer, onTabChange,
}) => {
  const validTabs: Tab[] = ['containers', 'volumes', 'envvars', 'jobs', 'snapshots'];
  const resolvedInitialTab = (validTabs.includes(initialTab as Tab) ? initialTab : 'containers') as Tab;
  const [tab, setTabState] = useState<Tab>(resolvedInitialTab);

  const setTab = (t: Tab) => {
    setTabState(t);
    onTabChange?.(t);
  };
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [buildJobs, setBuildJobs] = useState<BuildJob[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // コンテナ作成モーダル
  const [createMode, setCreateMode] = useState<'github' | 'image' | 'template' | null>(null);
  const [githubForm, setGithubForm] = useState({ name: '', git_repo: '', git_branch: 'main', git_subdir: '' });
  const [imageForm, setImageForm] = useState({ name: '', image: '', resource_size: 'small', replicas: '1' });
  const [templateForm, setTemplateForm] = useState({ name: '', template_name: '' });
  const [creating, setCreating] = useState(false);

  // テンプレートモーダル用状態
  const [templateList, setTemplateList] = useState<TemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<TemplateDetail | null>(null);
  const [loadingTemplateDetail, setLoadingTemplateDetail] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [shouldCreateVolume, setShouldCreateVolume] = useState(false);
  const [volumeSize, setVolumeSize] = useState<number>(0);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // GitHub API ブランチ・ディレクトリ
  const [branches, setBranches] = useState<string[]>([]);
  const [dirs, setDirs] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingDirs, setLoadingDirs] = useState(false);

  // ボリューム作成モーダル
  const [volumeCreateOpen, setVolumeCreateOpen] = useState(false);
  const [volumeForm, setVolumeForm] = useState({ name: '', size_mb: '1024' });
  const [creatingVolume, setCreatingVolume] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, v, e, j, s] = await Promise.allSettled([
        listContainers(project.id),
        listVolumes(project.id),
        listProjectEnvVars(project.id),
        listJobs(project.id),
        listSnapshots(project.id),
      ]);
      if (c.status === 'fulfilled') {
        setContainers(c.value);
        // 全コンテナのビルドジョブを並列取得
        const bjResults = await Promise.allSettled(
          c.value.map((container) => listBuildJobs(project.id, container.id))
        );
        const allBuildJobs: BuildJob[] = [];
        bjResults.forEach((r) => {
          if (r.status === 'fulfilled') allBuildJobs.push(...r.value);
        });
        allBuildJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBuildJobs(allBuildJobs);
      }
      if (v.status === 'fulfilled') setVolumes(v.value);
      if (e.status === 'fulfilled') setEnvVars(e.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      if (s.status === 'fulfilled') setSnapshots(s.value);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // タブごとのポーリング（5秒間隔）
  useEffect(() => {
    const pid = project.id;

    const poll = async () => {
      try {
        if (tab === 'containers') {
          const updated = await listContainers(pid);
          setContainers(updated);
        } else if (tab === 'volumes') {
          const updated = await listVolumes(pid);
          setVolumes(updated);
        } else if (tab === 'envvars') {
          const updated = await listProjectEnvVars(pid);
          setEnvVars(updated);
        } else if (tab === 'jobs') {
          const currentContainers = await listContainers(pid);
          const bjResults = await Promise.allSettled(
            currentContainers.map((c) => listBuildJobs(pid, c.id))
          );
          const allBuildJobs: BuildJob[] = [];
          bjResults.forEach((r) => {
            if (r.status === 'fulfilled') allBuildJobs.push(...r.value);
          });
          allBuildJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setBuildJobs(allBuildJobs);
        }
      } catch {
        // silent
      }
    };

    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [tab, project.id]);


  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toastSuccess('プロジェクトを削除しました');
      onBack();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : '削除に失敗しました');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const fetchBranches = async (rawInput: string) => {
    const repo = parseRepo(rawInput);
    if (!repo) return;
    // URL 形式で入力された場合は owner/repo に正規化して state を更新
    if (repo !== rawInput) {
      setGithubForm((prev) => ({ ...prev, git_repo: repo }));
    }
    setLoadingBranches(true);
    setBranches([]);
    setDirs([]);
    try {
      const result = await listBranches(repo);
      setBranches(result.map((b) => b.name));
      const defaultBranch = result.find((b) => b.name === 'main') ? 'main'
        : result.find((b) => b.name === 'master') ? 'master'
        : result[0]?.name ?? 'main';
      setGithubForm((prev) => ({ ...prev, git_branch: defaultBranch }));
      await fetchDirs(repo, defaultBranch);
    } catch {
      // リポジトリが非公開などで取得できない場合は無視
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchDirs = async (repo: string, branch: string) => {
    const normalized = parseRepo(repo) ?? repo;
    if (!normalized || !branch) return;
    setLoadingDirs(true);
    try {
      const result = await listDirectories(normalized, branch);
      setDirs(result);
    } catch {
      setDirs(['.']);
    } finally {
      setLoadingDirs(false);
    }
  };

  const handleCreateGitHub = async () => {
    if (!githubForm.name.trim() || !githubForm.git_repo.trim()) return;
    setCreating(true);
    try {
      const c = await createContainerFromGitHub(project.id, {
        name: githubForm.name,
        git_repo: githubForm.git_repo,
        git_branch: githubForm.git_branch || 'main',
        git_subdir: githubForm.git_subdir || undefined,
      });
      setContainers((prev) => [...prev, c]);
      setCreateMode(null);
      setGithubForm({ name: '', git_repo: '', git_branch: 'main', git_subdir: '' });
      setBranches([]);
      setDirs([]);
      toastSuccess(`コンテナ "${c.name}" を作成しました`);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'コンテナ作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateFromImage = async () => {
    if (!imageForm.name.trim() || !imageForm.image.trim()) return;
    setCreating(true);
    try {
      const c = await createContainerFromImage(project.id, {
        name: imageForm.name,
        image: imageForm.image,
        resource_size: imageForm.resource_size as 'small' | 'medium' | 'large',
        replicas: parseInt(imageForm.replicas, 10) || 1,
      });
      setContainers((prev) => [...prev, c]);
      setCreateMode(null);
      setImageForm({ name: '', image: '', resource_size: 'small', replicas: '1' });
      toastSuccess(`コンテナ "${c.name}" を作成しました`);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'コンテナ作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const generateRandomString = (len: number): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const openTemplateModal = async () => {
    setCreateMode('template');
    setLoadingTemplates(true);
    try {
      const [list, cfg] = await Promise.all([listTemplates(), getAppConfig()]);
      setTemplateList(list);
      setAppConfig(cfg);
    } catch {
      // 取得失敗はフォールバックなしで表示のみ
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSelectTemplate = async (name: string) => {
    setTemplateForm((prev) => ({ ...prev, template_name: name }));
    setSelectedTemplateDetail(null);
    setLoadingTemplateDetail(true);
    try {
      const detail = await getTemplate(name);
      setSelectedTemplateDetail(detail);
      const initParams: Record<string, string> = {};
      for (const ev of detail.env_vars) {
        if (ev.auto_generate) {
          initParams[ev.key] = generateRandomString(16);
        } else {
          initParams[ev.key] = ev.default ?? '';
        }
      }
      setTemplateParams(initParams);
      setShouldCreateVolume(detail.volume?.required ?? false);
      setVolumeSize(detail.volume?.default_size_mb ?? 1024);
    } catch {
      // 取得失敗時は設定フォームなしで続行
    } finally {
      setLoadingTemplateDetail(false);
    }
  };

  const closeTemplateModal = () => {
    setCreateMode(null);
    setTemplateForm({ name: '', template_name: '' });
    setSelectedTemplateDetail(null);
    setTemplateParams({});
    setShouldCreateVolume(false);
    setVolumeSize(0);
  };

  const handleCreateFromTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.template_name) return;
    setCreating(true);
    try {
      const c = await createContainerFromTemplate(project.id, {
        name: templateForm.name,
        template_name: templateForm.template_name,
        params: Object.keys(templateParams).length > 0 ? templateParams : undefined,
        create_volume: shouldCreateVolume || undefined,
        volume_size: shouldCreateVolume ? volumeSize : undefined,
      });
      setContainers((prev) => [...prev, c]);
      closeTemplateModal();
      toastSuccess(`コンテナ "${c.name}" を作成しました`);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'コンテナ作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateVolume = async () => {
    if (!volumeForm.name.trim()) return;
    setCreatingVolume(true);
    try {
      await createVolume(project.id, {
        name: volumeForm.name,
        size_mb: parseInt(volumeForm.size_mb, 10) || 1024,
      });
      // 作成後にリスト再取得して正確な size_mb などを反映
      const updated = await listVolumes(project.id);
      setVolumes(updated);
      setVolumeCreateOpen(false);
      setVolumeForm({ name: '', size_mb: '1024' });
      toastSuccess('ボリュームを作成しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'ボリューム作成に失敗しました');
    } finally {
      setCreatingVolume(false);
    }
  };

  const handleDeleteVolume = async (volumeId: string) => {
    try {
      await deleteVolume(project.id, volumeId);
      setVolumes((prev) => prev.filter((v) => v.id !== volumeId));
      toastSuccess('ボリュームを削除しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const handleSaveEnvVars = async (
    upsert: { key: string; value: string }[],
    deleteKeys: string[]
  ) => {
    if (upsert.length > 0) {
      await upsertProjectEnvVars(project.id, { env_vars: upsert });
    }
    if (deleteKeys.length > 0) {
      await deleteProjectEnvVars(project.id, { keys: deleteKeys });
    }
    const latest = await listProjectEnvVars(project.id);
    setEnvVars(latest);
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    try {
      await restoreSnapshot(project.id, snapshotId);
      toastSuccess('リストアを開始しました');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'リストアに失敗しました');
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'containers', label: 'コンテナ', count: containers.length },
    { key: 'volumes',    label: 'ボリューム', count: volumes.length },
    { key: 'envvars',    label: '環境変数', count: envVars.length },
    { key: 'jobs',       label: 'ジョブ', count: jobs.length + buildJobs.length },
    { key: 'snapshots',  label: 'スナップショット', count: snapshots.length },
  ];

  return (
    <>
      <TopBar
        breadcrumbs={[
          { label: 'プロジェクト', onClick: onBack },
          { label: project.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(true)}>
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        }
      />

      {/* Project info header */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{project.name}</h1>
            <p className="text-xs text-gray-400 font-mono">{project.namespace} / {project.slug}</p>
          </div>
          <div className="ml-auto text-xs text-gray-400">
            最終デプロイ: {formatRelativeTime(project.last_deployed_at)}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
                ${tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                  ${tab === t.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* コンテナ */}
            {tab === 'containers' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-800">コンテナ</h2>
                    <p className="text-xs text-gray-500">{containers.length} 件</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setCreateMode('github')}
                      icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                    >
                      GitHub からデプロイ
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setCreateMode('image')}
                      icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>}
                    >
                      イメージからデプロイ
                    </Button>
                    <Button variant="secondary" size="sm" onClick={openTemplateModal}
                      icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /></svg>}
                    >
                      テンプレートから追加
                    </Button>
                  </div>
                </div>
                {containers.length === 0 ? (
                  <EmptyState
                    title="コンテナがありません"
                    description="GitHubリポジトリまたはテンプレートからコンテナを追加しましょう。"
                    action={
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={() => setCreateMode('github')}>GitHub からデプロイ</Button>
                        <Button variant="secondary" size="sm" onClick={openTemplateModal}>テンプレートから追加</Button>
                      </div>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {containers.map((c) => (
                      <ContainerCard key={c.id} container={c} onClick={() => onSelectContainer(c)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ボリューム */}
            {tab === 'volumes' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-800">ボリューム</h2>
                    <p className="text-xs text-gray-500">{volumes.length} 件</p>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setVolumeCreateOpen(true)}
                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                  >
                    新規ボリューム
                  </Button>
                </div>
                {volumes.length === 0 ? (
                  <EmptyState title="ボリュームがありません" description="永続ストレージが必要な場合はボリュームを作成してください。" />
                ) : (
                  <Table
                    columns={[
                      { key: 'name', header: '名前', render: (v) => <span className="font-mono text-sm text-gray-800">{v.name}</span> },
                      { key: 'size', header: 'サイズ', render: (v) => <span className="text-gray-600">{formatBytes(v.size_mb)}</span> },
                      { key: 'status', header: 'ステータス', render: (v) => <Badge status={v.status} /> },
                      { key: 'class', header: 'ストレージクラス', render: (v) => <span className="text-gray-500 text-xs">{v.storage_class}</span> },
                      { key: 'mounts', header: 'マウント数', render: (v) => <span className="text-gray-500">{v.mounts?.length ?? 0}</span> },
                      { key: 'created', header: '作成日', render: (v) => <span className="text-gray-500 text-xs">{formatDate(v.created_at)}</span> },
                      {
                        key: 'actions', header: '',
                        render: (v) => (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteVolume(v.id)}>
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        ),
                      },
                    ]}
                    data={volumes}
                    keyExtractor={(v) => v.id}
                    emptyMessage="ボリュームなし"
                  />
                )}
              </div>
            )}

            {/* 環境変数 */}
            {tab === 'envvars' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-800">プロジェクト環境変数</h2>
                  <p className="text-xs text-gray-500 mt-0.5">プロジェクト内に属する環境変数です。</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <EnvVarEditor envVars={envVars} onSave={handleSaveEnvVars} />
                </div>
              </div>
            )}

            {/* ジョブ */}
            {tab === 'jobs' && (
              <div className="space-y-6">
                {/* デプロイジョブ */}
                <div>
                  <div className="mb-3">
                    <h2 className="text-base font-semibold text-gray-800">デプロイジョブ</h2>
                    <p className="text-xs text-gray-500">デプロイ・スケールなどの実行ジョブ ({jobs.length} 件)</p>
                  </div>
                  {jobs.length === 0 ? (
                    <EmptyState title="ジョブはありません" description="デプロイジョブが実行されるとここに表示されます。" />
                  ) : (
                    <Table
                      columns={[
                        { key: 'type', header: 'タイプ', render: (j) => <Badge status={j.type} /> },
                        { key: 'container', header: 'コンテナ', render: (j) => <span className="text-gray-600">{j.container_name ?? '—'}</span> },
                        { key: 'status', header: 'ステータス', render: (j) => <Badge status={j.status} /> },
                        { key: 'started', header: '開始', render: (j) => <span className="text-gray-500 text-xs">{formatDate(j.started_at)}</span> },
                        { key: 'finished', header: '完了', render: (j) => <span className="text-gray-500 text-xs">{formatDate(j.finished_at)}</span> },
                      ]}
                      data={jobs}
                      keyExtractor={(j) => j.id}
                      emptyMessage="ジョブなし"
                    />
                  )}
                </div>

                {/* ビルドジョブ */}
                <div>
                  <div className="mb-3">
                    <h2 className="text-base font-semibold text-gray-800">ビルドジョブ</h2>
                    <p className="text-xs text-gray-500">プロジェクト内全コンテナのビルド履歴 ({buildJobs.length} 件)</p>
                  </div>
                  {buildJobs.length === 0 ? (
                    <EmptyState title="ビルドジョブはありません" description="ビルドが実行されるとここに表示されます。" />
                  ) : (
                    <Table
                      columns={[
                        { key: 'status', header: 'ステータス', render: (j) => <Badge status={j.status} /> },
                        { key: 'branch', header: 'ブランチ', render: (j) => <span className="font-mono text-xs text-gray-700">{j.git_branch || '—'}</span> },
                        { key: 'commit', header: 'コミット', render: (j) => j.git_commit ? <span className="font-mono text-xs text-gray-500">{j.git_commit.slice(0, 7)}</span> : <span className="text-gray-300">—</span> },
                        { key: 'started', header: '開始', render: (j) => <span className="text-gray-500 text-xs">{formatDate(j.started_at)}</span> },
                        { key: 'finished', header: '完了', render: (j) => <span className="text-gray-500 text-xs">{formatDate(j.finished_at)}</span> },
                        {
                          key: 'actions', header: '',
                          render: (j) => (j.status === 'pending' || j.status === 'running') ? (
                            <Button variant="ghost" size="sm" onClick={async () => {
                              try {
                                await cancelBuildJob(project.id, j.id);
                                toastSuccess('ビルドをキャンセルしました');
                                // ビルドジョブ一覧を再取得
                                const currentContainers = await listContainers(project.id);
                                const bjResults = await Promise.allSettled(currentContainers.map((c) => listBuildJobs(project.id, c.id)));
                                const allBj: BuildJob[] = [];
                                bjResults.forEach((r) => { if (r.status === 'fulfilled') allBj.push(...r.value); });
                                allBj.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                                setBuildJobs(allBj);
                              } catch (e: unknown) {
                                toastError(e instanceof Error ? e.message : 'キャンセルに失敗しました');
                              }
                            }}>
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          ) : null,
                        },
                      ]}
                      data={buildJobs}
                      keyExtractor={(j) => j.id}
                      emptyMessage="ビルドジョブなし"
                    />
                  )}
                </div>
              </div>
            )}

            {/* スナップショット */}
            {tab === 'snapshots' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-800">スナップショット</h2>
                  <p className="text-xs text-gray-500">プロジェクトのバックアップポイント</p>
                </div>
                {snapshots.length === 0 ? (
                  <EmptyState title="スナップショットがありません" description="デプロイ時に自動的に作成されます。" />
                ) : (
                  <Table
                    columns={[
                      { key: 'desc', header: '説明', render: (s) => <span className="text-gray-700">{s.description || '—'}</span> },
                      { key: 'containers', header: 'コンテナ数', render: (s) => <span className="text-gray-600">{s.container_count}</span> },
                      { key: 'created', header: '作成日', render: (s) => <span className="text-gray-500 text-xs">{formatDate(s.created_at)}</span> },
                      {
                        key: 'actions', header: '',
                        render: (s) => (
                          <Button variant="outlined" size="sm" onClick={() => handleRestoreSnapshot(s.id)}>
                            リストア
                          </Button>
                        ),
                      },
                    ]}
                    data={snapshots}
                    keyExtractor={(s) => s.id}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* GitHub デプロイモーダル */}
      <Modal
        open={createMode === 'github'}
        onClose={() => { setCreateMode(null); setBranches([]); setDirs([]); }}
        title="GitHub からコンテナをデプロイ"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateMode(null); setBranches([]); setDirs([]); }}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreateGitHub} loading={creating}
              disabled={!githubForm.name.trim() || !githubForm.git_repo.trim()}
            >
              デプロイ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>コンテナ名</label>
            <input
              type="text"
              value={githubForm.name}
              onChange={(e) => setGithubForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="my-app"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>GitHub リポジトリ (owner/repo)</label>
            <input
              type="text"
              value={githubForm.git_repo}
              onChange={(e) => setGithubForm((prev) => ({ ...prev, git_repo: e.target.value }))}
              onBlur={(e) => fetchBranches(e.target.value.trim())}
              placeholder="owner/repository"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              ブランチ
              {loadingBranches && <span className="ml-2 text-xs text-gray-400">取得中...</span>}
            </label>
            {branches.length > 0 ? (
              <select
                value={githubForm.git_branch}
                onChange={(e) => {
                  setGithubForm((prev) => ({ ...prev, git_branch: e.target.value, git_subdir: '' }));
                  fetchDirs(githubForm.git_repo, e.target.value);
                }}
                className={inputCls}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={githubForm.git_branch}
                onChange={(e) => setGithubForm((prev) => ({ ...prev, git_branch: e.target.value }))}
                placeholder="main"
                className={inputCls}
              />
            )}
          </div>
          <div>
            <label className={labelCls}>
              ディレクトリ
              {loadingDirs && <span className="ml-2 text-xs text-gray-400">取得中...</span>}
            </label>
            {dirs.length > 0 ? (
              <select
                value={githubForm.git_subdir}
                onChange={(e) => setGithubForm((prev) => ({ ...prev, git_subdir: e.target.value }))}
                className={inputCls}
              >
                {dirs.map((d) => (
                  <option key={d} value={d === '.' ? '' : d}>{d}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={githubForm.git_subdir}
                onChange={(e) => setGithubForm((prev) => ({ ...prev, git_subdir: e.target.value }))}
                placeholder=". (ルート) または ./docs"
                className={inputCls}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Dockerイメージからデプロイモーダル */}
      <Modal
        open={createMode === 'image'}
        onClose={() => { setCreateMode(null); setImageForm({ name: '', image: '', resource_size: 'small', replicas: '1' }); }}
        title="Dockerイメージからデプロイ"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateMode(null); setImageForm({ name: '', image: '', resource_size: 'small', replicas: '1' }); }}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreateFromImage} loading={creating}
              disabled={!imageForm.name.trim() || !imageForm.image.trim()}
            >
              デプロイ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>コンテナ名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={imageForm.name}
              onChange={(e) => setImageForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="my-container"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Dockerイメージ <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={imageForm.image}
              onChange={(e) => setImageForm((prev) => ({ ...prev, image: e.target.value }))}
              placeholder="nginx:latest または registry.example.com/app:v1.0"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>リソースサイズ</label>
              <select
                value={imageForm.resource_size}
                onChange={(e) => setImageForm((prev) => ({ ...prev, resource_size: e.target.value }))}
                className={inputCls}
              >
                <option value="small">Small (CPU: 100m-500m / Mem: 128Mi-256Mi)</option>
                <option value="medium">Medium (CPU: 500m-1000m / Mem: 512Mi-1Gi)</option>
                <option value="large">Large (CPU: 1000m-2000m / Mem: 1Gi-2Gi)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>レプリカ数</label>
              <input
                type="number"
                min={0}
                max={5}
                value={imageForm.replicas}
                onChange={(e) => setImageForm((prev) => ({ ...prev, replicas: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* テンプレートから追加モーダル */}
      <Modal
        open={createMode === 'template'}
        onClose={closeTemplateModal}
        title="テンプレートからコンテナを追加"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeTemplateModal}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreateFromTemplate} loading={creating}
              disabled={
                !templateForm.name.trim() || !templateForm.template_name ||
                (shouldCreateVolume && appConfig !== null && (
                  volumeSize < appConfig.min_volume_size_mb || volumeSize > appConfig.max_volume_size_mb
                ))
              }
            >
              追加
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* テンプレート選択 */}
          <div>
            <label className={labelCls}>テンプレートを選択</label>
            {loadingTemplates ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {templateList.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => handleSelectTemplate(t.name)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all
                      ${templateForm.template_name === t.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                  >
                    <span className="text-2xl">
                      {t.icon === 'database' ? '🗄️' : t.icon === 'zap' ? '⚡' : t.icon === 'server' ? '🖥️' : t.icon}
                    </span>
                    <p className="text-sm font-medium text-gray-800">{t.display_name}</p>
                    <p className="text-[11px] text-gray-400">{t.category}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* テンプレート選択後の設定フォーム */}
          {templateForm.template_name && (
            <>
              {/* コンテナ名 */}
              <div>
                <label className={labelCls}>コンテナ名</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="my-db"
                  className={inputCls}
                />
              </div>

              {/* 環境変数設定 */}
              {loadingTemplateDetail ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : selectedTemplateDetail && selectedTemplateDetail.env_vars.length > 0 && (
                <div>
                  <label className={labelCls}>設定項目</label>
                  <div className="space-y-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
                    {selectedTemplateDetail.env_vars.map((ev) => (
                      <div key={ev.key} className="flex items-center gap-2">
                        <div className="w-40 shrink-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {ev.description || ev.key}
                            {ev.required && <span className="ml-1 text-red-500">*</span>}
                          </p>
                          <p className="text-[10px] text-gray-400">{ev.key}</p>
                        </div>
                        <div className="flex-1 flex gap-1">
                          <input
                            type={ev.generate_type === 'password' ? 'password' : 'text'}
                            value={templateParams[ev.key] ?? ''}
                            onChange={(e) => setTemplateParams((prev) => ({ ...prev, [ev.key]: e.target.value }))}
                            className={inputCls}
                            placeholder={ev.default || ''}
                          />
                          {ev.auto_generate && (
                            <button
                              type="button"
                              onClick={() => setTemplateParams((prev) => ({ ...prev, [ev.key]: generateRandomString(16) }))}
                              className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-500 shrink-0"
                              title="ランダム生成"
                            >
                              🔄
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ボリューム設定 */}
              {selectedTemplateDetail?.volume && (
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shouldCreateVolume}
                      onChange={(e) => setShouldCreateVolume(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      永続ボリュームを作成する（データを保持）
                    </span>
                  </label>
                  {shouldCreateVolume && (
                    <div className="mt-3">
                      <label className={labelCls}>ボリュームサイズ (MB)</label>
                      <input
                        type="number"
                        value={volumeSize}
                        onChange={(e) => setVolumeSize(Number(e.target.value))}
                        min={appConfig?.min_volume_size_mb ?? 10}
                        max={appConfig?.max_volume_size_mb ?? 3000}
                        step={512}
                        className={inputCls}
                      />
                      {appConfig && (volumeSize < appConfig.min_volume_size_mb || volumeSize > appConfig.max_volume_size_mb) && (
                        <p className="mt-1 text-[11px] text-red-500">
                          {appConfig.min_volume_size_mb}〜{appConfig.max_volume_size_mb} MB の範囲で入力してください
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        マウントパス: {selectedTemplateDetail.volume.mount_path}
                        {appConfig && ` (最大 ${appConfig.max_volume_size_mb} MB)`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* ボリューム作成モーダル */}
      <Modal
        open={volumeCreateOpen}
        onClose={() => setVolumeCreateOpen(false)}
        title="新規ボリューム作成"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVolumeCreateOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreateVolume} loading={creatingVolume} disabled={!volumeForm.name.trim()}>
              作成
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ボリューム名</label>
            <input type="text" value={volumeForm.name}
              onChange={(e) => setVolumeForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="my-volume" className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>サイズ (MB)</label>
            <input type="number" value={volumeForm.size_mb}
              onChange={(e) => setVolumeForm((prev) => ({ ...prev, size_mb: e.target.value }))}
              min={100} step={100} className={inputCls}
            />
          </div>
        </div>
      </Modal>

      {/* プロジェクト削除確認 */}
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="プロジェクトを削除"
        message={`"${project.name}" を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        loading={deleting}
      />
    </>
  );
};
