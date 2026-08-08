import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { User } from '../types';
import { RestrictionModal } from './RestrictionModal';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isSubmitting?: boolean;
  user?: User | null;
  isAdmin?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmar Eliminação',
  message,
  confirmText = 'Eliminar Registo',
  cancelText = 'Cancelar',
  variant = 'danger',
  isSubmitting = false,
  user,
  isAdmin,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  // Check if current user is supervisor (non-admin)
  const isSupervisor = user ? user.tipo !== 'admin' : isAdmin === false;

  if (isSupervisor) {
    return <RestrictionModal isOpen={isOpen} onClose={onClose} actionType="delete" />;
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3 text-slate-800">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                variant === 'danger'
                  ? 'bg-red-100 text-red-600 border border-red-200'
                  : 'bg-amber-100 text-amber-600 border border-amber-200'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">{title}</h3>
              <p className="text-[11px] font-semibold text-slate-500">Esta ação requer a sua confirmação explícita</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
