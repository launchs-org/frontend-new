import React, { useState } from 'react';
import { Database, Trash2 } from 'lucide-react';
import { containerService } from '../../../services/containerService';

interface VolumesTabProps {
    projectId: string;
    containerId: string;
    volumes: any[];
    fetchVolumes: () => void;
}

export const VolumesTab: React.FC<VolumesTabProps> = ({
    projectId,
    containerId,
    volumes,
    fetchVolumes
}) => {
    const [newVolume, setNewVolume] = useState({ name: '', size_mb: 128, mount_path: '/data' });
    const [isCreatingVolume, setIsCreatingVolume] = useState(false);

    const handleCreateVolume = async () => {
        if (!projectId) return;
        setIsCreatingVolume(true);
        try {
            await containerService.createAndMountVolume(projectId, containerId, newVolume);
            setNewVolume({ name: '', size_mb: 128, mount_path: '/data' });
            fetchVolumes();
            alert('作成しました。再デプロイが必要です。');
        } catch (err) {
            console.error(err);
            alert('ボリュームの作成に失敗しました。');
        } finally {
            setIsCreatingVolume(false);
        }
    };

    const handleDeleteVolume = async (volumeId: string) => {
        if (!projectId) return;
        if (!confirm('削除しますか？保存されているデータは失われます。')) return;
        try {
            await containerService.unmountAndDeleteVolume(projectId, containerId, volumeId);
            fetchVolumes();
        } catch (err) {
            console.error(err);
            alert('ボリュームの削除に失敗しました。');
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="space-y-3">
                {volumes.map(vol => (
                    <div key={vol.id} className="p-3 border rounded-xl bg-white shadow-sm flex items-center justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <Database size={12} className="text-gray-400" />
                                <p className="text-xs font-bold truncate">{vol.name}</p>
                            </div>
                            <p className="text-[10px] text-blue-500 font-mono mt-1">
                                {vol.mount_path} <span className="text-gray-300 mx-1">|</span> {vol.size_mb}MB
                            </p>
                        </div>
                        <button
                            onClick={() => handleDeleteVolume(vol.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="p-4 border border-dashed rounded-2xl bg-gray-50/50 space-y-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase">新規ボリューム</p>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 block ml-1">ボリューム名</label>
                    <input
                        value={newVolume.name}
                        onChange={e => setNewVolume({ ...newVolume, name: e.target.value })}
                        placeholder="名称 (例: redis-data)"
                        className="w-full p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 block ml-1">マウントパス</label>
                    <input
                        value={newVolume.mount_path}
                        onChange={e => setNewVolume({ ...newVolume, mount_path: e.target.value })}
                        placeholder="/data"
                        className="w-full p-2 text-xs border rounded-lg font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 ml-1">
                        <span>容量</span>
                        <span>{newVolume.size_mb}MB</span>
                    </div>
                    <input
                        type="range"
                        min="128"
                        max="5120"
                        step="128"
                        value={newVolume.size_mb}
                        onChange={e => setNewVolume({ ...newVolume, size_mb: parseInt(e.target.value) })}
                        className="w-full accent-blue-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <button
                    onClick={handleCreateVolume}
                    disabled={!newVolume.name || isCreatingVolume}
                    className="w-full py-2 bg-gray-900 text-white text-[10px] font-bold rounded-lg disabled:opacity-50"
                >
                    {isCreatingVolume ? '作成中...' : '作成'}
                </button>
            </div>
        </div>
    );
};
