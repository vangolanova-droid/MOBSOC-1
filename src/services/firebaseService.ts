import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AuditLog, Coordination, CoordinationGoal, Ficha, Mobilizador, User, ODKSubmission } from '../types';
import {
  INITIAL_COORDINATIONS,
  INITIAL_FICHAS,
  INITIAL_MOBILIZADORES,
  INITIAL_USERS,
  INITIAL_ODK_SUBMISSIONS,
} from '../data/initialData';

// Firestore collection names
const COLS = {
  COORDINATIONS: 'coordenacoes',
  USERS: 'users',
  MOBILIZADORES: 'mobilizadores',
  FICHAS: 'fichas',
  AUDIT_LOGS: 'audit_logs',
  GOALS: 'goals',
  SYSTEM_CONFIG: 'system_config',
  ADMIN_MESSAGES: 'admin_messages',
  ODK_SUBMISSIONS: 'odk_submissions',
};

const META_DOC = doc(db, 'system_metadata', 'initial_seed');
const NOTEPAD_DOC = doc(db, COLS.SYSTEM_CONFIG, 'admin_notepad');
const ALERTS_DOC = doc(db, COLS.SYSTEM_CONFIG, 'admin_alerts');
const PAYMENTS_DOC = doc(db, COLS.SYSTEM_CONFIG, 'payment_statuses');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Remove undefined values to prevent Firestore setDoc/updateDoc runtime exceptions
function cleanData<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

let initialized = false;

// Initialize & seed Firestore ONCE if empty
export async function initFirestoreDatabase(): Promise<void> {
  if (initialized) return;
  try {
    const metaSnap = await getDoc(META_DOC);
    if (!metaSnap.exists()) {
      console.log('Primeira inicialização do Firestore: semeando dados iniciais...');

      const usersSnap = await getDocs(collection(db, COLS.USERS));
      if (usersSnap.empty) {
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, COLS.USERS, String(u.id)), cleanData(u));
        }
      }

      const coordSnap = await getDocs(collection(db, COLS.COORDINATIONS));
      if (coordSnap.empty) {
        for (const c of INITIAL_COORDINATIONS) {
          await setDoc(doc(db, COLS.COORDINATIONS, String(c.id)), cleanData(c));
        }
      }

      const mobSnap = await getDocs(collection(db, COLS.MOBILIZADORES));
      if (mobSnap.empty) {
        for (const m of INITIAL_MOBILIZADORES) {
          await setDoc(doc(db, COLS.MOBILIZADORES, String(m.id)), cleanData(m));
        }
      }

      const fichasSnap = await getDocs(collection(db, COLS.FICHAS));
      if (fichasSnap.empty) {
        for (const f of INITIAL_FICHAS) {
          await setDoc(doc(db, COLS.FICHAS, String(f.id)), cleanData(f));
        }
      }

      await setDoc(META_DOC, { seeded: true, timestamp: new Date().toISOString() });
    }
    initialized = true;
  } catch (err) {
    console.warn('Firestore seed/check warning:', err);
    handleFirestoreError(err, OperationType.GET, 'system_metadata/initial_seed');
  }
}

// Generic real-time subscription helper
export function fsSubscribeCollection<T>(
  colName: string,
  onData: (items: T[]) => void,
  sorter?: (a: T, b: T) => number
): () => void {
  const q = collection(db, colName);
  return onSnapshot(
    q,
    (snap) => {
      const items: T[] = [];
      snap.forEach((d) => items.push(d.data() as T));
      if (sorter) items.sort(sorter);
      onData(items);
    },
    (err) => {
      console.warn(`Firestore subscription error on ${colName}:`, err);
      handleFirestoreError(err, OperationType.GET, colName);
    }
  );
}

// --- COORDENAÇÕES ---
export async function fsGetCoordenacoes(): Promise<Coordination[]> {
  await initFirestoreDatabase();
  const snap = await getDocs(collection(db, COLS.COORDINATIONS));
  const items: Coordination[] = [];
  snap.forEach((d) => items.push(d.data() as Coordination));
  return items.sort((a, b) => a.id - b.id);
}

export async function fsSaveCoordination(c: Coordination): Promise<Coordination> {
  const cleaned = cleanData(c);
  await setDoc(doc(db, COLS.COORDINATIONS, String(c.id)), cleaned);
  return c;
}

export async function fsDeleteCoordination(id: number): Promise<boolean> {
  await deleteDoc(doc(db, COLS.COORDINATIONS, String(id)));
  return true;
}

// --- USERS ---
export async function fsGetUsers(): Promise<User[]> {
  await initFirestoreDatabase();
  const snap = await getDocs(collection(db, COLS.USERS));
  const items: User[] = [];
  snap.forEach((d) => items.push(d.data() as User));
  return items.sort((a, b) => a.id - b.id);
}

