import { Ficha, SyncState } from '../types';
import {
  listQueuedFichas,
  removeFromQueue,
  updateQueuedFicha,
  queueCount,
} from './offlineQueue';
import { fsSaveFicha, fsSaveCasoPFA } from './firebaseService';

type SyncStateListener = (state: SyncState) => void;
type FichaSyncedListener = (ficha: Ficha, localId: string) => void;

let currentState: SyncState = {
  pendingCount: 0,
  isSyncing: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncAt: null,
  lastError: null,
};

const stateListeners = new Set<SyncStateListener>();
const fichaSyncedListeners = new Set<FichaSyncedListener>();
let isServiceInitialized = false;
let syncIntervalId: any = null;

function notifyState() {
  stateListeners.forEach((listener) => {
    try {
      listener({ ...currentState });
    } catch (err) {
      console.warn('[SyncService] Erro no listener de estado:', err);
    }
  });
}

function notifyFichaSynced(ficha: Ficha, localId: string) {
  fichaSyncedListeners.forEach((listener) => {
    try {
      listener(ficha, localId);
    } catch (err) {
      console.warn('[SyncService] Erro no listener de ficha sincronizada:', err);
    }
  });
}

/**
 * Avalia se o erro ocorrido é derivado de falta de conectividade,
 * lentidão extrema (timeout de campo 2G/3G) ou instabilidade de rede.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (!error) return false;

  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const name = error instanceof Error ? error.name : '';

  return (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('servidor inacessível') ||
    msg.includes('econnrefused') ||
    msg.includes('internet')
  );
}

/**
 * Tenta sincronizar todas as fichas pendentes da fila local IndexedDB com o backend/Firestore.
 */
export async function syncNow(): Promise<void> {
  if (currentState.isSyncing) {
    return;
  }

  // Atualizar contagem antes de sincronizar
  const count = await queueCount();
  currentState.pendingCount = count;
  currentState.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (count === 0) {
    notifyState();
    return;
  }

  // Se o navegador reporta sem rede, não gasta recursos
  if (!currentState.isOnline) {
    notifyState();
    return;
  }

  currentState.isSyncing = true;
  currentState.lastError = null;
  notifyState();

  try {
    const queuedItems = await listQueuedFichas();

    for (const item of queuedItems) {
      // Backoff: se um item falhou 3 ou mais vezes por erro estrutural de dados, salta para não travar a fila
      if (item.attempts >= 3 && !isNetworkError(item.lastError)) {
        continue;
      }

      try {
        const fichaToSend: Ficha = {
          ...item.ficha,
          syncStatus: 'synced',
        };

        // 1. Tenta sincronizar com o backend via API ou Firestore
        let savedFicha: Ficha;
        try {
          // Timeout rápido de 8 segundos por item para não prender em conexões zumbi
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const res = await fetch('/api/fichas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fichaToSend),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            savedFicha = await res.json();
          } else {
            // Se API Express falhar, tenta gravar diretamente no Firestore como redundância
            savedFicha = await fsSaveFicha(fichaToSend);
          }
        } catch {
          // Fallback para Firestore com salvaguarda
          savedFicha = await fsSaveFicha(fichaToSend);
        }

        // 2. Se houver casos de PFA anexados, sincroniza-os
        if (item.ficha.pfaCasos && item.ficha.pfaCasos.length > 0) {
          for (const caso of item.ficha.pfaCasos) {
            try {
              await fsSaveCasoPFA({ ...caso, fichaId: savedFicha.id });
            } catch (pfaErr) {
              console.warn('[SyncService] Erro ao sincronizar caso PFA anexo:', pfaErr);
            }
          }
        }

        // 3. Sucesso: remove da fila local e avisa a aplicação
        await removeFromQueue(item.localId);
        notifyFichaSynced(savedFicha, item.localId);
      } catch (err: any) {
        console.warn(`[SyncService] Falha ao sincronizar ficha ${item.localId}:`, err);
        const netErr = isNetworkError(err);
        
        item.attempts += 1;
        item.lastError = err?.message || 'Erro de sincronização';
        await updateQueuedFicha(item);

        if (netErr) {
          currentState.isOnline = false;
          currentState.lastError = 'Ligação à internet instável ou indisponível.';
          // Se é erro de rede, interrompe a sincronização dos próximos para poupar bateria e dados
          break;
        } else if (item.attempts >= 3) {
          currentState.lastError = `Ficha de "${item.ficha.bairro}" falhou 3 tentativas (${item.lastError}).`;
        }
      }
    }
  } catch (globalErr: any) {
    currentState.lastError = globalErr?.message || 'Erro inesperado na sincronização.';
  } finally {
    currentState.isSyncing = false;
    currentState.pendingCount = await queueCount();
    currentState.lastSyncAt = new Date().toISOString();
    notifyState();
  }
}

/**
 * Subscreve às mudanças de estado da sincronização (pendentes, a sincronizar, online/offline).
 */
export function subscribeSyncState(listener: SyncStateListener): () => void {
  stateListeners.add(listener);
  // Notifica imediatamente o estado atual
  listener({ ...currentState });

  // Atualiza a contagem inicial
  queueCount().then((count) => {
    if (currentState.pendingCount !== count) {
      currentState.pendingCount = count;
      listener({ ...currentState });
    }
  });

  return () => {
    stateListeners.delete(listener);
  };
}

/**
 * Subscreve à notificação de quando uma ficha em fila é sincronizada com êxito.
 */
export function subscribeFichaSynced(listener: FichaSyncedListener): () => void {
  fichaSyncedListeners.add(listener);
  return () => {
    fichaSyncedListeners.delete(listener);
  };
}

/**
 * Inicializa os ouvintes de rede (online/offline) e o ciclo periódico de sincronização (a cada 20s).
 */
export function initSyncService(): () => void {
  if (isServiceInitialized) {
    return () => {};
  }
  isServiceInitialized = true;

  const handleOnline = () => {
    currentState.isOnline = true;
    notifyState();
    // Ao recuperar a ligação, dispara sincronização imediata
    syncNow();
  };

  const handleOffline = () => {
    currentState.isOnline = false;
    notifyState();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Atualiza a contagem inicial
  queueCount().then((count) => {
    currentState.pendingCount = count;
    notifyState();
    if (count > 0 && navigator.onLine) {
      syncNow();
    }
  });

  // Polling a cada 20 segundos
  syncIntervalId = setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      queueCount().then((count) => {
        currentState.pendingCount = count;
        if (count > 0 && !currentState.isSyncing) {
          syncNow();
        } else {
          notifyState();
        }
      });
    }
  }, 20000);

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
    }
    isServiceInitialized = false;
  };
}
