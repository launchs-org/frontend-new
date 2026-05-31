import React, { useEffect, useRef, useState } from 'react';
import type { WorkflowRun, WorkflowRunEvent, WorkflowRunStatus } from '../../lib/types';
import { listWorkflowRuns, getWorkflowRunEvents } from '../../services/workflowRuns';
import { formatRelativeTime } from '../../lib/utils';

const POLL_INTERVAL = 4000;

interface Props {
  projectId: string;
}

const STATUS_CONFIG: Record<WorkflowRunStatus, { label: string; dot: string; bg: string; text: string; timeline: string }> = {
  running:   { label: '実行中',     dot: 'bg-blue-500 animate-pulse',  bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  timeline: 'bg-blue-500' },
  succeeded: { label: '成功',       dot: 'bg-green-500',               bg: 'bg-green-50 border-green-200', text: 'text-green-700', timeline: 'bg-green-500' },
  failed:    { label: '失敗',       dot: 'bg-red-500',                 bg: 'bg-red-50 border-red-200',     text: 'text-red-700',   timeline: 'bg-red-500' },
  canceled:  { label: 'キャンセル', dot: 'bg-gray-400',                bg: 'bg-gray-50 border-gray-200',   text: 'text-gray-600',  timeline: 'bg-gray-400' },
};

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  CreateProject:   'プロジェクト作成',
  DeleteProject:   'プロジェクト削除',
  DeployProject:   '全体デプロイ',
  Deploy:          'デプロイ',
  Redeploy:        '再デプロイ',
  DeleteContainer: 'コンテナ削除',
  Scale:           'スケール変更',
  BuildDeploy:     'ビルド＆デプロイ',
  CancelBuild:     'ビルドキャンセル',
  CreateVolume:    'ボリューム作成',
  DeleteVolume:    'ボリューム削除',
  MountVolume:     'ボリュームマウント',
  UnmountVolume:   'ボリュームアンマウント',
  CreateService:   'サービス作成',
  DeleteService:   'サービス削除',
  CreateIngress:   'Ingress 作成',
  DeleteIngress:   'Ingress 削除',
  RestoreSnapshot: 'スナップショット復元',
  DeployTemplate:  'テンプレートデプロイ',
};

const STATUS_LABELS: Record<WorkflowRunStatus, string> = {
  running:   '開始',
  succeeded: '完了',
  failed:    '失敗',
  canceled:  'キャンセル',
};

// ---- Detail Modal ----

interface DetailModalProps {
  run: WorkflowRun;
  projectId: string;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ run, projectId, onClose }) => {
  const [events, setEvents] = useState<WorkflowRunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = async () => {
    try {
      const data = await getWorkflowRunEvents(projectId, run.id);
      setEvents(data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    if (run.status === 'running') {
      timerRef.current = setInterval(fetchEvents, POLL_INTERVAL);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [run.id, run.status]);

  const cfg = STATUS_CONFIG[run.status];
  const typeLabel = WORKFLOW_TYPE_LABELS[run.workflow_type] ?? run.workflow_type;

  // Calculate duration
  const startedAt = new Date(run.created_at);
  const endedAt = run.status !== 'running' ? new Date(run.updated_at) : null;
  const durationMs = endedAt ? endedAt.getTime() - startedAt.getTime() : null;
  const durationStr = durationMs !== null
    ? durationMs < 1000 ? `${durationMs}ms`
      : durationMs < 60000 ? `${(durationMs / 1000).toFixed(1)}s`
      : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className="font-semibold text-gray-900 text-sm">{typeLabel}</span>
              {run.label && <span className="text-gray-400 text-sm">— {run.label}</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 ml-4">
              <span>開始: {new Date(run.created_at).toLocaleString('ja-JP')}</span>
              {durationStr && <span>所要: {durationStr}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">タイムライン</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              読み込み中...
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">イベントがありません</p>
          ) : (
            <ol className="relative border-l-2 border-gray-100 space-y-0 ml-2">
              {events.map((ev, i) => {
                const evCfg = STATUS_CONFIG[ev.status];
                const isLast = i === events.length - 1;
                // Time relative to workflow start
                const evMs = new Date(ev.created_at).getTime() - startedAt.getTime();
                const evOffset = evMs < 1000 ? `+${evMs}ms`
                  : evMs < 60000 ? `+${(evMs / 1000).toFixed(1)}s`
                  : `+${Math.floor(evMs / 60000)}m ${Math.floor((evMs % 60000) / 1000)}s`;
                return (
                  <li key={ev.id} className="ml-4 pb-4">
                    <div className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 border-white ${evCfg.timeline}`} />
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xs font-semibold ${evCfg.text}`}>
                        {STATUS_LABELS[ev.status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(ev.created_at).toLocaleTimeString('ja-JP')}
                        {i > 0 && <span className="ml-1 text-gray-300">({evOffset})</span>}
                      </span>
                    </div>
                    {ev.message && (
                      <pre className="mt-1 text-xs bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {ev.message}
                      </pre>
                    )}
                    {isLast && run.status === 'running' && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        実行中...
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Main List ----

export const WorkflowRunList: React.FC<Props> = ({ projectId }) => {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRuns = async () => {
    try {
      const data = await listWorkflowRuns(projectId);
      setRuns(data ?? []);
      // Keep selected run in sync with latest status
      if (selectedRun) {
        const updated = (data ?? []).find(r => r.id === selectedRun.id);
        if (updated) setSelectedRun(updated);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    timerRef.current = setInterval(fetchRuns, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [projectId]);

  const hasRunning = runs.some(r => r.status === 'running');

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        読み込み中...
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="py-10 text-center text-gray-400 text-sm">
        ワークフロー実行履歴がありません
      </div>
    );
  }

  return (
    <>
      {selectedRun && (
        <DetailModal
          run={selectedRun}
          projectId={projectId}
          onClose={() => setSelectedRun(null)}
        />
      )}

      <div className="space-y-2">
        {hasRunning && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            実行中のワークフローがあります — 自動更新中
          </div>
        )}
        {runs.map(run => {
          const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.failed;
          const typeLabel = WORKFLOW_TYPE_LABELS[run.workflow_type] ?? run.workflow_type;
          return (
            <button
              key={run.id}
              onClick={() => setSelectedRun(run)}
              className={`w-full text-left border rounded-lg px-4 py-3 ${cfg.bg} transition-all hover:shadow-sm hover:brightness-95 cursor-pointer`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate block">
                      {typeLabel}
                      {run.label && (
                        <span className="ml-1.5 text-gray-500 font-normal">— {run.label}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 truncate block">
                      {formatRelativeTime(run.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                  <span className="text-gray-300 text-sm">›</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
};
