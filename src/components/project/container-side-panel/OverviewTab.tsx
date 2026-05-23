import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { containerService } from '../../../services/containerService';

interface PodStatus {
    id: string;
    name: string;
    phase: string;
    ready: boolean;
    restarts: number;
    message?: string;
    started_at?: string;
}

interface OverviewTabProps {
    container: any;
    pods?: PodStatus[];
    onScaled?: () => void;
}

const MAX_REPLICAS = 5;

export const OverviewTab: React.FC<OverviewTabProps> = ({ container, pods = [], onScaled }) => {
    const current: number = container.replicas ?? 1;
    const isScaling = container.status === 'Scaling';

    const [selected, setSelected] = useState<number>(current);
    const [submitting, setSubmitting] = useState(false);

    // DBのステータスが Scaling から変わったらポーリング完了 → onScaled を呼ぶ
    useEffect(() => {
        if (!isScaling) {
            setSubmitting(false);
            // Scaling が終わったタイミングで selected を最新値に同期
            setSelected(current);
        }
    }, [isScaling, current]);

    const isDirty = selected !== current && !isScaling;
    const isBusy = submitting || isScaling;

    const handleApply = async () => {
        if (!isDirty || isBusy) return;
        setSubmitting(true);
        try {
            await containerService.scaleContainer(container.id, selected);
            onScaled?.();
            // submitting は isScaling が true になるまでの橋渡し。
            // isScaling が true になれば上の useEffect で false になる。
        } catch {
            alert('スケールに失敗しました。');
            setSubmitting(false);
            setSelected(current);
        }
    };

    // 表示用ドット: 適用中は selected 数を先行表示
    const displayed = isBusy ? selected : current;

    const isDatabase = container.container_type === 'database';

    const infoItems = isDatabase
        ? [
            { label: 'テンプレート', value: container.template_name },
            { label: 'イメージ', value: container.image_id },
          ]
        : [
            { label: 'リポジトリ', value: container.repository_url },
            { label: 'ブランチ', value: container.branch },
            { label: 'パス', value: container.directory || '/' },
          ];

    return (
        <div className="p-4 space-y-4">
            {/* Container info */}
            <div className="space-y-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                {infoItems.map(item => (
                    <div key={item.label} className="flex justify-between items-start gap-4 text-[11px]">
                        <span className="text-gray-400 font-medium shrink-0">{item.label}</span>
                        <span className="text-gray-700 font-mono text-right break-all">{item.value}</span>
                    </div>
                ))}
            </div>

            {/* Pod status list */}
            {pods.length > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-500 font-medium">Pod 一覧</span>
                        <span className="text-gray-400 font-mono">{pods.length} pods</span>
                    </div>
                    <div className="space-y-1.5">
                        {pods.map(pod => {
                            const isReady = pod.phase === 'Running' && pod.ready;
                            const isPending = pod.phase === 'Pending';
                            const isFailed = pod.phase === 'Failed';
                            return (
                                <div key={pod.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn(
                                            'w-2 h-2 rounded-full shrink-0',
                                            isReady ? 'bg-green-400' :
                                            isPending ? 'bg-yellow-400 animate-pulse' :
                                            isFailed ? 'bg-red-400' : 'bg-gray-300'
                                        )} />
                                        <span className="text-[10px] font-mono text-gray-600 truncate">{pod.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {pod.restarts > 0 && (
                                            <span className="text-[9px] text-orange-500 bg-orange-50 px-1 py-0.5 rounded font-bold">
                                                ×{pod.restarts}
                                            </span>
                                        )}
                                        <span className={cn(
                                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                                            isReady ? 'bg-green-100 text-green-700' :
                                            isPending ? 'bg-yellow-100 text-yellow-700' :
                                            isFailed ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-500'
                                        )}>
                                            {isReady ? 'Ready' : pod.phase}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Scaling UI: app type only */}
            {!isDatabase && <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500 font-medium">POD スケーリング</span>
                    <span className="text-[10px] text-gray-400 font-mono">最大 {MAX_REPLICAS}</span>
                </div>

                {/* Pod dot visualizer */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: MAX_REPLICAS }).map((_, i) => {
                        const active = i < displayed;
                        const pending = !isBusy && i >= current && i < selected;
                        const removing = !isBusy && i < current && i >= selected;
                        return (
                            <div
                                key={i}
                                className={cn(
                                    'w-5 h-5 rounded-md border-2 transition-all duration-300',
                                    isBusy
                                        ? active
                                            ? 'bg-cyan-400 border-cyan-300 animate-pulse'
                                            : 'bg-gray-200 border-gray-100'
                                        : pending
                                        ? 'bg-blue-200 border-blue-300 border-dashed'
                                        : removing
                                        ? 'bg-red-100 border-red-200 border-dashed'
                                        : active
                                        ? container.status === 'Running'
                                            ? 'bg-green-400 border-green-300'
                                            : 'bg-blue-400 border-blue-300'
                                        : 'bg-gray-200 border-gray-100'
                                )}
                                title={`Pod ${i + 1}`}
                            />
                        );
                    })}
                    <span className="ml-1 text-[10px] font-bold">
                        {isBusy ? (
                            <span className="text-cyan-600">スケール中...</span>
                        ) : isDirty ? (
                            <span className="text-blue-600">{current} → {selected}</span>
                        ) : (
                            <span className="text-gray-400">{current} / {MAX_REPLICAS}</span>
                        )}
                    </span>
                </div>

                {/* Replica selector buttons */}
                <div className="flex gap-1.5">
                    {Array.from({ length: MAX_REPLICAS }).map((_, i) => {
                        const val = i + 1;
                        const isCurrent = val === current;
                        const isChosen = val === selected;
                        return (
                            <button
                                key={val}
                                disabled={isBusy}
                                onClick={() => setSelected(val)}
                                className={cn(
                                    'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all border',
                                    isBusy
                                        ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
                                        : isChosen
                                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                        : isCurrent
                                        ? 'bg-white text-blue-500 border-blue-300'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-500'
                                )}
                            >
                                {val}
                            </button>
                        );
                    })}
                </div>

                {/* Apply button */}
                <button
                    onClick={handleApply}
                    disabled={!isDirty || isBusy}
                    className={cn(
                        'w-full py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5',
                        isBusy
                            ? 'bg-cyan-50 text-cyan-600 cursor-not-allowed border border-cyan-200'
                            : isDirty
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                >
                    {isBusy ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>スケール適用中...</span>
                        </>
                    ) : (
                        <>
                            <Check size={12} />
                            <span>{isDirty ? `${selected} pods に変更を適用` : '変更なし'}</span>
                        </>
                    )}
                </button>
            </div>}
        </div>
    );
};