export async function fsSaveUser(u: User): Promise<User> {
  const cleaned = cleanData(u);
  await setDoc(doc(db, COLS.USERS, String(u.id)), cleaned);
  return u;
}

export async function fsUpdateUser(id: number, fields: Partial<User>): Promise<void> {
  const cleaned = cleanData(fields);
  await updateDoc(doc(db, COLS.USERS, String(id)), cleaned);
}

export async function fsDeleteUser(id: number): Promise<boolean> {
  await deleteDoc(doc(db, COLS.USERS, String(id)));
  return true;
}

// --- MOBILIZADORES ---
export function generateMobilizadorCodigoId(index: number): string {
  const prefix = 'MT0022';
  const numStr = String(index + 1).padStart(2, '0');
  return `${prefix}${numStr}`;
}

export function getNextMobilizadorCodigoId(existingMobs: Mobilizador[]): string {
  const prefix = 'MT0022';
  let maxNum = 0;
  for (const m of existingMobs) {
    if (m.codigoId) {
      const match = m.codigoId.match(/MT0022(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : existingMobs.length + 1;
  return `${prefix}${String(nextNum).padStart(2, '0')}`;
}

export async function fsGetMobilizadores(): Promise<Mobilizador[]> {
  await initFirestoreDatabase();
  const snap = await getDocs(collection(db, COLS.MOBILIZADORES));
  const items: Mobilizador[] = [];
  snap.forEach((d) => items.push(d.data() as Mobilizador));
  items.sort((a, b) => a.id - b.id);

  // Ensure every mobilizador has a valid codigoId in Firestore
  let updatedAny = false;
  items.forEach((m, idx) => {
    if (!m.codigoId) {
      m.codigoId = generateMobilizadorCodigoId(idx);
      updatedAny = true;
      // Sync update to Firebase in background
      updateDoc(doc(db, COLS.MOBILIZADORES, String(m.id)), { codigoId: m.codigoId }).catch((err) =>
        console.warn('Error updating mobilizador codigoId in Firebase:', err)
      );
    }
  });

  return items;
}

export async function fsSaveMobilizador(m: Mobilizador): Promise<Mobilizador> {
  const cleaned = cleanData(m);
  await setDoc(doc(db, COLS.MOBILIZADORES, String(m.id)), cleaned);
  return m;
}

export async function fsDeleteMobilizador(id: number): Promise<boolean> {
  await deleteDoc(doc(db, COLS.MOBILIZADORES, String(id)));
  return true;
}

// --- FICHAS ---
export async function fsGetFichas(): Promise<Ficha[]> {
  await initFirestoreDatabase();
  const snap = await getDocs(collection(db, COLS.FICHAS));
  const items: Ficha[] = [];
  snap.forEach((d) => items.push(d.data() as Ficha));
  return items.sort((a, b) => Number(b.id) - Number(a.id));
}

export async function fsSaveFicha(f: Ficha): Promise<Ficha> {
  const cleaned = cleanData(f);
  await setDoc(doc(db, COLS.FICHAS, String(f.id)), cleaned);
  return f;
}

export async function fsDeleteFicha(id: number): Promise<boolean> {
  await deleteDoc(doc(db, COLS.FICHAS, String(id)));
  return true;
}

// --- AUDIT LOGS ---
export async function fsGetAuditLogs(): Promise<AuditLog[]> {
  await initFirestoreDatabase();
  const snap = await getDocs(collection(db, COLS.AUDIT_LOGS));
  const items: AuditLog[] = [];
  snap.forEach((d) => items.push(d.data() as AuditLog));
  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function fsAddAuditLog(log: AuditLog): Promise<void> {
  const cleaned = cleanData(log);
  await setDoc(doc(db, COLS.AUDIT_LOGS, String(log.id)), cleaned);
}

// --- GOALS ---
export async function fsGetGoals(): Promise<CoordinationGoal[]> {
  await initFirestoreDatabase();
  const snap = await getDocs(collection(db, COLS.GOALS));
  const items: CoordinationGoal[] = [];
  snap.forEach((d) => items.push(d.data() as CoordinationGoal));
  if (items.length === 0) {
    const defaults: CoordinationGoal[] = [
      { coordId: 1, targetPessoas: 5000, targetLocais: 200, targetFichas: 80 },
      { coordId: 2, targetPessoas: 4000, targetLocais: 150, targetFichas: 60 },
      { coordId: 3, targetPessoas: 3500, targetLocais: 120, targetFichas: 50 },
    ];
    for (const g of defaults) {
      await setDoc(doc(db, COLS.GOALS, String(g.coordId)), cleanData(g));
    }
    return defaults;
  }
  return items;
}

export async function fsSaveGoal(goal: CoordinationGoal): Promise<void> {
  await setDoc(doc(db, COLS.GOALS, String(goal.coordId)), cleanData(goal));
}

// --- NOTEPAD ---
export async function fsGetNotepad(): Promise<string | null> {
  try {
    const snap = await getDoc(NOTEPAD_DOC);
    return snap.exists() ? (snap.data().text as string) : null;
  } catch (err) {
    console.warn('fsGetNotepad error:', err);
    return null;
  }
}

export async function fsSaveNotepad(text: string): Promise<void> {
  await setDoc(NOTEPAD_DOC, { text, updatedAt: new Date().toISOString() });
}

// --- ADMIN MESSAGES & ALERTS ---
export async function fsGetAdminAlerts(): Promise<Record<string, boolean>> {
  try {
    const snap = await getDoc(ALERTS_DOC);
    return snap.exists() ? (snap.data().alerts as Record<string, boolean>) : {};
  } catch (err) {
    console.warn('fsGetAdminAlerts error:', err);
    return {};
  }
}

export async function fsSaveAdminAlerts(alerts: Record<string, boolean>): Promise<void> {
  await setDoc(ALERTS_DOC, { alerts, updatedAt: new Date().toISOString() });
}

export async function fsGetAdminMessages(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, COLS.ADMIN_MESSAGES));
    const items: any[] = [];
    snap.forEach((d) => items.push(d.data()));
    return items.sort((a, b) => b.id - a.id);
  } catch (err) {
    console.warn('fsGetAdminMessages error:', err);
    return [];
  }
}

export async function fsAddAdminMessage(msg: any): Promise<void> {
  await setDoc(doc(db, COLS.ADMIN_MESSAGES, String(msg.id)), cleanData(msg));
}

// --- PAYMENT STATUSES ---
export async function fsGetPaymentStatuses(): Promise<Record<number, 'pendente' | 'pago'>> {
  try {
    const snap = await getDoc(PAYMENTS_DOC);
    return snap.exists() ? (snap.data().statuses as Record<number, 'pendente' | 'pago'>) : {};
  } catch (err) {
    console.warn('fsGetPaymentStatuses error:', err);
    return {};
  }
}

export async function fsSavePaymentStatuses(statuses: Record<number, 'pendente' | 'pago'>): Promise<void> {
  await setDoc(PAYMENTS_DOC, { statuses, updatedAt: new Date().toISOString() });
}

// --- ODK COLLECT SUBMISSIONS ---
export async function fsGetOdkSubmissions(): Promise<ODKSubmission[]> {
  try {
    const snap = await getDocs(collection(db, COLS.ODK_SUBMISSIONS));
    if (snap.empty) {
      // Seed initial sample ODK submissions
      for (const item of INITIAL_ODK_SUBMISSIONS) {
        await setDoc(doc(db, COLS.ODK_SUBMISSIONS, String(item.id)), cleanData(item));
      }
      return INITIAL_ODK_SUBMISSIONS as ODKSubmission[];
    }
    return snap.docs.map((d) => d.data() as ODKSubmission);
  } catch (err) {
    console.warn('fsGetOdkSubmissions fallback:', err);
    return INITIAL_ODK_SUBMISSIONS as ODKSubmission[];
  }
}

export async function fsSaveOdkSubmission(sub: ODKSubmission): Promise<void> {
  await setDoc(doc(db, COLS.ODK_SUBMISSIONS, String(sub.id)), cleanData(sub));
}

export async function fsUpdateOdkSubmission(id: string, fields: Partial<ODKSubmission>): Promise<void> {
  await updateDoc(doc(db, COLS.ODK_SUBMISSIONS, String(id)), cleanData(fields));
}

export async function fsDeleteOdkSubmission(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.ODK_SUBMISSIONS, String(id)));
}

// --- CLEAR ALL TEST DATA FROM FIREBASE DATABASE ---

export async function fsClearAllTestData(): Promise<void> {
  // Clear all fichas collection in Firestore
  const fichasSnap = await getDocs(collection(db, COLS.FICHAS));
  for (const docSnap of fichasSnap.docs) {
    await deleteDoc(docSnap.ref);
  }

  // Clear all mobilizadores collection in Firestore
  const mobSnap = await getDocs(collection(db, COLS.MOBILIZADORES));
  for (const docSnap of mobSnap.docs) {
    await deleteDoc(docSnap.ref);
  }

  // Clear audit logs in Firestore
  const auditSnap = await getDocs(collection(db, COLS.AUDIT_LOGS));
  for (const docSnap of auditSnap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

