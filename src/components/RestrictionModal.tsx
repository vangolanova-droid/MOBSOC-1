import React from 'react';
import { ShieldAlert, X, Phone, MessageSquare } from 'lucide-react';

interface RestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType?: 'edit' | 'delete' | 'general';
  title?: string;
  subtitle?: string;
}

export const RestrictionModal: React.FC<RestrictionModalProps> = ({
  isOpen,
  onClose,
  actionType = 'edit',
  title,
  subtitle,
}) => {
  if (!isOpen) return null;

  const defaultTitle =
    actionType === 'delete'
      ? 'Acesso Restrito — Permissão de Eliminação'
      : actionType === 'edit'
      ? 'Acesso Restrito — Permissão de Edição'
      : 'Acesso Restrito — Permissão Necessária';

  const defaultSubtitle =
    actionType === 'delete'
      ? 'Supervisores não possuem autorização para eliminar registos no sistema'
      : actionType === 'edit'
      ? 'Supervisores não possuem autorização para editar ou alterar registos no sistema'
      : 'Esta operação requer permissão administrativa';

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-600 tracking-tight">
                {title || defaultTitle}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {subtitle || defaultSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 transition"
            id="btn-close-restriction-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-wide text-red-600 bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-900 text-center leading-relaxed">
            CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              <span>Contacto do Administrador ADZER:</span>
            </div>
            <p className="font-black text-slate-800 dark:text-slate-200 text-xs tracking-wider">
              Telefone/whatsApp: +244 923591571 / +244 953855260
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <a
            href="https://wa.me/244923591571"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>WhatsApp +244 923591571</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            id="btn-understand-restriction"
          >
            Compreendido
          </button>
        </div>
      </div>
    </div>
  );
};
