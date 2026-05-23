import React, { useState, useEffect } from 'react';
import { Activity, Globe, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { containerService } from '../../../services/containerService';

interface NetworkingTabProps {
    projectId: string;
    containerId: string;
    container: any;
    setContainer: (container: any) => void;
    customDomain: string;
    setCustomDomain: (domain: string) => void;
    customDomainEnabled: boolean;
    setCustomDomainEnabled: (enabled: boolean) => void;
    fetchData: () => void;
}

export const NetworkingTab: React.FC<NetworkingTabProps> = ({
    projectId,
    containerId,
    container,
    setContainer,
    customDomain,
    setCustomDomain,
    customDomainEnabled,
    setCustomDomainEnabled,
    fetchData
}) => {
    const svc = container?.service;
    const ingress = container?.ingress;
    const isDatabase = container?.container_type === 'database';
    const ingressDisabled = isDatabase && !ingress;

    const [port, setPort] = useState(svc?.port ?? 80);
    const [protocol, setProtocol] = useState<'TCP' | 'UDP'>(svc?.protocol ?? 'TCP');
    const [ingressPort, setIngressPort] = useState(80);
    const [savingService, setSavingService] = useState(false);
    const [savingIngress, setSavingIngress] = useState(false);

    useEffect(() => {
        setPort(svc?.port ?? 80);
        setProtocol(svc?.protocol ?? 'TCP');
    }, [svc?.port, svc?.protocol]);

    const handleToggleService = async () => {
        if (!projectId) return;
        if (svc?.is_active) {
            // Service ルートを削除
            if (svc.id) {
                await containerService.deleteRoute(projectId, containerId, svc.id);
            }
            setContainer({ ...container, service: null });
        } else {
            setSavingService(true);
            try {
                await containerService.createServiceRoute(projectId, containerId, { port, protocol });
                fetchData();
            } finally {
                setSavingService(false);
            }
        }
    };

    const handleSaveService = async () => {
        if (!projectId) return;
        setSavingService(true);
        try {
            // 既存を削除して再作成
            if (svc?.id) {
                await containerService.deleteRoute(projectId, containerId, svc.id);
            }
            await containerService.createServiceRoute(projectId, containerId, { port, protocol });
            fetchData();
        } finally {
            setSavingService(false);
        }
    };

    const handleCreateIngress = async () => {
        if (!projectId) return;
        setSavingIngress(true);
        try {
            await containerService.createIngressRoute(projectId, containerId, { port: ingressPort });
            fetchData();
        } finally {
            setSavingIngress(false);
        }
    };

    const handleDeleteIngress = async () => {
        if (!projectId || !ingress?.id) return;
        if (!confirm('外部公開を停止しますか？')) return;
        await containerService.deleteRoute(projectId, containerId, ingress.id);
        setContainer({ ...container, ingress: null });
        fetchData();
    };

    return (
        <div className="p-4 space-y-5">
            {/* Service */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-700">
                        <Activity size={14} className="text-blue-500" />
                        <span>内部ポート設定 (Service)</span>
                        {savingService && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px] text-amber-600 font-bold">
                                <Loader2 size={9} className="animate-spin" />
                                処理中
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleToggleService}
                        disabled={savingService}
                        className={cn(
                            "w-8 h-4 rounded-full relative transition-colors disabled:opacity-50",
                            svc?.is_active ? "bg-blue-500" : "bg-gray-200"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                            svc?.is_active ? "right-0.5" : "left-0.5"
                        )} />
                    </button>
                </div>
                {svc?.is_active && (
                    <div className="p-3 space-y-3">
                        <div className="p-2 bg-gray-50 rounded text-[10px] font-mono text-gray-500 border border-gray-100">
                            {container.name}.ns-{container.project_id}.svc.cluster.local
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Protocol</p>
                                <select
                                    value={protocol}
                                    onChange={e => setProtocol(e.target.value as 'TCP' | 'UDP')}
                                    className="w-full text-xs p-1.5 border rounded-lg"
                                >
                                    <option value="TCP">TCP</option>
                                    <option value="UDP">UDP</option>
                                </select>
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Port</p>
                                <input
                                    type="number"
                                    value={port}
                                    onChange={e => setPort(parseInt(e.target.value))}
                                    className="w-full text-xs font-mono p-1.5 border rounded-lg"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSaveService}
                            disabled={savingService}
                            className="w-full py-2 bg-gray-900 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                        >
                            {savingService ? '処理中...' : '適用'}
                        </button>
                    </div>
                )}
            </div>

            {/* Ingress */}
            <div className={`bg-white rounded-xl border overflow-hidden ${ingressDisabled ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
                <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-700">
                        <Globe size={14} className={ingressDisabled ? 'text-gray-300' : 'text-green-500'} />
                        <span>外部公開 (Ingress)</span>
                        {ingressDisabled && (
                            <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] text-gray-400 font-bold">
                                このテンプレートでは無効
                            </span>
                        )}
                    </div>
                    <span className="text-[12px] font-bold text-gray-400">
                        {ingress ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
                <div className="p-3 space-y-4">
                    {ingressDisabled ? (
                        <p className="text-[11px] text-gray-400 text-center py-2">
                            このテンプレートは外部公開に対応していません
                        </p>
                    ) : ingress ? (
                        <>
                            <div className="space-y-1">
                                <p className="text-[12px] font-bold text-gray-400">DEFAULT DOMAIN</p>
                                <div className="flex items-center justify-between p-2 bg-gray-50 border rounded-lg">
                                    <span className="text-[10px] font-mono truncate">{ingress.subdomain}</span>
                                    <a href={`https://${ingress.subdomain}`} target="_blank" rel="noreferrer">
                                        <ExternalLink size={12} className="text-blue-500" />
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[12px] font-bold text-gray-400">Port</p>
                                <p className="text-xs font-mono text-gray-600">{ingress.port}</p>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleDeleteIngress}
                                    className="w-full px-3 py-1.5 border border-red-100 text-red-500 rounded-lg text-[10px] font-bold"
                                >
                                    停止
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <p className="text-[12px] font-bold text-gray-400">公開ポート</p>
                                <input
                                    type="number"
                                    value={ingressPort}
                                    onChange={e => setIngressPort(parseInt(e.target.value))}
                                    className="w-full p-2 text-xs border rounded-lg font-mono"
                                    placeholder="80"
                                />
                            </div>
                            <button
                                onClick={handleCreateIngress}
                                disabled={savingIngress}
                                className="w-full py-2 bg-blue-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                            >
                                {savingIngress ? '処理中...' : '外部公開を有効化'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
