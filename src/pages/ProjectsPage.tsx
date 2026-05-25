import React, { useEffect, useRef, useState } from 'react';
import type { Project, ProjectStatus } from '../lib/types';
import { listProjects, createProject } from '../services/projects';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { TopBar } from '../components/layout/TopBar';
import { toastError, toastSuccess } from '../components/ui/Toast';
import { formatRelativeTime } from '../lib/utils';

interface ProjectsPageProps {
  onSelectProject: (project: Project) => void;
}

const PROJECT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
];

function getProjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

type StatusMeta = { label: string; spinning: boolean; color: string; textColor: string };

function getStatusMeta(status: ProjectStatus): StatusMeta {
  switch (status) {
    case 'pending':
      return { label: 'プロビジョニング中', spinning: true, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600' };
    case 'active':
      return { label: 'アクティブ', spinning: false, color: '', textColor: 'text-green-600' };
    case 'terminating':
      return { label: '削除中', spinning: true, color: 'bg-red-50 border-red-200', textColor: 'text-red-500' };
    case 'failed':
      return { label: 'エラー', spinning: false, color: 'bg-red-50 border-red-200', textColor: 'text-red-600' };
  }
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProjects = async (initial = false) => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (e: unknown) {
      if (initial) toastError(e instanceof Error ? e.message : 'プロジェクトの取得に失敗しました');
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(true);
    timerRef.current = setInterval(() => fetchProjects(), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await createProject({ name: newName.trim() });
      setProjects((prev) => [...prev, p]);
      setCreateOpen(false);
      setNewName('');
      toastSuccess(`プロジェクト "${p.name}" を作成しました`);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'プロジェクト作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TopBar
        breadcrumbs={[{ label: 'プロジェクト' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen(true)}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
          >
            新規プロジェクト
          </Button>
        }
      />

      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">プロジェクト</h1>
          <p className="text-sm text-gray-500 mt-0.5">コンテナをプロジェクト単位で管理します</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="プロジェクトがありません"
            description="最初のプロジェクトを作成してコンテナのデプロイを開始しましょう。"
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                プロジェクトを作成
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((p) => {
              const colorClass = getProjectColor(p.name);
              const isActive = p.status === 'active';
              const meta = getStatusMeta(p.status);
              return (
                <div
                  key={p.id}
                  onClick={() => isActive && onSelectProject(p)}
                  className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
                    isActive
                      ? 'border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300'
                      : `${meta.color} border cursor-not-allowed opacity-80`
                  }`}
                >
                  {/* Color bar */}
                  <div className={`h-1.5 w-full ${colorClass}`} />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                          {p.name[0]?.toUpperCase() ?? 'P'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-800 truncate">{p.name}</h3>
                          <p className="text-[11px] text-gray-400 font-mono truncate">{p.slug}</p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className={`flex items-center gap-1 shrink-0 ${meta.textColor}`}>
                        {meta.spinning && (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                        {!meta.spinning && p.status === 'active' && (
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        )}
                        {!meta.spinning && p.status === 'failed' && (
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        )}
                        <span className="text-[11px] font-medium">{meta.label}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">コンテナ</p>
                        <p className="text-lg font-bold text-gray-800 leading-none">{p.container_count}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">最終デプロイ</p>
                        <p className="text-xs text-gray-600 leading-snug">{formatRelativeTime(p.last_deployed_at)}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-[10px] text-gray-400 font-mono truncate">{p.namespace}</p>
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewName(''); }}
        title="新規プロジェクト"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
              作成
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">プロジェクト名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="my-project"
              autoFocus
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all"
            />
            <p className="mt-1.5 text-xs text-gray-400">英小文字・数字・ハイフンが使用できます</p>
          </div>
        </div>
      </Modal>
    </>
  );
};
