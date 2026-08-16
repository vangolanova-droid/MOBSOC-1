import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { SyncState } from '../types';
import { subscribeSyncState, syncNow } from '../services/syncService';

export const SyncStatusIndicator: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    pendingCount: 0,
    isSyncing: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncAt: null,
    lastError: null,
  });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newState) => {
      setSyncState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!syncState.isSyncing) {
      syncNow();
    }
  };

  // 1. Estado: A Sincronizar
  if (syncState.isSyncing) {
    return (
      <div className="relative inline-block">
        <button
          onClick={handleManualSync}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition shadow-xs cursor-pointer"
          title="A sincronizar fichas com o servidor..."
          id="btn-sync-syncing"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400" />
          <span className="hidden sm:inline">A sincronizar...</span>
          {syncState.pendingCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100">
              {syncState.pendingCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // 2. Estado: Fichas Pendentes na fila offline
  if (syncState.pendingCount > 0) {
    return (
      <div className="relative inline-block">
        <button
          onClick={handleManualSync}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-xs cursor-pointer"
          title="Clique para forçar o envio das fichas pendentes"
          id="btn-sync-pending"
        >
          <Cloud className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
          <span>{syncState.pendingCount} {syncState.pendingCount === 1 ? 'pendente' : 'pendentes'}</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </button>

        {showTooltip && (
          <div className="absolute right-0 mt-1 z-50 w-56 rounded-lg bg-slate-900 text-white p-2 text-[11px] shadow-lg border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95">
            <p className="font-semibold text-amber-300">Modo Offline Ativo</p>
            <p className="text-slate-300 mt-0.5">
              {syncState.pendingCount} {syncState.pendingCount === 1 ? 'ficha guardada' : 'fichas guardadas'} no dispositivo. Clique para forçar o envio.
            </p>
            {syncState.lastError && (
              <p className="text-red-400 mt-1 text-[10px] truncate">
                Nota: {syncState.lastError}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. Estado: Sem Ligação à Internet (Offline)
  if (!syncState.isOnline) {
    return (
      <div className="relative inline-block">
        <button
          onClick={handleManualSync}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition shadow-xs cursor-pointer"
          title="Dispositivo sem internet. Os dados ficam guardados localmente com segurança."
          id="btn-sync-offline"
        >
          <CloudOff className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Offline</span>
        </button>
      </div>
    );
  }

  // 4. Estado: Conectado e Sincronizado (Neutro / Discreto)
  return (
    <div className="relative inline-block">
      <button
        onClick={handleManualSync}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 hover:bg-emerald-100/70 transition shadow-xs cursor-pointer"
        title={syncState.lastSyncAt ? `Sincronizado (${new Date(syncState.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) - Clique para verificar` : 'Sincronizado - Clique para verificar'}
        id="btn-sync-online"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden md:inline text-[11px]">Sincronizado</span>
      </button>
    </div>
  );
};
