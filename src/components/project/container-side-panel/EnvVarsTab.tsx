import React from 'react';
import { Plus, Trash2, Loader2, Save, Info } from 'lucide-react';

interface EnvVarsTabProps {
    envVars: { key: string; value: string }[];
    setEnvVars: (vars: { key: string; value: string }[]) => void;
    handleSaveEnvVars: () => void;
    isSavingEnv: boolean;
}

export const EnvVarsTab: React.FC<EnvVarsTabProps> = ({
    envVars,
    setEnvVars,
    handleSaveEnvVars,
    isSavingEnv
}) => {
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-[11px] font-bold text-gray-700">プロジェクト環境変数</div>
                <button
                    onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="space-y-2">
                {envVars.map((ev, i) => (
                    <div key={i} className="flex gap-2 group">
                        <input
                            className="flex-1 px-2 py-1.5 text-[10px] font-mono border rounded-lg bg-gray-50 focus:bg-white outline-none"
                            placeholder="KEY"
                            value={ev.key}
                            onChange={e => {
                                const n = [...envVars];
                                n[i].key = e.target.value;
                                setEnvVars(n);
                            }}
                        />
                        <input
                            className="flex-1 px-2 py-1.5 text-[10px] font-mono border rounded-lg bg-gray-50 focus:bg-white outline-none"
                            placeholder="VALUE"
                            value={ev.value}
                            onChange={e => {
                                const n = [...envVars];
                                n[i].value = e.target.value;
                                setEnvVars(n);
                            }}
                        />
                        <button
                            onClick={() => setEnvVars(envVars.filter((_, idx) => idx !== i))}
                            className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="pt-2">
                <button
                    onClick={handleSaveEnvVars}
                    disabled={isSavingEnv}
                    className="w-full py-2 bg-blue-500 text-white text-[10px] font-bold rounded-xl flex justify-center items-center gap-2"
                >
                    {isSavingEnv ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {isSavingEnv ? '保存中...' : '変更を保存'}
                </button>
                <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-[12px] text-blue-600 flex gap-2">
                    <Info size={12} className="shrink-0" />
                    <span>保存後、再デプロイを実行してください。</span>
                </div>
            </div>
        </div>
    );
};
