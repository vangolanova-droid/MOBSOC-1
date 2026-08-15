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
import { AuditLog, Coordination, CoordinationGoal, Ficha, Mobilizador, User, ODKSubmission, PortalPost, CasoPFA, FichaRumor } from '../types';
import {
  INITIAL_COORDINATIONS,
  INITIAL_FICHAS,
  INITIAL_MOBILIZADORES,
  INITIAL_USERS,
  INITIAL_ODK_SUBMISSIONS,
  INITIAL_CASOS_PFA,
  INITIAL_RUMORES,
} from '../data/initialData';

import imgJangoSoba from '../assets/images/jango_soba_leader_1786566209375.jpg';
import imgKawasaki from '../assets/images/kawasaki_poster_mob_1786566220696.jpg';
import imgUnicefSoba from '../assets/images/unicef_soba_alliance_1786566232234.jpg';
import imgPolioPosters from '../assets/images/polio_posters_display_1786566243075.jpg';
import imgMothersJango from '../assets/images/mothers_jango_meeting_1786566253317.jpg';
import imgFieldBriefing from '../assets/images/field_team_briefing_1786566265107.jpg';
import imgBrigadeGroup from '../assets/images/brigade_group_jango_1786566275166.jpg';
import imgRegistrationDesk from '../assets/images/registration_desk_field_1786566285057.jpg';

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
  PORTAL_POSTS: 'portal_posts',
  CASOS_PFA: 'casos_pfa',
  RUMORES: 'rumores',
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
    // ALWAYS force update doc '1' in Firestore with the current Admin credentials
    try {
      await setDoc(doc(db, COLS.USERS, '1'), cleanData(INITIAL_USERS[0]));
    } catch (e) {
      console.warn('Could not force update admin doc 1:', e);
    }

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

      const odkSnap = await getDocs(collection(db, COLS.ODK_SUBMISSIONS));
      if (odkSnap.empty) {
        for (const item of INITIAL_ODK_SUBMISSIONS) {
          await setDoc(doc(db, COLS.ODK_SUBMISSIONS, String(item.id)), cleanData(item));
        }
      }

      const portalSnap = await getDocs(collection(db, COLS.PORTAL_POSTS));
      if (portalSnap.empty) {
        for (const p of DEFAULT_PORTAL_POSTS) {
          await setDoc(doc(db, COLS.PORTAL_POSTS, p.id), cleanData(p));
        }
      }

      const pfaSnap = await getDocs(collection(db, COLS.CASOS_PFA));
      if (pfaSnap.empty) {
        for (const pfa of INITIAL_CASOS_PFA) {
          await setDoc(doc(db, COLS.CASOS_PFA, pfa.id), cleanData(pfa));
        }
      }

      const rumoresSnap = await getDocs(collection(db, COLS.RUMORES));
      if (rumoresSnap.empty) {
        for (const rum of INITIAL_RUMORES) {
          await setDoc(doc(db, COLS.RUMORES, rum.id), cleanData(rum));
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

  // Auto-sync Administrator credentials to ensure latest configuration
  const adminIndex = items.findIndex((u) => u.id === 1 || u.tipo === 'admin');
  if (adminIndex !== -1) {
    const admin = items[adminIndex];
    if (
      admin.email !== 'v.angola.nova@gmail.com' ||
      admin.nome !== 'ANDRÉ BUMBA DE MELO' ||
      admin.senha !== 'Andre2021' ||
      admin.telefone !== '923591571'
    ) {
      const updatedAdmin: User = {
        ...admin,
        nome: 'ANDRÉ BUMBA DE MELO',
        email: 'v.angola.nova@gmail.com',
        senha: 'Andre2021',
        telefone: '923591571',
      };
      items[adminIndex] = updatedAdmin;
      try {
        await setDoc(doc(db, COLS.USERS, String(admin.id)), cleanData(updatedAdmin));
      } catch (e) {
        console.warn('Could not auto-sync admin doc to firestore:', e);
      }
    }
  }

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
  snap.forEach((d) => {
    const data = d.data() as Mobilizador;
    if (!data.ronda) {
      data.ronda = '1ª Ronda';
    }
    items.push(data);
  });
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
    await initFirestoreDatabase();
    const snap = await getDocs(collection(db, COLS.ODK_SUBMISSIONS));
    return snap.docs.map((d) => d.data() as ODKSubmission);
  } catch (err) {
    console.warn('fsGetOdkSubmissions error:', err);
    return [];
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

// --- PORTAL POSTS / NEWS ---
const DEFAULT_PORTAL_POSTS: PortalPost[] = [
  {
    id: 'post-1',
    titulo: 'A Sabedoria Tradicional ao Serviço da Saúde Pública',
    subtitulo: 'Jango Mbumba Kupuco • Tambo do Soba',
    conteudo: 'Sobas e autoridades tradicionais reunidos no Tambo do Soba, ouvindo com extrema atenção o plano de vacinação. O envolvimento da liderança comunitária é a chave indispensável para romper a hesitação e garantir a proteção de todas as crianças contra a pólio.',
    categoria: 'Liderança Tradicional',
    data: new Date().toISOString().split('T')[0],
    autor: 'Mobilização Social Sumbe',
    destaque: true,
    imagemUrl: imgJangoSoba,
    lemaInstitucional: 'Para Cada Criança, Imunização & Vida Saudável',
    createdAt: new Date(Date.now() - 1000).toISOString(),
  },
  {
    id: 'post-2',
    titulo: 'Mobilidade e Proximidade: Nenhuma Comunidade Fica para Trás',
    subtitulo: 'Bairro Mbumba Kupuco • Rota Periférica',
    conteudo: 'Equipas de mobilizadoras e técnicos de saúde em prontidão com o veículo motorizado de transporte (Kawaseki), equipados com cartazes oficiais da Campanha Nacional de Vacinação contra a Pólio para cobrir bairros de difícil acesso.',
    categoria: 'Logística de Campo',
    data: new Date().toISOString().split('T')[0],
    autor: 'Equipa Logística SirDm',
    destaque: true,
    imagemUrl: imgKawasaki,
    createdAt: new Date(Date.now() - 2000).toISOString(),
  },
  {
    id: 'post-3',
    titulo: 'Aliança Histórica pela Proteção das Crianças do Sumbe',
    subtitulo: 'Sobado Mbumba Kupuco • Abertura da Campanha',
    conteudo: 'Representantes do Ministério da Saúde, especialistas do UNICEF em t-shirts azuis e autoridades tradicionais uniformizadas unidos sob o pórtico do Jango Comunitário, selando o compromisso conjunto de vacinar 100% dos menores de 5 anos.',
    categoria: 'Parceria Estratégica',
    data: new Date().toISOString().split('T')[0],
    autor: 'Direção de Saúde & UNICEF',
    destaque: true,
    imagemUrl: imgUnicefSoba,
    createdAt: new Date(Date.now() - 3000).toISOString(),
  },
  {
    id: 'post-4',
    titulo: 'Vozes Unidas: "Vamos Vacinar Todas as Crianças Menores de 5 Anos"',
    subtitulo: 'Campanha Nacional contra a Pólio',
    conteudo: 'Mobilizadores comunitários, enfermeiros e Sobas exibem orgulhosamente os panfletos e cartazes ilustrados da vacinação contra a pólio. A informação clara e transparente é o maior escudo preventivo das famílias angolanas.',
    categoria: 'Sensibilização Direta',
    data: new Date().toISOString().split('T')[0],
    autor: 'RH-MC Cuanza Sul',
    destaque: false,
    imagemUrl: imgPolioPosters,
    createdAt: new Date(Date.now() - 4000).toISOString(),
  },
  {
    id: 'post-5',
    titulo: 'O Protagonismo das Mães e Mobilizadoras no Coração do Bairro',
    subtitulo: 'Encontro Comunitário Sumbe',
    conteudo: 'Mães, parteiras tradicionais e mobilizadoras do Bairro Mbumba Kupuco reunidas com a equipa de saúde. O diálogo direto com as mulheres transforma a comunidade em guardiã ativa da imunização infantil.',
    categoria: 'Mobilização Social',
    data: new Date().toISOString().split('T')[0],
    autor: 'Coordenação de Saúde Comunitária',
    destaque: false,
    imagemUrl: imgMothersJango,
    createdAt: new Date(Date.now() - 5000).toISOString(),
  },
  {
    id: 'post-6',
    titulo: 'Preparação Rigorosa: Briefing de Pré-Campo com Supervisão',
    subtitulo: 'Tambo do Soba • Treino de Mobilizadores',
    conteudo: 'A supervisora de saúde coordena a roda de instrução e alinhamento das rotas de casa em casa. Cada mobilizador recebe orientações técnicas de preenchimento do ODK Collect e abordagem interpessoal empática.',
    categoria: 'Capacitação Técnica',
    data: new Date().toISOString().split('T')[0],
    autor: 'Supervisão Epidemiológica',
    destaque: false,
    imagemUrl: imgFieldBriefing,
    createdAt: new Date(Date.now() - 6000).toISOString(),
  },
  {
    id: 'post-7',
    titulo: 'Determinação e Foco: Equipa Unida por Cuanza Sul Livre da Pólio',
    subtitulo: 'Jango Comunitário do Sobado',
    conteudo: 'Dezenas de agentes de saúde, voluntários, enfermeiros e autoridades locais posam frente ao Jango Mbumba Kupuco após o lançamento bem-sucedido das rondas de imunização e sensibilização social.',
    categoria: 'Equipa de Campo',
    data: new Date().toISOString().split('T')[0],
    autor: 'Brigada Municipal do Sumbe',
    destaque: false,
    imagemUrl: imgBrigadeGroup,
    createdAt: new Date(Date.now() - 7000).toISOString(),
  },
  {
    id: 'post-8',
    titulo: 'Coordenação no Terreno: Validação e Distribuição de Insumos',
    subtitulo: 'Galeria do Sobado • Centro Operacional',
    conteudo: 'Técnicas de saúde e supervisoras organizam as fichas físicas e digitais de acompanhamento no posto fixo temporário dentro da Galeria do Soba, assegurando fluxo contínuo de dados para o SirDm.',
    categoria: 'Gestão & Controlo',
    data: new Date().toISOString().split('T')[0],
    autor: 'Posto Central de Registo',
    destaque: false,
    imagemUrl: imgRegistrationDesk,
    createdAt: new Date(Date.now() - 8000).toISOString(),
  },
  {
    id: 'post-9',
    titulo: 'Diálogo Transparente e Escuta Ativa para Superar Recusas',
    subtitulo: 'Jango Mbumba Kupuco • Resolução de Hesitação',
    conteudo: 'Abertura total ao debate em comunidade circular. Perguntas e mitos sobre as gotas de vacina oral contra a pólio são esclarecidos de forma científica, simples e respeitosa perante o Sobado.',
    categoria: 'Comunicação Interpessoal',
    data: new Date().toISOString().split('T')[0],
    autor: 'Equipa de Comunicação para o Desenvolvimento',
    destaque: false,
    imagemUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(Date.now() - 9000).toISOString(),
  },
];

export async function fsGetPortalPosts(): Promise<PortalPost[]> {
  try {
    await initFirestoreDatabase();
    const snap = await getDocs(collection(db, COLS.PORTAL_POSTS));
    const items: PortalPost[] = [];
    snap.forEach((d) => items.push(d.data() as PortalPost));
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.warn('fsGetPortalPosts error:', err);
    return [];
  }
}

export async function fsSavePortalPost(post: PortalPost): Promise<void> {
  await setDoc(doc(db, COLS.PORTAL_POSTS, post.id), cleanData(post));
}

export async function fsDeletePortalPost(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.PORTAL_POSTS, id));
}

