import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { MetricPoint, Metrics } from '../../lib/types';
import { getMetrics } from '../../services/logs';
import { formatPercent, formatBytes } from '../../lib/utils';

const AUTO_REFRESH_INTERVAL = 15;

interface LineChartProps {
  data: MetricPoint[];
  color: string;
  fillColor: string;
  label: string;
  unit: 'percent' | 'bytes';
  height?: number;
}

function LineChart({ data, color, fillColor, label, unit, height = 200 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-400">データなし</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = 0;
  const max = Math.max(...values, unit === 'percent' ? 100 : 1) * 1.1;
  const width = 1000;
  const padLeft = 52;
  const padRight = 16;
  const padTop = 12;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const toX = (i: number) => padLeft + (i / (data.length - 1 || 1)) * chartW;
  const toY = (v: number) => padTop + chartH - ((v - min) / (max - min || 1)) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const fillPoints = [
    `${padLeft},${padTop + chartH}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.value)}`),
    `${toX(data.length - 1)},${padTop + chartH}`,
  ].join(' ');

  const latest = values[values.length - 1] ?? 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const formatValue = (v: number) => unit === 'percent' ? formatPercent(v) : formatBytes(v);

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: min + t * (max - min),
    y: padTop + chartH - t * chartH,
  }));

  const xTickCount = Math.min(data.length, 6);
  const xLabels = data.length >= 2
    ? Array.from({ length: xTickCount }, (_, i) => {
        const idx = Math.round(i / (xTickCount - 1) * (data.length - 1));
        return {
          label: new Date(data[idx].timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }),
          x: toX(idx),
          anchor: i === 0 ? 'start' : i === xTickCount - 1 ? 'end' : 'middle',
        };
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span>現在: <span className="font-semibold font-mono text-sm" style={{ color }}>{formatValue(latest)}</span></span>
          <span>平均: <span className="font-semibold font-mono text-sm text-gray-700">{formatValue(avg)}</span></span>
          <span>最大: <span className="font-semibold font-mono text-sm text-gray-700">{formatValue(Math.max(...values))}</span></span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
        {yLabels.map(({ y }, i) => (
          <line key={i} x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f1f3f4" strokeWidth={1} />
        ))}
        {yLabels.map(({ value, y }, i) => (
          <text key={i} x={padLeft - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9aa0a6">
            {unit === 'percent' ? `${Math.round(value)}%` : formatBytes(value)}
          </text>
        ))}
        {xLabels.map(({ label: xl, x, anchor }, i) => (
          <text key={i} x={x} y={padTop + chartH + 18} textAnchor={anchor as 'start' | 'end' | 'middle'} fontSize={10} fill="#9aa0a6">
            {xl}
          </text>
        ))}
        <polygon points={fillPoints} fill={fillColor} fillOpacity={0.12} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.length > 0 && (
          <circle cx={toX(data.length - 1)} cy={toY(latest)} r={4} fill={color} stroke="white" strokeWidth={2} />
        )}
      </svg>
    </div>
  );
}

interface MetricsChartProps {
  projectId: string;
  containerId: string;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ projectId, containerId }) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const countdownRef = useRef(AUTO_REFRESH_INTERVAL);

  const fetchMetrics = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await getMetrics(projectId, containerId, { duration });
      setMetrics(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'メトリクス取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [projectId, containerId, duration]);

  // 初回・duration変更時にフェッチ
  useEffect(() => {
    fetchMetrics(true);
    countdownRef.current = AUTO_REFRESH_INTERVAL;
    setCountdown(AUTO_REFRESH_INTERVAL);
  }, [fetchMetrics]);

  // 自動更新カウントダウン
  useEffect(() => {
    if (!autoRefresh) return;

    const tick = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        countdownRef.current = AUTO_REFRESH_INTERVAL;
        setCountdown(AUTO_REFRESH_INTERVAL);
        fetchMetrics();
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [autoRefresh, fetchMetrics]);

  const handleManualRefresh = () => {
    countdownRef.current = AUTO_REFRESH_INTERVAL;
    setCountdown(AUTO_REFRESH_INTERVAL);
    fetchMetrics(true);
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh((v) => {
      if (!v) {
        countdownRef.current = AUTO_REFRESH_INTERVAL;
        setCountdown(AUTO_REFRESH_INTERVAL);
      }
      return !v;
    });
  };

  return (
    <div className="space-y-5">
      {/* ツールバー */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">期間:</span>
        <div className="flex gap-1">
          {['15m', '1h', '6h', '24h', '7d'].map((d) => (
            <button
              key={d}
              onClick={() => { setDuration(d); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                ${duration === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 自動更新トグル */}
          <button
            onClick={handleToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border
              ${autoRefresh
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {autoRefresh ? `自動更新 ${countdown}s` : '自動更新 OFF'}
          </button>

          {/* 手動更新 */}
          <button
            onClick={handleManualRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="今すぐ更新"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-52">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="text-red-500 text-sm text-center py-10">{error}</div>}

      {!loading && metrics && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <LineChart data={metrics.cpu} color="#1a73e8" fillColor="#1a73e8" label="CPU 使用率" unit="percent" height={200} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <LineChart data={metrics.memory} color="#34a853" fillColor="#34a853" label="メモリ使用量" unit="bytes" height={200} />
          </div>
        </div>
      )}
    </div>
  );
};
