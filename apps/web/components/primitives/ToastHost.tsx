'use client';

import React, { useCallback, useState } from 'react';

type ToastVariant = 'info' | 'error';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export function useToastQueue(autoDismissMs = 4000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismissToast(id), autoDismissMs);
    },
    [autoDismissMs, dismissToast],
  );

  return { toasts, pushToast, dismissToast };
}

export function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[320px] flex-col gap-2">
      {toasts.map((toast) => {
        const accent = toast.variant === 'error' ? 'border-[--color-danger]' : 'border-amber-400';
        return (
          <div
            key={toast.id}
            className={`rounded border border-slate-700 bg-slate-900/95 px-3 py-2 font-mono text-xs text-slate-200 shadow-lg ${accent} border-l-4`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-slate-500 hover:text-slate-100"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
