import React, { useState, useEffect, useRef } from 'react';
import type { EnvVar } from '../../lib/types';
import { Button } from '../ui/Button';
import { toastError, toastSuccess } from '../ui/Toast';

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toastSuccess('コピーしました');
};

interface EnvVarRow {
  id?: string;
  key: string;
  value: string;
  isNew?: boolean;
  isDirty?: boolean;
  isDeleted?: boolean;
}

interface EnvVarEditorProps {
  envVars: EnvVar[];
  onSave: (upsert: { key: string; value: string }[], deleteKeys: string[]) => Promise<void>;
  loading?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export const EnvVarEditor: React.FC<EnvVarEditorProps> = ({ envVars, onSave, loading = false, onEditingChange }) => {
  const [rows, setRows] = useState<EnvVarRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    // 編集中（未保存の変更あり）はポーリングによる上書きをスキップ
    if (isDirtyRef.current) return;
    setRows(
      envVars.map((v) => ({ id: v.id, key: v.key, value: v.value }))
    );
  }, [envVars]);

  const addRow = () => {
    isDirtyRef.current = true;
    onEditingChange?.(true);
    setRows((prev) => [...prev, { key: '', value: '', isNew: true }]);
  };

  const updateRow = (idx: number, field: 'key' | 'value', val: string) => {
    isDirtyRef.current = true;
    onEditingChange?.(true);
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: val, isDirty: true } : r
      )
    );
  };

  const deleteRow = (idx: number) => {
    isDirtyRef.current = true;
    onEditingChange?.(true);
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const upsert = rows
      .filter((r) => r.key.trim() !== '')
      .map((r) => ({ key: r.key.trim(), value: r.value }));

    const originalKeys = new Set(envVars.map((v) => v.key));
    const currentKeys = new Set(upsert.map((r) => r.key));
    const deleteKeys = [...originalKeys].filter((k) => !currentKeys.has(k));

    setSaving(true);
    try {
      await onSave(upsert, deleteKeys);
      isDirtyRef.current = false;
      onEditingChange?.(false);
      toastSuccess('Environment variables saved');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'Failed to save env vars');
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (idx: number) => {
    setShowValues((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleShowAll = () => {
    const next = !showAll;
    setShowAll(next);
    // 個別トグルをリセットして一括状態に統一
    setShowValues({});
  };

  // 各行の表示状態: 個別トグルが優先、なければ一括状態に従う
  const isVisible = (idx: number) => {
    if (idx in showValues) return showValues[idx];
    return showAll;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{rows.length} 件の環境変数</p>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <button
              type="button"
              onClick={toggleShowAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              {showAll ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  すべて隠す
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  すべて表示
                </>
              )}
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={addRow}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
          >
            変数を追加
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving || loading}>
            保存
          </Button>
        </div>
      </div>

      {/* Column headers */}
      {rows.length > 0 && (
        <div className="flex gap-2 px-1">
          <span className="flex-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">キー</span>
          <span className="flex-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">値</span>
          <span className="w-16" />
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center bg-gray-50">
            <p className="text-sm text-gray-400">環境変数はありません</p>
            <button onClick={addRow} className="mt-2 text-xs text-blue-600 hover:text-blue-800">追加する</button>
          </div>
        )}

        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={row.key}
              onChange={(e) => updateRow(idx, 'key', e.target.value)}
              placeholder="KEY_NAME"
              spellCheck={false}
              className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
            <div className="relative flex-1 min-w-0">
              <input
                type={isVisible(idx) ? 'text' : 'password'}
                value={row.value}
                onChange={(e) => updateRow(idx, 'value', e.target.value)}
                placeholder="値"
                spellCheck={false}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
              <button
                type="button"
                onClick={() => toggleShow(idx)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isVisible(idx) ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(row.value)}
              title="値をコピー"
              className="shrink-0 p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => deleteRow(idx)}
              className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