// --- VIGILÂNCIA EPIDEMIOLÓGICA (CASOS DE PFA) ---
export async function fsGetCasosPFA(): Promise<CasoPFA[]> {
  try {
    await initFirestoreDatabase();
    const snap = await getDocs(collection(db, COLS.CASOS_PFA));
    const items: CasoPFA[] = [];
    snap.forEach((d) => items.push(d.data() as CasoPFA));
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.warn('fsGetCasosPFA error:', err);
    return [];
  }
}

export async function fsSaveCasoPFA(caso: CasoPFA): Promise<CasoPFA> {
  const cleaned = cleanData(caso);
  await setDoc(doc(db, COLS.CASOS_PFA, caso.id), cleaned);
  return caso;
}

export async function fsUpdateCasoPFA(id: string, fields: Partial<CasoPFA>): Promise<void> {
  const cleaned = cleanData(fields);
  await updateDoc(doc(db, COLS.CASOS_PFA, id), cleaned);
}

export async function fsDeleteCasoPFA(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.CASOS_PFA, id));
}

// --- FICHA DE GESTÃO DE RUMORES & COMUNICAÇÃO DE RISCO ---
export async function fsGetRumores(): Promise<FichaRumor[]> {
  try {
    await initFirestoreDatabase();
    const snap = await getDocs(collection(db, COLS.RUMORES));
    const items: FichaRumor[] = [];
    snap.forEach((d) => items.push(d.data() as FichaRumor));
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.warn('fsGetRumores error:', err);
    return [];
  }
}

export async function fsSaveRumor(rumor: FichaRumor): Promise<FichaRumor> {
  const cleaned = cleanData(rumor);
  await setDoc(doc(db, COLS.RUMORES, rumor.id), cleaned);
  return rumor;
}

export async function fsUpdateRumor(id: string, fields: Partial<FichaRumor>): Promise<void> {
  const cleaned = cleanData(fields);
  await updateDoc(doc(db, COLS.RUMORES, id), cleaned);
}

export async function fsDeleteRumor(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.RUMORES, id));
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

