import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, type TooltipProps,
} from 'recharts';
import type { MetricPoint, Metrics } from '../../lib/types';
import { getMetrics } from '../../services/logs';
import { formatPercent, formatBytes } from '../../lib/utils';

const AUTO_REFRESH_INTERVAL = 15;

// ────────────────────────────────────────────────────────────
// カスタムツールチップ
// ────────────────────────────────────────────────────────────
interface ChartTooltipProps extends TooltipProps<number, string> {
  unit: 'percent' | 'bytes';
  color: string;
}

function ChartTooltip({ active, payload, unit, color }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MetricPoint;
  const value = payload[0].value as number;
  const formatValue = (v: number) => unit === 'percent' ? formatPercent(v) : formatBytes(v);
  const time = new Date(point.timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="text-gray-400 mb-1">{time}</p>
      <p className="font-semibold font-mono text-sm" style={{ color }}>{formatValue(value)}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 単一グラフ
// ────────────────────────────────────────────────────────────
interface LineChartProps {
  data: MetricPoint[];
  color: string;
  label: string;
  unit: 'percent' | 'bytes';
  height?: number;
}

function LineChart({ data, color, label, unit, height = 200 }: LineChartProps) {
  const formatValue = (v: number) => unit === 'percent' ? formatPercent(v) : formatBytes(v);
  const formatTick = (v: number) => unit === 'percent' ? `${Math.round(v)}%` : formatBytes(v);

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-400">データなし</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const latest = values[values.length - 1] ?? 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const domainMax = Math.max(...values, unit === 'percent' ? 100 : 1) * 1.1;

  // XAxis 用ラベル（データが多くても最大6本）
  const tickCount = Math.min(data.length, 6);
  const tickIndices = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / (tickCount - 1 || 1)) * (data.length - 1))
  );
  const tickSet = new Set(tickIndices);
  const xTicks = data
    .map((d, i) => (tickSet.has(i) ? d.timestamp : null))
    .filter(Boolean) as string[];

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
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
          <XAxis
            dataKey="timestamp"
            ticks={xTicks}
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
            }
            tick={{ fontSize: 10, fill: '#9aa0a6' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, domainMax]}
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: '#9aa0a6' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={<ChartTooltip unit={unit} color={color} />}
            cursor={{ stroke: '#9aa0a6', strokeWidth: 1, strokeDasharray: '4 3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#fill-${color.replace('#', '')})`}
            dot={false}
            activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// メトリクス全体コンポーネント
// ────────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchMetrics(true);
    countdownRef.current = AUTO_REFRESH_INTERVAL;
    setCountdown(AUTO_REFRESH_INTERVAL);
  }, [fetchMetrics]);

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
              onClick={() => setDuration(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                ${duration === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
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
            <LineChart data={metrics.cpu} color="#1a73e8" label="CPU 使用率" unit="percent" height={200} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <LineChart data={metrics.memory} color="#34a853" label="メモリ使用量" unit="bytes" height={200} />
          </div>
        </div>
      )}
    </div>
  );
};
