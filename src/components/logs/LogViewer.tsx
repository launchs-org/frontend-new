import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LogLine, PodStatus } from '../../lib/types';
import { getLogs } from '../../services/logs';

// ---- 単一ペイン（1 Pod または全Pod統合）----

interface LogPaneProps {
  logs: LogLine[];
  loading: boolean;
  error: string | null;
  search: string;
  autoScroll: boolean;
  setAutoScroll: (v: boolean) => void;
  showPodName?: boolean;
}

const LogPane: React.FC<LogPaneProps> = ({ logs, loading, error, search, autoScroll, setAutoScroll, showPodName }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? logs.filter((l) => l.message.toLowerCase().includes(search.toLowerCase()))
    : logs;

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  if (loading) return (
    <div className="flex items-center justify-center flex-1">
      <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center flex-1 text-red-400 text-sm">{error}</div>
  );
  if (filtered.length === 0) return (
    <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
      {search ? '一致するログがありません' : 'ログがありません'}
    </div>
  );

  return (
    <div
      ref={scrollRef}
      onWheel={(e) => { if (e.deltaY < 0) setAutoScroll(false); }}
      className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
    >
      {filtered.map((line, idx) => (
        <div
          key={idx}
          className={`flex gap-3 py-0.5 ${line.level === 'ERROR' ? 'text-red-400' : line.level === 'WARN' ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          <span className="text-gray-600 shrink-0 select-none tabular-nums">
            {new Date(line.timestamp).toLocaleTimeString('ja-JP', { hour12: false })}
          </span>
          {showPodName && line.pod_name && (
            <span className="text-gray-500 shrink-0 select-none truncate max-w-[140px]" title={line.pod_name}>
              {line.pod_name}
            </span>
          )}
          <span className="whitespace-pre-wrap break-all">{line.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

// ---- ダウンロードヘルパー ----

function downloadLogs(logs: LogLine[], filename: string) {
  const text = logs.map((l) => `${new Date(l.timestamp).toISOString()} [${l.level}]${l.pod_name ? ` [${l.pod_name}]` : ''} ${l.message}`).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- メインコンポーネント ----

interface LogViewerProps {
  projectId: string;
  containerId: string;
  pods?: PodStatus[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ projectId, containerId, pods }) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedPod, setSelectedPod] = useState<string>('');
  // 'single' = セレクトで1Pod選択 or 全Pod統合, 'tile' = Podごとタイル
  const [viewMode, setViewMode] = useState<'single' | 'tile'>('single');
  const bottomRef = useRef<HTMLDivElement>(null);

  const multiplePods = pods && pods.length > 1;

  const fetchLogs = useCallback(async () => {
    try {
      const params: { limit: string; pod?: string } = { limit: '2000' };
      // タイルモード時は全Pod分を一括取得（pod_name で分割はクライアント側）
      if (viewMode === 'single' && selectedPod) params.pod = selectedPod;
      const data = await getLogs(projectId, containerId, params);
      setLogs(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [projectId, containerId, selectedPod, viewMode]);

  useEffect(() => {
    setLoading(true);
    setLogs([]);
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // タイルモードへ切り替えたらセレクトをリセット
  const handleViewMode = (mode: 'single' | 'tile') => {
    setViewMode(mode);
    if (mode === 'tile') setSelectedPod('');
  };

  const filteredAll = search
    ? logs.filter((l) => l.message.toLowerCase().includes(search.toLowerCase()))
    : logs;

  // タイルモード用: Pod名でグループ化
  const podNames = pods?.map((p) => p.pod_name) ?? [];
  const logsByPod = podNames.reduce<Record<string, LogLine[]>>((acc, name) => {
    acc[name] = logs.filter((l) => l.pod_name === name);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col bg-gray-900 rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-800 shrink-0">

        {/* タイル / 統合 切り替え（複数Pod時のみ） */}
        {multiplePods && (
          <div className="flex items-center bg-gray-700 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => handleViewMode('single')}
              title="統合ビュー"
              className={`p-1 rounded transition-all ${viewMode === 'single' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => handleViewMode('tile')}
              title="タイル表示"
              className={`p-1 rounded transition-all ${viewMode === 'tile' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
        )}

        {/* Pod セレクト（統合ビュー時のみ） */}
        {multiplePods && viewMode === 'single' && (
          <select
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500 shrink-0"
          >
            <option value="">全 Pod</option>
            {pods.map((p) => (
              <option key={p.pod_name} value={p.pod_name}>{p.pod_name}</option>
            ))}
          </select>
        )}

        {/* 検索 */}
        <div className="flex-1 relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ログを絞り込む..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 更新 */}
        <button
          onClick={() => { setLoading(true); fetchLogs(); }}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all shrink-0"
          title="更新"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* ダウンロード */}
        {logs.length > 0 && (
          <button
            onClick={() => downloadLogs(filteredAll, `container-${containerId.slice(0, 8)}.log`)}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all shrink-0"
            title="ログをダウンロード"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}

        {/* 自動スクロール（統合ビュー時のみ） */}
        {viewMode === 'single' && (
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${autoScroll ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            自動スクロール
          </button>
        )}

        <span className="text-[11px] text-gray-500 shrink-0">{filteredAll.length} 件</span>
      </div>

      {/* ---- タイルモード ---- */}
      {viewMode === 'tile' && multiplePods ? (
        <div className="flex-1 min-h-0 overflow-auto p-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
          {podNames.map((podName) => (
            <div key={podName} className="flex flex-col bg-gray-800 rounded-lg overflow-hidden min-h-[240px]">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 shrink-0">
                <span className="text-[11px] font-mono text-gray-300 truncate">{podName}</span>
                <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                  {(search ? logsByPod[podName].filter((l) => l.message.toLowerCase().includes(search.toLowerCase())) : logsByPod[podName]).length} 件
                </span>
              </div>
              <LogPane
                logs={logsByPod[podName]}
                loading={loading}
                error={error}
                search={search}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
              />
            </div>
          ))}
        </div>
      ) : (
        /* ---- 統合ビュー ---- */
        <>
          <LogPane
            logs={logs}
            loading={loading}
            error={error}
            search={search}
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
            showPodName={!selectedPod && multiplePods}
          />
          {!autoScroll && filteredAll.length > 0 && (
            <div className="shrink-0 flex justify-center py-2 border-t border-gray-700 bg-gray-800">
              <button
                onClick={() => {
                  setAutoScroll(true);
                  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  );
};
