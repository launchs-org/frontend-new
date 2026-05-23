import React, { useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let _addToast: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string) {
  if (_addToast) _addToast(type, message);
}

export function toastError(message: string) { toast('error', message); }
export function toastSuccess(message: string) { toast('success', message); }

const typeStyles: Record<ToastType, string> = {
  success: 'bg-white border-l-4 border-green-500 text-gray-800',
  error:   'bg-white border-l-4 border-red-500 text-gray-800',
  info:    'bg-white border-l-4 border-blue-500 text-gray-800',
};

const typeIcon: Record<ToastType, React.ReactNode> = {
  success: (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ),
  error: (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
      <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  ),
  info: (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" />
      </svg>
    </span>
  ),
};

let nextId = 0;

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm ${typeStyles[t.type]}`}
        >
          {typeIcon[t.type]}
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
};
