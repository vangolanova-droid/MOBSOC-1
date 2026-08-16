import { Ficha, QueuedFicha, User } from '../types';

const DB_NAME = 'sismob_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'queued_fichas';

/**
 * Abre a conexão ao IndexedDB do SisMob.
 * O IndexedDB é ideal para mobilizadores de campo pois é assíncrono e não tem limite de 5MB do localStorage.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Adiciona uma ficha à fila local do IndexedDB.
 */
export async function enqueueFicha(
  ficha: Ficha,
  currentUser?: User | null
): Promise<QueuedFicha> {
  const db = await openDB();
  const localId = ficha.localId || `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const queuedItem: QueuedFicha = {
    localId,
    ficha: {
      ...ficha,
      id: ficha.id || Date.now(),
      syncStatus: 'pending',
      localId,
    },
    currentUser: currentUser
      ? {
          id: currentUser.id,
          nome: currentUser.nome,
          email: currentUser.email,
          tipo: currentUser.tipo,
          coordId: currentUser.coordId,
          coordNome: currentUser.coordNome,
          senha: '',
        }
      : null,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(queuedItem);

    req.onsuccess = () => resolve(queuedItem);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lista todas as fichas atualmente na fila pendente.
 */
export async function listQueuedFichas(): Promise<QueuedFicha[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result as QueuedFicha[];
        // Ordenar da mais antiga para a mais recente (FIFO para sincronização sequencial correta)
        items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Erro ao listar fila IndexedDB:', err);
    return [];
  }
}

/**
 * Remove uma ficha da fila após ter sido sincronizada com o servidor/Firestore.
 */
export async function removeFromQueue(localId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Atualiza os metadados de uma ficha na fila (ex: número de tentativas, última mensagem de erro).
 */
export async function updateQueuedFicha(item: QueuedFicha): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retorna a contagem atual de fichas na fila pendente.
 */
export async function queueCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}
