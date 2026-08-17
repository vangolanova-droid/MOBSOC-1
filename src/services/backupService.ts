import { Ficha, Mobilizador, User, Coordination, CasoPFA, FichaRumor, ODKSubmission, AuditLog, CoordinationGoal, PortalPost } from '../types';
import { fsGetFichas, fsGetMobilizadores, fsGetUsers, fsGetCoordenacoes, fsGetCasosPFA, fsGetRumores, fsGetOdkSubmissions, fsGetAuditLogs } from './firebaseService';

export interface FirestoreBackupPayload {
  version: string;
  timestamp: string;
  source: string;
  databaseId: string;
  stats: {
    totalFichas: number;
    totalMobilizadores: number;
    totalCasosPFA: number;
    totalRumores: number;
    totalCoordenacoes: number;
    totalUsers: number;
    totalOdkSubmissions: number;
    totalAuditLogs: number;
  };
  data: {
    fichas: Ficha[];
    mobilizadores: Mobilizador[];
    casosPFA: CasoPFA[];
    rumores: FichaRumor[];
    coordenacoes: Coordination[];
    users: Partial<User>[];
    odkSubmissions: ODKSubmission[];
    auditLogs: AuditLog[];
  };
}

export interface AutoBackupConfig {
  enabled: boolean;
  intervalMinutes: number; // e.g. 30, 60, 120, 360
  lastBackupTime: string | null;
  lastBackupStatus: 'success' | 'failed' | 'idle';
  lastBackupRecordCount: number;
  autoDownloadOnSchedule: boolean;
}

const BACKUP_CONFIG_KEY = 'sirdm_auto_backup_config_v1';
const BACKUP_LOCAL_CACHE_KEY = 'sirdm_last_firestore_backup_snapshot';

export const DEFAULT_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  intervalMinutes: 60, // A cada 60 minutos
  lastBackupTime: null,
  lastBackupStatus: 'idle',
  lastBackupRecordCount: 0,
  autoDownloadOnSchedule: true,
};

export function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (!raw) return DEFAULT_BACKUP_CONFIG;
    return { ...DEFAULT_BACKUP_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Erro ao carregar configuração de backup:', err);
    return DEFAULT_BACKUP_CONFIG;
  }
}

export function saveAutoBackupConfig(config: AutoBackupConfig): void {
  try {
    localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Erro ao gravar configuração de backup:', err);
  }
}

export function getCachedBackupSnapshot(): FirestoreBackupPayload | null {
  try {
    const raw = localStorage.getItem(BACKUP_LOCAL_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Erro ao carregar snapshot local:', err);
    return null;
  }
}

/**
 * Cria o payload completo com dados em tempo real do Firestore ou da memória atual
 */
export async function generateFirestoreBackupPayload(memoryData?: {
  fichas?: Ficha[];
  mobilizadores?: Mobilizador[];
  casosPFA?: CasoPFA[];
  rumores?: FichaRumor[];
  coordenacoes?: Coordination[];
  users?: User[];
  odkSubmissions?: ODKSubmission[];
  auditLogs?: AuditLog[];
}): Promise<FirestoreBackupPayload> {
  // Se dados de memória foram providenciados e estão preenchidos, usa-os; caso contrário consulta o Firestore diretamente
  let fichas = memoryData?.fichas || [];
  let mobilizadores = memoryData?.mobilizadores || [];
  let casosPFA = memoryData?.casosPFA || [];
  let rumores = memoryData?.rumores || [];
  let coordenacoes = memoryData?.coordenacoes || [];
  let users = memoryData?.users || [];
  let odkSubmissions = memoryData?.odkSubmissions || [];
  let auditLogs = memoryData?.auditLogs || [];

  try {
    if (fichas.length === 0) fichas = await fsGetFichas();
    if (mobilizadores.length === 0) mobilizadores = await fsGetMobilizadores();
    if (casosPFA.length === 0) casosPFA = await fsGetCasosPFA();
    if (rumores.length === 0) rumores = await fsGetRumores();
    if (coordenacoes.length === 0) coordenacoes = await fsGetCoordenacoes();
    if (users.length === 0) users = await fsGetUsers();
    if (odkSubmissions.length === 0) odkSubmissions = await fsGetOdkSubmissions();
    if (auditLogs.length === 0) auditLogs = await fsGetAuditLogs();
  } catch (err) {
    console.warn('Aviso durante a leitura do Firestore para backup:', err);
  }

  // Sanitizar senhas de utilizadores por segurança no ficheiro de exportação
  const safeUsers = users.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    tipo: u.tipo,
    status: u.status,
    coordId: u.coordId,
    coordNome: u.coordNome,
  }));

  const payload: FirestoreBackupPayload = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: 'SirDm Angola - Sistema Integrado de Mobilização Social',
    databaseId: 'ai-studio-remixremixremixs-3364589c-87d9-4aa7-bfda-18c3eab160bb',
    stats: {
      totalFichas: fichas.length,
      totalMobilizadores: mobilizadores.length,
      totalCasosPFA: casosPFA.length,
      totalRumores: rumores.length,
      totalCoordenacoes: coordenacoes.length,
      totalUsers: users.length,
      totalOdkSubmissions: odkSubmissions.length,
      totalAuditLogs: auditLogs.length,
    },
    data: {
      fichas,
      mobilizadores,
      casosPFA,
      rumores,
      coordenacoes,
      users: safeUsers,
      odkSubmissions,
      auditLogs,
    },
  };

  // Salva cópia de redundância segura no localStorage
  try {
    localStorage.setItem(BACKUP_LOCAL_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Não foi possível salvar snapshot completo no localStorage (tamanho excedido):', err);
  }

  return payload;
}

/**
 * Faz download de um ficheiro JSON local no navegador
 */
export function downloadBackupJSON(payload: FirestoreBackupPayload, customName?: string): void {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = customName || `backup_sirdm_firestore_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
