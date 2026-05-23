import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { containerService } from '../../../services/containerService';

interface DeleteTabProps {
    projectId: string;
    containerId: string;
    containerName: string;
    onClose: () => void;
}

export const DeleteTab: React.FC<DeleteTabProps> = ({ projectId, containerId, containerName, onClose }) => {
    const [confirmName, setConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmName !== containerName) return;
        if (!window.confirm('本当にこのコンテナを完全に削除しますか？この操作は取り消せません。')) return;

        setIsDeleting(true);
        try {
            await containerService.deleteContainer(projectId, containerId);
            alert('コンテナを削除しました。');
            onClose();
        } catch (err) {
            console.error(err);
            alert('削除に失敗しました。');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-red-600 font-bold">
                    <AlertTriangle size={18} />
                    <span>危険な操作</span>
                </div>
                <p className="text-xs text-red-500 leading-relaxed">
                    コンテナ <strong>{containerName}</strong> を削除しようとしています。
                    この操作により、コンテナに関連するリソースが完全に削除され復元することはできません。
                </p>
            </div>

            <div className="space-y-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase">
                    確認のためコンテナ名を入力してください
                </p>
                <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={containerName}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
                />
                <button
                    onClick={handleDelete}
                    disabled={confirmName !== containerName || isDeleting}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    コンテナを完全に削除する
                </button>
            </div>
        </div>
    );
};
