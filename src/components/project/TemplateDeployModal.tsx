import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, Loader2, Database, Zap, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { containerService } from '../../services/containerService';

interface EnvVarDef {
    key: string;
    required: boolean;
    description: string;
    auto_generate: boolean;
    generate_type: string;
    default: string;
}

interface VolumeDef {
    required: boolean;
    mount_path: string;
    default_size_mb: number;
}

interface IngressDef {
    enabled: boolean;
    http_port: number;
}

interface Template {
    name: string;
    display_name: string;
    category: string;
    description: string;
    icon: string;
    color: string;
    version: string;
    container: {
        image: string;
        tag: string;
        ports: { port: number; protocol: string }[];
    };
    env_vars: EnvVarDef[];
    volume?: VolumeDef;
    ingress?: IngressDef;
}

interface TemplateDeployModalProps {
    projectId: string;
    onClose: () => void;
    onDeployed: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
    database: Database,
    zap: Zap,
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700'     },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700'       },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700'   },
};

function generatePassword(length = 16): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(v => chars[v % chars.length]).join('');
}

export const TemplateDeployModal: React.FC<TemplateDeployModalProps> = ({ projectId, onClose, onDeployed }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selected, setSelected] = useState<Template | null>(null);
    const [step, setStep] = useState<'select' | 'configure'>('select');

    const [containerName, setContainerName] = useState('');
    const [envVars, setEnvVars] = useState<Record<string, string>>({});
    const [createService, setCreateService] = useState(true);
    const [createVolume, setCreateVolume] = useState(true);
    const [volumeSize, setVolumeSize] = useState(0);
    const [command, setCommand] = useState('');
    const [args, setArgs] = useState('');
    const [enableIngress, setEnableIngress] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        containerService.getTemplates()
            .then(res => setTemplates(res.data.data?.items ?? []))
            .catch(() => setError('テンプレートの取得に失敗しました'))
            .finally(() => setLoadingTemplates(false));
    }, []);

    const handleSelectTemplate = (t: Template) => {
        setSelected(t);
        // Pre-fill env vars
        const initial: Record<string, string> = {};
        for (const def of t.env_vars) {
            if (def.auto_generate) {
                initial[def.key] = def.generate_type === 'uuid'
                    ? crypto.randomUUID()
                    : generatePassword();
            } else {
                initial[def.key] = def.default ?? '';
            }
        }
        setEnvVars(initial);
        setVolumeSize(t.volume?.default_size_mb ?? 0);
        setCreateVolume(t.volume?.required ?? false);
        setEnableIngress(t.ingress?.enabled ?? false);
        setCommand('');
        setArgs('');
        setContainerName('');
        setError('');
        setStep('configure');
    };

    const handleDeploy = async () => {
        if (!selected) return;
        if (!containerName.trim()) { setError('コンテナ名を入力してください'); return; }
        setError('');
        setSubmitting(true);
        try {
            await containerService.deployFromTemplate(projectId, {
                name: containerName.trim(),
                template_name: selected.name,
                env_vars: envVars,
                create_service: createService,
                volume_size_mb: selected.volume && createVolume ? volumeSize : undefined,
                enable_ingress: enableIngress,
                command: command || undefined,
                args: args || undefined,
            });
            onDeployed();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'デプロイに失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div className="flex items-center gap-2">
                        {step === 'configure' && (
                            <button onClick={() => setStep('select')} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <ChevronLeft size={18} className="text-gray-500" />
                            </button>
                        )}
                        <h2 className="text-base font-bold text-gray-900">
                            {step === 'select' ? 'テンプレートから追加' : `${selected?.display_name} を設定`}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 'select' && (
                        <>
                            {loadingTemplates ? (
                                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" /></div>
                            ) : templates.length === 0 ? (
                                <p className="text-center text-gray-400 py-12">テンプレートが見つかりません</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {templates.map(t => {
                                        const colors = COLOR_MAP[t.color] ?? COLOR_MAP.blue;
                                        const Icon = ICON_MAP[t.icon] ?? Database;
                                        return (
                                            <button
                                                key={t.name}
                                                onClick={() => handleSelectTemplate(t)}
                                                className={cn(
                                                    'flex items-start gap-3 p-4 rounded-xl border-2 text-left hover:shadow-md transition-all',
                                                    colors.border,
                                                    colors.bg,
                                                )}
                                            >
                                                <div className={cn('p-2 rounded-lg shrink-0', colors.bg, colors.text)}>
                                                    <Icon size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-sm font-bold text-gray-900">{t.display_name}</span>
                                                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase', colors.badge)}>{t.version}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 leading-relaxed">{t.description}</p>
                                                    <div className="mt-1.5 text-[10px] text-gray-400">
                                                        {(t.container?.ports ?? []).map(p => `${p.port}/${p.protocol}`).join(', ')}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {step === 'configure' && selected && (
                        <div className="space-y-5">
                            {/* Container name */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">コンテナ名 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={containerName}
                                    onChange={e => setContainerName(e.target.value)}
                                    placeholder="my-database"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>

                            {/* Env vars */}
                            {selected.env_vars.length > 0 && (
                                <div>
                                    <div className="text-[11px] font-bold text-gray-700 mb-2">環境変数</div>
                                    <div className="space-y-2">
                                        {selected.env_vars.map(def => (
                                            <div key={def.key}>
                                                <label className="flex items-center gap-1 text-[10px] font-mono text-gray-600 mb-0.5">
                                                    {def.key}
                                                    {def.required && <span className="text-red-500">*</span>}
                                                    {def.auto_generate && <span className="text-blue-400 text-[9px]">自動生成</span>}
                                                </label>
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={envVars[def.key] ?? ''}
                                                        onChange={e => setEnvVars(prev => ({ ...prev, [def.key]: e.target.value }))}
                                                        placeholder={def.description}
                                                        className="flex-1 px-3 py-1.5 text-[11px] font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    />
                                                    {def.auto_generate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEnvVars(prev => ({
                                                                ...prev,
                                                                [def.key]: def.generate_type === 'uuid' ? crypto.randomUUID() : generatePassword(),
                                                            }))}
                                                            className="px-2 py-1.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                                            title="再生成"
                                                        >
                                                            <RefreshCw size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Command & Args */}
                            <div>
                                <div className="text-[11px] font-bold text-gray-700 mb-2">起動コマンド（任意）</div>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={command}
                                        onChange={e => setCommand(e.target.value)}
                                        placeholder="空の場合はイメージのデフォルトコマンドを使用"
                                        className="w-full px-3 py-1.5 text-[11px] font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <input
                                        type="text"
                                        value={args}
                                        onChange={e => setArgs(e.target.value)}
                                        placeholder="引数（空の場合はイメージのデフォルト引数を使用）"
                                        className="w-full px-3 py-1.5 text-[11px] font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </div>

                            {/* Service option */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <div className="text-[11px] font-bold text-gray-700">サービスを作成</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">ClusterIP サービスで内部公開（デフォルト: ON）</div>
                                </div>
                                <button
                                    onClick={() => setCreateService(v => !v)}
                                    className={cn(
                                        'relative shrink-0 w-10 h-6 rounded-full transition-colors overflow-hidden',
                                        createService ? 'bg-blue-500' : 'bg-gray-200'
                                    )}
                                >
                                    <span className={cn(
                                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                                        createService ? 'translate-x-4' : 'translate-x-0'
                                    )} />
                                </button>
                            </div>

                            {/* Volume option */}
                            {selected.volume && (
                                <div className="space-y-2">
                                    {!selected.volume.required && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div>
                                                <div className="text-[11px] font-bold text-gray-700">ボリュームを作成</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">マウント先: {selected.volume.mount_path}</div>
                                            </div>
                                            <button
                                                onClick={() => setCreateVolume(v => !v)}
                                                className={cn(
                                                    'relative shrink-0 w-10 h-6 rounded-full transition-colors overflow-hidden',
                                                    createVolume ? 'bg-blue-500' : 'bg-gray-200'
                                                )}
                                            >
                                                <span className={cn(
                                                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                                                    createVolume ? 'translate-x-4' : 'translate-x-0'
                                                )} />
                                            </button>
                                        </div>
                                    )}
                                    {(selected.volume.required || createVolume) && (
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                ボリュームサイズ (MB)
                                            </label>
                                            <input
                                                type="number"
                                                min={512}
                                                max={102400}
                                                value={volumeSize}
                                                onChange={e => setVolumeSize(Number(e.target.value))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ingress option — enabled: true のテンプレートのみ表示 */}
                            {selected.ingress?.enabled && (
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <div className="text-[11px] font-bold text-gray-700">外部公開（Ingress）</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">HTTP ポート {selected.ingress.http_port} をサブドメインで外部公開</div>
                                    </div>
                                    <button
                                        onClick={() => setEnableIngress(v => !v)}
                                        className={cn(
                                            'relative shrink-0 w-10 h-6 rounded-full transition-colors overflow-hidden',
                                            enableIngress ? 'bg-blue-500' : 'bg-gray-200'
                                        )}
                                    >
                                        <span className={cn(
                                            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                                            enableIngress ? 'translate-x-4' : 'translate-x-0'
                                        )} />
                                    </button>
                                </div>
                            )}

                            {error && (
                                <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'configure' && (
                    <div className="flex-shrink-0 p-5 border-t flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            キャンセル
                        </button>
                        <button
                            onClick={handleDeploy}
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors shadow-sm"
                        >
                            {submitting && <Loader2 size={14} className="animate-spin" />}
                            <span>デプロイ</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
