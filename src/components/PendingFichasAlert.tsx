import React from 'react';
import { Clock, ArrowRight, X, FileText, AlertCircle } from 'lucide-react';
import { Ficha } from '../types';
import { getFichaAgeHours } from '../utils/fichaUtils';

interface PendingFichasAlertProps {
  pendingFichas: Ficha[];
  onViewPending: () => void;
  onClose: () => void;
}

export const PendingFichasAlert: React.FC<PendingFichasAlertProps> = ({
  pendingFichas,
  onViewPending,
  onClose,
}) => {
  if (!pendingFichas || pendingFichas.length === 0) return null;

  // Find oldest pending ficha
  const sorted = [...pendingFichas].sort(
    (a, b) => getFichaAgeHours(b) - getFichaAgeHours(a)
  );
  const oldest = sorted[0];
  const oldestHours = Math.floor(getFichaAgeHours(oldest));

  return (
    <div className="fixed top-16 right-3 sm:right-6 z-40 max-w-sm sm:max-w-md w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl backdrop-blur-md dark:text-slate-100">
        {/* Header line */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded-md">
                  Atenção
                </span>
                <span className="text-[11px] font-semibold text-slate-400">SisMob System</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                Fichas Pendentes (+48 horas)
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fechar alerta de fichas pendentes"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="py-3 space-y-2.5 text-xs">
          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 font-medium leading-snug">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Existem <strong className="text-slate-900 dark:text-white font-bold">{pendingFichas.length}</strong> ficha(s) registada(s) há mais de 48 horas a aguardar validação ou aprovação.
            </span>
          </div>

          {oldest && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Ficha #{oldest.id}</span>
                </span>
                <span className="font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  há ~{oldestHours} horas
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 truncate">
                Coordenação: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{oldest.coordNome}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400 truncate">
                Mobilizador: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{oldest.mobilizador}</strong> ({oldest.bairro})
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Fechar
          </button>
          <button
            onClick={onViewPending}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition active:scale-95"
            id="btn-alert-view-pending"
          >
            <span>Ver Fichas Pendentes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

