import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, Plus, Trash2, Loader2, X } from 'lucide-react';
import { containerService } from '../../services/containerService';

interface ProjectVolumesPanelProps {
    projectId: string;
    onClose?: () => void;
}

const statusBadge = (status: string) => {
    switch (status) {
        case 'Available':
            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700">{status}</span>;
        case 'Pending':
            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700">{status}</span>;
        case 'Deleting':
            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">{status}</span>;
        default:
            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500">{status}</span>;
    }
};

export const ProjectVolumesPanel: React.FC<ProjectVolumesPanelProps> = ({ projectId, onClose }) => {
    const [volumes, setVolumes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', size_mb: 512, mount_path: '', container_id: '' });
    const [error, setError] = useState('');

    const fetchVolumes = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await containerService.getProjectVolumes(projectId);
            setVolumes(res.data.data?.items ?? []);
        } catch {
            // ignore
        } finally {
            if (!silent) setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchVolumes(); }, [fetchVolumes]);
    useEffect(() => {
        const t = setInterval(() => fetchVolumes(true), 3000);
        return () => clearInterval(t);
    }, [fetchVolumes]);

    const handleDelete = async (id: string) => {
        if (!confirm('このボリュームを削除しますか？')) return;
        try {
            await containerService.deleteVolume(id);
            fetchVolumes(true);
        } catch {
            alert('削除に失敗しました');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.mount_path.trim()) {
            setError('名前とマウントパスは必須です');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await containerService.createProjectVolume(projectId, {
                name: form.name.trim(),
                size_mb: form.size_mb,
                mount_path: form.mount_path.trim(),
                container_id: form.container_id.trim() || undefined,
            });
            setShowModal(false);
            setForm({ name: '', size_mb: 512, mount_path: '', container_id: '' });
            fetchVolumes(true);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'ボリュームの作成に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                    <HardDrive size={16} className="text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-800">ボリューム</h3>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-md">{volumes.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setShowModal(true); setError(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <Plus size={13} /> ボリュームを追加
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
            ) : volumes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                    <HardDrive size={32} strokeWidth={1} />
                    <p className="text-xs font-mono">ボリュームがありません</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-4">名前</th>
                                <th className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-4">サイズ</th>
                                <th className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-4">マウントパス</th>
                                <th className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-4">コンテナ</th>
                                <th className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-4">ステータス</th>
                                <th className="pb-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {volumes.map((vol) => (
                                <tr key={vol.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-2.5 pr-4">
                                        <span className="text-xs font-semibold text-gray-800">{vol.name}</span>
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <span className="text-xs text-gray-500 font-mono">{vol.size_mb} MB</span>
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <span className="text-xs text-blue-500 font-mono">{vol.mount_path}</span>
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <span className="text-xs text-gray-500 font-mono">
                                            {vol.container_id ? vol.container_id.slice(0, 8) : 'Unattached'}
                                        </span>
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        {statusBadge(vol.status)}
                                    </td>
                                    <td className="py-2.5">
                                        <button
                                            onClick={() => handleDelete(vol.id)}
                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b">
                            <h2 className="text-base font-bold text-gray-900">ボリュームを追加</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">名前 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="my-volume"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">サイズ (MB) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min={512}
                                    max={102400}
                                    value={form.size_mb}
                                    onChange={e => setForm(f => ({ ...f, size_mb: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">マウントパス <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.mount_path}
                                    onChange={e => setForm(f => ({ ...f, mount_path: e.target.value }))}
                                    placeholder="/data"
                                    className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">コンテナID（任意）</label>
                                <input
                                    type="text"
                                    value={form.container_id}
                                    onChange={e => setForm(f => ({ ...f, container_id: e.target.value }))}
                                    placeholder="空の場合は未アタッチ"
                                    className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            {error && (
                                <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors shadow-sm"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    <span>作成</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};
