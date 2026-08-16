import {
  AuditLog,
  Coordination,
  CoordinationGoal,
  Ficha,
  Mobilizador,
  User,
  ODKSubmission,
  CasoPFA,
  FichaRumor,
  PortalPost,
} from '../types';
import { enqueueFicha } from './offlineQueue';
import { isNetworkError } from './syncService';
import {
  INITIAL_COORDINATIONS,
  INITIAL_FICHAS,
  INITIAL_MOBILIZADORES,
  INITIAL_USERS,
  INITIAL_ODK_SUBMISSIONS,
  INITIAL_CASOS_PFA,
  INITIAL_RUMORES,
} from '../data/initialData';
import { fsDeleteFicha, fsDeleteMobilizador, fsDeleteCoordination } from './firebaseService';

// Token e Sessão Segura
const TOKEN_KEY = 'sismob_jwt_token';
const USER_KEY = 'sismob_current_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null, persist = true) {
  try {
    if (token) {
      if (persist) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // fallback
  }
}

export function getStoredUser(): User | null {
  try {
    const data = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null, persist = true) {
  try {
    if (user) {
      if (persist) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    } else {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    // fallback
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Erro na requisição (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

async function deleteResource(endpoint: string): Promise<{ success: boolean }> {
  try {
    return await request<{ success: boolean }>(endpoint, { method: 'DELETE' });
  } catch (err: any) {
    if (err.message && (err.message.includes('405') || err.message.includes('Method Not Allowed'))) {
      console.warn(`[SisMob API] 405 recebido para DELETE ${endpoint}. Tentando fallback POST ${endpoint}/delete...`);
      return await request<{ success: boolean }>(`${endpoint}/delete`, { method: 'POST' });
    }
    throw err;
  }
}

export const api = {
  // Verificação de Conectividade com o Servidor Express
  async checkServerHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // AUTENTICAÇÃO
  async login(email: string, senha: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });

    setStoredToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  async registerPublicSupervisor(userData: Partial<User>): Promise<User> {
    return await request<User>('/api/users/public-register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout() {
    setStoredToken(null);
    setStoredUser(null);
  },

  // SESSÃO
  getSessionUser(): number | null {
    const u = getStoredUser();
    return u ? u.id : null;
  },

  setSessionUser(id: number | null) {
    if (id === null) {
      this.logout();
    }
  },

  // COORDENAÇÕES
  async getCoordenacoes(): Promise<Coordination[]> {
    try {
      return await request<Coordination[]>('/api/coordenacoes');
    } catch (e) {
      console.warn('[SisMob API] Fallback para coordenações cached:', e);
      return INITIAL_COORDINATIONS;
    }
  },

  async createCoordination(
    nome: string,
    coordenador?: string,
    bairros?: string[],
    currentUser?: User | null
  ): Promise<Coordination> {
    const newCoord = await request<Coordination>('/api/coordenacoes', {
      method: 'POST',
      body: JSON.stringify({ nome, coordenador, bairros }),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Criação',
      entidade: 'Coordenação',
      detalhes: `Coordenação "${nome}" criada com coordenador "${coordenador || 'N/A'}".`,
    }).catch(console.warn);

    return newCoord;
  },

  async updateCoordination(
    id: number,
    fields: Partial<Coordination>,
    currentUser?: User | null
  ): Promise<Coordination> {
    const updated = await request<Coordination>(`/api/coordenacoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Coordenação',
      detalhes: `Coordenação "${updated.nome}" (ID #${id}) foi atualizada.`,
    }).catch(console.warn);

    return updated;
  },

  async deleteCoordination(id: number, currentUser?: User | null): Promise<boolean> {
    await deleteResource(`/api/coordenacoes/${id}`);
    await fsDeleteCoordination(id).catch(console.warn);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Coordenação',
      detalhes: `Coordenação ID #${id} foi eliminada do sistema.`,
    }).catch(console.warn);

    return true;
  },

  // UTILIZADORES
  async getUsers(): Promise<User[]> {
    try {
      return await request<User[]>('/api/users');
    } catch (e) {
      console.warn('[SisMob API] Fallback para utilizadores cached:', e);
      return INITIAL_USERS;
    }
  },

  async createUser(user: Partial<User>, currentUser?: User | null): Promise<User> {
    const newUser = await request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Criação',
      entidade: 'Utilizador',
      detalhes: `Utilizador "${newUser.nome}" (${newUser.email}, ${newUser.tipo}) criado.`,
    }).catch(console.warn);

    return newUser;
  },

  async updateUser(id: number, fields: Partial<User>, currentUser?: User | null): Promise<User> {
    const updated = await request<User>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Utilizador',
      detalhes: `Utilizador "${updated.nome}" (${updated.email}) atualizado.`,
    }).catch(console.warn);

    return updated;
  },

  async deleteUser(id: number | string, currentUser?: User | null): Promise<boolean> {
    await deleteResource(`/api/users/${id}`);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Utilizador',
      detalhes: `Utilizador ID #${id} eliminado.`,
    }).catch(console.warn);

    return true;
  },

  // MOBILIZADORES
  async getMobilizadores(): Promise<Mobilizador[]> {
    try {
      return await request<Mobilizador[]>('/api/mobilizadores');
    } catch (e) {
      console.warn('[SisMob API] Fallback para mobilizadores cached:', e);
      return INITIAL_MOBILIZADORES;
    }
  },

  async createMobilizador(mob: Partial<Mobilizador>, currentUser?: User | null): Promise<Mobilizador> {
    const newMob = await request<Mobilizador>('/api/mobilizadores', {
      method: 'POST',
      body: JSON.stringify(mob),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Criação',
      entidade: 'Mobilizador',
      detalhes: `Mobilizador "${newMob.nome}" (ID: ${newMob.codigoId}, ${newMob.coordNome}) criado.`,
    }).catch(console.warn);

    return newMob;
  },

  async updateMobilizador(
    id: number,
    fields: Partial<Mobilizador>,
    currentUser?: User | null
  ): Promise<Mobilizador> {
    const updated = await request<Mobilizador>(`/api/mobilizadores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Mobilizador',
      detalhes: `Mobilizador "${updated.nome}" (ID #${id}) atualizado.`,
    }).catch(console.warn);

    return updated;
  },

  async deleteMobilizador(id: number | string, currentUser?: User | null): Promise<boolean> {
    await deleteResource(`/api/mobilizadores/${id}`);
    await fsDeleteMobilizador(Number(id)).catch(console.warn);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Mobilizador',
      detalhes: `Mobilizador ID #${id} eliminado.`,
    }).catch(console.warn);

    return true;
  },

  // FICHAS DE CAMPO
  async getFichas(): Promise<Ficha[]> {
    try {
      return await request<Ficha[]>('/api/fichas');
    } catch (e) {
      console.warn('[SisMob API] Fallback para fichas cached:', e);
      return INITIAL_FICHAS;
    }
  },

  async createFicha(ficha: Partial<Ficha>, currentUser?: User | null): Promise<Ficha> {
    const fullFicha: Ficha = {
      id: ficha.id || Date.now(),
      provincia: ficha.provincia || 'Cuanza Sul',
      municipio: ficha.municipio || 'Sumbe',
      comuna: ficha.comuna || 'Sumbe',
      bairro: ficha.bairro || '',
      data: ficha.data || new Date().toISOString().split('T')[0],
      ronda: ficha.ronda || '1ª Ronda',
      mobilizador: ficha.mobilizador || '',
      mobilizadorId: ficha.mobilizadorId || null,
      mobilizadorCodigoId: ficha.mobilizadorCodigoId || '',
      telefone: ficha.telefone || '',
      numeroEquipa: ficha.numeroEquipa || '',
      coordId: ficha.coordId ?? null,
      coordNome: ficha.coordNome || '',
      coordenadorNome: ficha.coordenadorNome || '',
      userId: ficha.userId || currentUser?.id || 0,
      supervisorNome: ficha.supervisorNome || currentUser?.nome || '',
      tableData: ficha.tableData || {},
      totalLocais: ficha.totalLocais || 0,
      totalPessoas: ficha.totalPessoas || 0,
      sim: ficha.sim || 0,
      nao: ficha.nao || 0,
      motivo: ficha.motivo || '',
      pfaDetetado: ficha.pfaDetetado || false,
      pfaCasos: ficha.pfaCasos || [],
      createdAt: ficha.createdAt || new Date().toISOString(),
      status: ficha.status || 'aprovada',
      syncStatus: 'synced',
    };

    // 1. Se estiver completamente sem ligação à internet, vai diretamente para a fila offline (evita travar a UI)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queued = await enqueueFicha(fullFicha, currentUser);
      console.log('[SisMob Offline] Ficha guardada localmente em IndexedDB (sem internet):', queued.localId);
      return queued.ficha;
    }

    // 2. Se reporta online, tenta o envio com timeout de segurança (6s) para conexões de campo lentas
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/fichas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
        },
        body: JSON.stringify(fullFicha),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Erro na API do servidor (${res.status})`);
      }

      const created: Ficha = await res.json();
      const resultFicha: Ficha = {
        ...created,
        syncStatus: 'synced',
      };

      await this.addAuditLog({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        usuarioId: currentUser?.id || resultFicha.userId || 0,
        usuarioNome: currentUser?.nome || resultFicha.supervisorNome || resultFicha.mobilizador || 'Sistema',
        usuarioTipo: currentUser?.tipo || 'supervisor',
        acao: 'Criação',
        entidade: 'Ficha',
        detalhes: `Ficha criada para "${resultFicha.bairro}" (${resultFicha.totalPessoas} pessoas, ${resultFicha.ronda || '1ª Ronda'})`,
        fichaId: resultFicha.id,
      }).catch(console.warn);

      return resultFicha;
    } catch (err) {
      // 3. Em caso de falha de rede/timeout/servidor inacessível, cai em segurança para o IndexedDB
      if (isNetworkError(err)) {
        console.warn('[SisMob Offline] Falha de rede/timeout ao enviar ficha. A enfileirar no IndexedDB...');
        const queued = await enqueueFicha(fullFicha, currentUser);
        return queued.ficha;
      }
      // Se for outro erro, ainda assim protege os dados da criança/família guardando localmente
      console.warn('[SisMob Offline] Erro inesperado. A assegurar integridade dos dados no dispositivo...');
      const queued = await enqueueFicha(fullFicha, currentUser);
      return queued.ficha;
    }
  },

  async deleteFicha(id: number | string, currentUser?: User | null): Promise<boolean> {
    await deleteResource(`/api/fichas/${id}`);
    await fsDeleteFicha(Number(id)).catch(console.warn);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Ficha',
      detalhes: `Ficha ID #${id} foi eliminada do sistema.`,
      fichaId: Number(id),
    }).catch(console.warn);

    return true;
  },

  async updateFicha(id: number, fields: Partial<Ficha>, currentUser?: User | null): Promise<Ficha> {
    const updatedFicha = await request<Ficha>(`/api/fichas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Ficha',
      detalhes: `Ficha ID #${id} editada no bairro "${updatedFicha.bairro}".`,
      fichaId: id,
    }).catch(console.warn);

    return updatedFicha;
  },

  // CASOS DE VIGILÂNCIA EPIDEMIOLÓGICA (PFA)
  async getCasosPFA(): Promise<CasoPFA[]> {
    try {
      return await request<CasoPFA[]>('/api/casos-pfa');
    } catch (e) {
      console.warn('[SisMob API] Fallback para Casos PFA cached:', e);
      return INITIAL_CASOS_PFA;
    }
  },

  async createCasoPFA(caso: Partial<CasoPFA>, currentUser?: User | null): Promise<CasoPFA> {
    const newCaso = await request<CasoPFA>('/api/casos-pfa', {
      method: 'POST',
      body: JSON.stringify(caso),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Supervisor',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Criação',
      entidade: 'Caso PFA',
      detalhes: `Caso suspeito de PFA notificado: "${newCaso.nomeCrianca}" (ID: ${newCaso.id}, Bairro: ${newCaso.bairro})`,
    }).catch(console.warn);

    return newCaso;
  },

  async updateCasoPFA(id: string, fields: Partial<CasoPFA>, currentUser?: User | null): Promise<CasoPFA> {
    const updated = await request<CasoPFA>(`/api/casos-pfa/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Supervisor',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Edição',
      entidade: 'Caso PFA',
      detalhes: `Caso de PFA "${updated.nomeCrianca}" (ID: ${updated.id}) atualizado para status "${updated.statusNotificacao}".`,
    }).catch(console.warn);

    return updated;
  },

  async deleteCasoPFA(id: string, currentUser?: User | null): Promise<boolean> {
    await deleteResource(`/api/casos-pfa/${id}`);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Caso PFA',
      detalhes: `Caso de PFA ID "${id}" foi eliminado.`,
    }).catch(console.warn);

    return true;
  },

  // GESTÃO DE RUMORES & HESITAÇÃO VACINAL
  async getRumores(): Promise<FichaRumor[]> {
    try {
      return await request<FichaRumor[]>('/api/rumores');
    } catch (e) {
      console.warn('[SisMob API] Fallback para Rumores cached:', e);
      return INITIAL_RUMORES;
    }
  },

  async createRumor(rumor: Partial<FichaRumor>, currentUser?: User | null): Promise<FichaRumor> {
    const newRumor = await request<FichaRumor>('/api/rumores', {
      method: 'POST',
      body: JSON.stringify(rumor),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Supervisor',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Criação',
      entidade: 'Rumor',
      detalhes: `Novo rumor registado (${newRumor.categoriaRumor || 'Geral'}): "${(newRumor.rumor || '').slice(0, 50)}..."`,
    }).catch(console.warn);

    return newRumor;
  },

  async updateRumor(id: string, fields: Partial<FichaRumor>, currentUser?: User | null): Promise<FichaRumor> {
    const updated = await request<FichaRumor>(`/api/rumores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Supervisor',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Edição',
      entidade: 'Rumor',
      detalhes: `Rumor ID "${id}" atualizado para status "${updated.estado}".`,
    }).catch(console.warn);

    return updated;
  },

  async deleteRumor(id: string, currentUser?: User | null): Promise<boolean> {
    await deleteResource(`/api/rumores/${id}`);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Rumor',
      detalhes: `Rumor ID "${id}" eliminado.`,
    }).catch(console.warn);

    return true;
  },

  // SUBMISSÕES DO ODK COLLECT
  async getOdkSubmissions(): Promise<ODKSubmission[]> {
    try {
      return await request<ODKSubmission[]>('/api/odk-submissions');
    } catch (e) {
      console.warn('[SisMob API] Fallback para ODK Submissions cached:', e);
      return INITIAL_ODK_SUBMISSIONS;
    }
  },

  async createOdkSubmission(
    subData: Partial<ODKSubmission>,
    currentUser?: User | null
  ): Promise<ODKSubmission> {
    const newSub = await request<ODKSubmission>('/api/odk-submissions', {
      method: 'POST',
      body: JSON.stringify({
        ...subData,
        supervisorId: currentUser?.id || subData.supervisorId || 0,
        supervisorNome: currentUser?.nome || subData.supervisorNome || 'Supervisor',
        coordId: subData.coordId ?? currentUser?.coordId ?? null,
        coordNome: subData.coordNome || currentUser?.coordNome || 'Sem Coordenação',
      }),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Supervisor',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Criação',
      entidade: 'Submissão ODK',
      detalhes: `Submissão do ODK Collect enviada (${newSub.totalFormularios} formulários, recibo: ${newSub.codigoReciboODK}).`,
    }).catch(console.warn);

    return newSub;
  },

  async updateOdkSubmissionStatus(
    id: string,
    status: 'confirmado' | 'divergencia' | 'pendente',
    adminNotes?: string,
    currentUser?: User | null
  ): Promise<void> {
    const updateObj: Partial<ODKSubmission> = {
      status,
      confirmadoPorAdmin: status === 'confirmado',
      adminConfirmadorNome: currentUser?.nome || 'Administrador',
      dataConfirmacaoAdmin: new Date().toISOString().replace('T', ' ').slice(0, 16),
      ...(adminNotes !== undefined ? { observacoes: adminNotes } : {}),
    };

    await request(`/api/odk-submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateObj),
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Submissão ODK',
      detalhes: `Status da submissão ODK "${id}" alterado para "${status.toUpperCase()}".`,
    }).catch(console.warn);
  },

  async deleteOdkSubmission(id: string, currentUser?: User | null): Promise<void> {
    await deleteResource(`/api/odk-submissions/${id}`);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Submissão ODK',
      detalhes: `Submissão ODK "${id}" eliminada.`,
    }).catch(console.warn);
  },

  // AUDIT LOGS
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      return await request<AuditLog[]>('/api/audit-logs');
    } catch {
      return [];
    }
  },

  async addAuditLog(log: AuditLog): Promise<void> {
    try {
      await request('/api/audit-logs', {
        method: 'POST',
        body: JSON.stringify(log),
      });
    } catch (e) {
      console.warn('[SisMob API] Erro ao gravar audit log:', e);
    }
  },

  // METAS (COORDINATION GOALS)
  async getGoals(): Promise<CoordinationGoal[]> {
    try {
      return await request<CoordinationGoal[]>('/api/goals');
    } catch {
      return [];
    }
  },

  async saveGoal(goal: CoordinationGoal): Promise<void> {
    await request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  },

  // BLOCO DE NOTAS
  async getNotepad(): Promise<string | null> {
    try {
      const data = await request<{ text: string }>('/api/notepad');
      return data.text;
    } catch {
      return '';
    }
  },

  async saveNotepad(text: string): Promise<void> {
    await request('/api/notepad', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  // ALERTAS ADMINISTRATIVOS
  async getAdminAlerts(): Promise<Record<string, boolean>> {
    try {
      return await request<Record<string, boolean>>('/api/alerts');
    } catch {
      return {};
    }
  },

  async saveAdminAlerts(alerts: Record<string, boolean>): Promise<void> {
    await request('/api/alerts', {
      method: 'POST',
      body: JSON.stringify({ alerts }),
    });
  },

  // MENSAGENS INTERNAS DO SISTEMA
  async getAdminMessages(): Promise<any[]> {
    try {
      return await request<any[]>('/api/admin-messages');
    } catch {
      return [];
    }
  },

  async addAdminMessage(msg: any): Promise<void> {
    await request('/api/admin-messages', {
      method: 'POST',
      body: JSON.stringify(msg),
    });
  },

  // PAGAMENTOS
  async getPaymentStatuses(): Promise<Record<number, 'pendente' | 'pago'>> {
    try {
      return await request<Record<number, 'pendente' | 'pago'>>('/api/payment-statuses');
    } catch {
      return {};
    }
  },

  async savePaymentStatuses(statuses: Record<number, 'pendente' | 'pago'>): Promise<void> {
    await request('/api/payment-statuses', {
      method: 'POST',
      body: JSON.stringify({ statuses }),
    });
  },

  // NOTÍCIAS DO PORTAL
  async getPortalPosts(): Promise<PortalPost[]> {
    try {
      return await request<PortalPost[]>('/api/portal-posts');
    } catch {
      return [];
    }
  },

  async savePortalPost(post: PortalPost): Promise<void> {
    await request('/api/portal-posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  },

  async deletePortalPost(id: string): Promise<void> {
    await deleteResource(`/api/portal-posts/${id}`);
  },

  // LIMPEZA DE DADOS DE TESTE
  async clearAllTestData(currentUser?: User | null): Promise<void> {
    await request('/api/clear-test-data', {
      method: 'POST',
    });

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Base de Dados de Teste',
      detalhes: `Os dados de teste foram eliminados com sucesso do backend seguro por ${currentUser?.nome || 'Administrador'}.`,
    }).catch(console.warn);
  },

  // AI INSIGHTS
  async getAiInsights(fichas: Ficha[]) {
    return await request('/api/ai-insights', {
      method: 'POST',
      body: JSON.stringify({ fichas }),
    });
  },

  // REAL-TIME SSE SUBSCRIPTION
  subscribeToEvents(onEvent: (event: { entity: string; action: string; data?: any }) => void): () => void {
    const token = getStoredToken();
    const url = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.entity) {
          onEvent(payload);
        }
      } catch (err) {
        // ignora mensagens não json (heartbeat, connected)
      }
    };

    eventSource.onerror = () => {
      // EventSource tentará reconectar automaticamente
    };

    return () => {
      eventSource.close();
    };
  },
};
