import React, { useState, useEffect, useCallback } from 'react';
import type { MetricPoint, Metrics } from '../../lib/types';
import { getMetrics } from '../../services/logs';
import { formatPercent, formatBytes } from '../../lib/utils';

interface LineChartProps {
  data: MetricPoint[];
  color: string;
  fillColor: string;
  label: string;
  unit: 'percent' | 'bytes';
  height?: number;
}

function LineChart({ data, color, fillColor, label, unit, height = 140 }: LineChartProps) {
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
  const width = 500;
  const padLeft = 44;
  const padRight = 12;
  const padTop = 8;
  const padBottom = 24;
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

  const xLabels = data.length >= 2 ? [
    { label: new Date(data[0].timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }), x: padLeft },
    { label: new Date(data[data.length - 1].timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }), x: toX(data.length - 1) },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>現在: <span className="font-semibold font-mono" style={{ color }}>{formatValue(latest)}</span></span>
          <span>平均: <span className="font-semibold font-mono text-gray-700">{formatValue(avg)}</span></span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
        {yLabels.map(({ y }, i) => (
          <line key={i} x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f1f3f4" strokeWidth={1} />
        ))}
        {yLabels.map(({ value, y }, i) => (
          <text key={i} x={padLeft - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#9aa0a6">
            {unit === 'percent' ? `${Math.round(value)}%` : formatBytes(value)}
          </text>
        ))}
        {xLabels.map(({ label: xl, x }, i) => (
          <text key={i} x={x} y={padTop + chartH + 16} textAnchor={i === 0 ? 'start' : 'end'} fontSize={9} fill="#9aa0a6">
            {xl}
          </text>
        ))}
        <polygon points={fillPoints} fill={fillColor} fillOpacity={0.15} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.length > 0 && (
          <circle cx={toX(data.length - 1)} cy={toY(latest)} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />
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

  const fetchMetrics = useCallback(async () => {
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

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return (
    <div className="space-y-4">
      {/* Duration selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">期間:</span>
        <div className="flex gap-1">
          {['15m', '1h', '6h', '24h'].map((d) => (
            <button
              key={d}
              onClick={() => { setDuration(d); setLoading(true); }}
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
        <button
          onClick={() => { setLoading(true); fetchMetrics(); }}
          className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          title="更新"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="text-red-500 text-sm text-center py-8">{error}</div>}

      {!loading && metrics && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <LineChart data={metrics.cpu} color="#1a73e8" fillColor="#1a73e8" label="CPU 使用率" unit="percent" height={140} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <LineChart data={metrics.memory} color="#34a853" fillColor="#34a853" label="メモリ使用量" unit="bytes" height={140} />
          </div>
        </div>
      )}
    </div>
  );
};
