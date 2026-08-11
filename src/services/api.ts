import { AuditLog, Coordination, CoordinationGoal, Ficha, Mobilizador, User, ODKSubmission } from '../types';
import {
  INITIAL_COORDINATIONS,
  INITIAL_FICHAS,
  INITIAL_MOBILIZADORES,
  INITIAL_USERS,
  INITIAL_ODK_SUBMISSIONS,
} from '../data/initialData';
import {
  fsGetCoordenacoes,
  fsSaveCoordination,
  fsDeleteCoordination,
  fsGetUsers,
  fsSaveUser,
  fsUpdateUser,
  fsDeleteUser,
  fsGetMobilizadores,
  fsSaveMobilizador,
  fsDeleteMobilizador,
  fsGetFichas,
  fsSaveFicha,
  fsDeleteFicha,
  fsGetAuditLogs,
  fsAddAuditLog,
  fsGetGoals,
  fsSaveGoal,
  fsGetNotepad,
  fsSaveNotepad,
  fsGetAdminAlerts,
  fsSaveAdminAlerts,
  fsGetAdminMessages,
  fsAddAdminMessage,
  fsGetPaymentStatuses,
  fsSavePaymentStatuses,
  fsClearAllTestData,
  getNextMobilizadorCodigoId,
  fsGetOdkSubmissions,
  fsSaveOdkSubmission,
  fsUpdateOdkSubmission,
  fsDeleteOdkSubmission,
} from './firebaseService';

// In-memory session store (no localStorage persistence of application data)
let sessionUserId: number | null = null;
try {
  const sid = sessionStorage.getItem('sismob_session');
  if (sid) sessionUserId = JSON.parse(sid);
} catch {
  // fallback
}

export const api = {
  // Initial fallback seeds if Firestore is still loading
  getCachedCoordenacoes(): Coordination[] {
    return INITIAL_COORDINATIONS;
  },
  getCachedUsers(): User[] {
    return INITIAL_USERS;
  },
  getCachedMobilizadores(): Mobilizador[] {
    return INITIAL_MOBILIZADORES;
  },
  getCachedFichas(): Ficha[] {
    return INITIAL_FICHAS;
  },

  // Test server connectivity with fast timeout
  async checkServerHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(1000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // COORDENAÇÕES
  async getCoordenacoes(): Promise<Coordination[]> {
    return await fsGetCoordenacoes();
  },

  async createCoordination(nome: string, coordenador?: string, bairros?: string[], currentUser?: User | null): Promise<Coordination> {
    const list = await this.getCoordenacoes();
    const cleanName = nome.trim();
    const existing = list.find((c) => c.nome.toLowerCase().trim() === cleanName.toLowerCase());

    if (existing) {
      const mergedBairros = bairros && bairros.length > 0
        ? Array.from(new Set([...(existing.bairros || []), ...bairros]))
        : existing.bairros;

      return await this.updateCoordination(
        existing.id,
        {
          nome: cleanName,
          coordenador: coordenador?.trim() || existing.coordenador,
          bairros: mergedBairros,
        },
        currentUser
      );
    }

    const newCoord: Coordination = { id: Date.now(), nome: cleanName, coordenador: coordenador?.trim() || '', bairros: bairros || [] };
    await fsSaveCoordination(newCoord);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Criação',
      entidade: 'Coordenação',
      detalhes: `Coordenação "${cleanName}" criada com coordenador "${coordenador || 'N/A'}".`,
    });

    return newCoord;
  },

  async updateCoordination(id: number, fields: Partial<Coordination>, currentUser?: User | null): Promise<Coordination> {
    const list = await this.getCoordenacoes();
    const existing = list.find((c) => c.id === id) || { id, nome: fields.nome || '' };
    const updatedCoord: Coordination = { ...existing, ...fields };

    await fsSaveCoordination(updatedCoord);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Coordenação',
      detalhes: `Coordenação "${updatedCoord.nome}" (ID #${id}) foi atualizada.`,
    });

    return updatedCoord;
  },

  async deleteCoordination(id: number, currentUser?: User | null): Promise<boolean> {
    const list = await this.getCoordenacoes();
    const target = list.find((c) => c.id === id);
    const result = await fsDeleteCoordination(id);

    if (target) {
      await this.addAuditLog({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        usuarioId: currentUser?.id || 0,
        usuarioNome: currentUser?.nome || 'Sistema',
        usuarioTipo: currentUser?.tipo || 'admin',
        acao: 'Eliminação',
        entidade: 'Coordenação',
        detalhes: `Coordenação "${target.nome}" (ID #${id}) foi eliminada.`,
      });
    }

    return result;
  },

  // USERS
  async getUsers(): Promise<User[]> {
    return await fsGetUsers();
  },

  async createUser(user: Partial<User>, currentUser?: User | null): Promise<User> {
    const list = await this.getUsers();
    if (list.some((u) => u.email.toLowerCase() === (user.email || '').toLowerCase())) {
      throw new Error('Email já registado no sistema');
    }

    const newUser: User = {
      id: Date.now(),
      nome: user.nome || '',
      email: user.email || '',
      senha: user.senha || '',
      tipo: user.tipo || 'supervisor',
      coordId: user.coordId || null,
      coordNome: user.coordNome || '—',
      coordenadorNome: user.coordenadorNome || '—',
      fotoUrl: user.fotoUrl || '',
      status: user.status || 'ativo',
      telefone: user.telefone || '',
      ronda: user.ronda || '1ª Ronda',
      createdAt: new Date().toISOString(),
    };

    await fsSaveUser(newUser);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Criação',
      entidade: 'Utilizador',
      detalhes: `Utilizador "${newUser.nome}" (${newUser.email}, ${newUser.tipo}) criado.`,
    });

    return newUser;
  },

  async updateUser(id: number, fields: Partial<User>, currentUser?: User | null): Promise<User> {
    const list = await this.getUsers();
    const index = list.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Utilizador não encontrado');

    const updatedUser = { ...list[index], ...fields };
    await fsUpdateUser(id, fields);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Utilizador',
      detalhes: `Utilizador "${updatedUser.nome}" (${updatedUser.email}) atualizado.`,
    });

    return updatedUser;
  },

  async deleteUser(id: number, currentUser?: User | null): Promise<boolean> {
    const list = await this.getUsers();
    const target = list.find((u) => u.id === id);
    const result = await fsDeleteUser(id);

    if (target) {
      await this.addAuditLog({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        usuarioId: currentUser?.id || 0,
        usuarioNome: currentUser?.nome || 'Sistema',
        usuarioTipo: currentUser?.tipo || 'admin',
        acao: 'Eliminação',
        entidade: 'Utilizador',
        detalhes: `Utilizador "${target.nome}" (${target.email}) eliminado.`,
      });
    }

    return result;
  },

  // MOBILIZADORES
  async getMobilizadores(): Promise<Mobilizador[]> {
    return await fsGetMobilizadores();
  },

  async createMobilizador(mob: Partial<Mobilizador>, currentUser?: User | null): Promise<Mobilizador> {
    const list = await this.getMobilizadores();
    const codigoId = mob.codigoId || getNextMobilizadorCodigoId(list);

    const newMob: Mobilizador = {
      id: Date.now(),
      codigoId,
      nome: mob.nome || '',
      morada: mob.morada || '',
      telefone: mob.telefone || '',
      funcao: mob.funcao || 'Mobilizador Comunitário',
      coordId: mob.coordId || null,
      coordNome: mob.coordNome || 'Geral',
      supervisorId: mob.supervisorId || null,
      supervisorNome: mob.supervisorNome || '',
      createdAt: new Date().toISOString(),
    };

    await fsSaveMobilizador(newMob);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Criação',
      entidade: 'Mobilizador',
      detalhes: `Mobilizador "${newMob.nome}" (ID: ${newMob.codigoId}, ${newMob.coordNome}) criado.`,
    });

    return newMob;
  },

  async updateMobilizador(id: number, fields: Partial<Mobilizador>, currentUser?: User | null): Promise<Mobilizador> {
    const list = await this.getMobilizadores();
    const existing = list.find((m) => m.id === id) || {
      id,
      nome: fields.nome || '',
      morada: fields.morada || '',
      telefone: fields.telefone || '',
      funcao: fields.funcao || 'Mobilizador Comunitário',
      coordId: fields.coordId || null,
      coordNome: fields.coordNome || '',
      createdAt: new Date().toISOString(),
    };

    const updatedMob: Mobilizador = { ...existing, ...fields };
    await fsSaveMobilizador(updatedMob);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Mobilizador',
      detalhes: `Mobilizador "${updatedMob.nome}" (ID #${id}) atualizado.`,
    });

    return updatedMob;
  },

  async deleteMobilizador(id: number, currentUser?: User | null): Promise<boolean> {
    const list = await this.getMobilizadores();
    const target = list.find((m) => m.id === id);
    const result = await fsDeleteMobilizador(id);

    if (target) {
      await this.addAuditLog({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        usuarioId: currentUser?.id || 0,
        usuarioNome: currentUser?.nome || 'Sistema',
        usuarioTipo: currentUser?.tipo || 'admin',
        acao: 'Eliminação',
        entidade: 'Mobilizador',
        detalhes: `Mobilizador "${target.nome}" (ID #${id}) eliminado.`,
      });
    }

    return result;
  },

  // FICHAS
  async getFichas(): Promise<Ficha[]> {
    return await fsGetFichas();
  },

  async createFicha(ficha: Partial<Ficha>, currentUser?: User | null): Promise<Ficha> {
    const newFicha: Ficha = {
      ...(ficha as Ficha),
      id: ficha.id || Date.now(),
      createdAt: new Date().toISOString(),
    };

    await fsSaveFicha(newFicha);

    // Auto log audit in Firebase
    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || ficha.userId || 0,
      usuarioNome: currentUser?.nome || ficha.supervisorNome || ficha.mobilizador || 'Sistema',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Criação',
      entidade: 'Ficha',
      detalhes: `Ficha criada para "${newFicha.bairro}" (${newFicha.totalPessoas} pessoas, ${newFicha.ronda || '1ª Ronda'})`,
      fichaId: newFicha.id,
    });

    return newFicha;
  },

  async deleteFicha(id: number, currentUser?: User | null): Promise<boolean> {
    const list = await this.getFichas();
    const target = list.find((f) => f.id === id);
    await fsDeleteFicha(id);

    if (target) {
      await this.addAuditLog({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        usuarioId: currentUser?.id || 0,
        usuarioNome: currentUser?.nome || 'Administrador',
        usuarioTipo: currentUser?.tipo || 'admin',
        acao: 'Eliminação',
        entidade: 'Ficha',
        detalhes: `Ficha ID #${id} de "${target.mobilizador}" (${target.bairro}) foi eliminada.`,
        fichaId: id,
      });
    }

    return true;
  },

  async updateFicha(id: number, fields: Partial<Ficha>, currentUser?: User | null): Promise<Ficha> {
    const list = await this.getFichas();
    const existing = list.find((f) => f.id === id);
    if (!existing) throw new Error('Ficha não encontrada');

    const updatedFicha: Ficha = { ...existing, ...fields };
    await fsSaveFicha(updatedFicha);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Ficha',
      detalhes: `Ficha ID #${id} editada. Bairro: ${updatedFicha.bairro}, Pessoas: ${updatedFicha.totalPessoas}, Mobilizador: ${updatedFicha.mobilizador}`,
      fichaId: id,
    });

    return updatedFicha;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return await fsGetAuditLogs();
  },

  async addAuditLog(log: AuditLog): Promise<void> {
    await fsAddAuditLog(log);
  },

  // Coordination Goals
  async getGoals(): Promise<CoordinationGoal[]> {
    return await fsGetGoals();
  },

  async saveGoal(goal: CoordinationGoal): Promise<void> {
    await fsSaveGoal(goal);
  },

  // Notepad
  async getNotepad(): Promise<string | null> {
    return await fsGetNotepad();
  },

  async saveNotepad(text: string): Promise<void> {
    await fsSaveNotepad(text);
  },

  // Admin Alerts & Messages
  async getAdminAlerts(): Promise<Record<string, boolean>> {
    return await fsGetAdminAlerts();
  },

  async saveAdminAlerts(alerts: Record<string, boolean>): Promise<void> {
    await fsSaveAdminAlerts(alerts);
  },

  async getAdminMessages(): Promise<any[]> {
    return await fsGetAdminMessages();
  },

  async addAdminMessage(msg: any): Promise<void> {
    await fsAddAdminMessage(msg);
  },

  // Payment Statuses
  async getPaymentStatuses(): Promise<Record<number, 'pendente' | 'pago'>> {
    return await fsGetPaymentStatuses();
  },

  async savePaymentStatuses(statuses: Record<number, 'pendente' | 'pago'>): Promise<void> {
    await fsSavePaymentStatuses(statuses);
  },

  // ODK SUBMISSIONS
  async getOdkSubmissions(): Promise<ODKSubmission[]> {
    return await fsGetOdkSubmissions();
  },

  async createOdkSubmission(
    subData: Partial<ODKSubmission>,
    currentUser?: User | null
  ): Promise<ODKSubmission> {
    const newSub: ODKSubmission = {
      id: 'odk_' + Date.now(),
      supervisorId: currentUser?.id || subData.supervisorId || 0,
      supervisorNome: currentUser?.nome || subData.supervisorNome || 'Supervisor',
      coordId: subData.coordId ?? currentUser?.coordId ?? null,
      coordNome: subData.coordNome || currentUser?.coordNome || 'Sem Coordenação',
      formId: subData.formId || 'form_odk_general',
      formNome: subData.formNome || 'Formulário ODK Collect',
      dataEnvio: subData.dataEnvio || new Date().toISOString().split('T')[0],
      horaEnvio: subData.horaEnvio || new Date().toTimeString().slice(0, 5),
      totalFormularios: subData.totalFormularios || 1,
      dispositivoAndroid: subData.dispositivoAndroid || 'Android Mobile (ODK Collect)',
      codigoReciboODK: subData.codigoReciboODK || `ODK-${Date.now().toString().slice(-6)}`,
      status: subData.status || 'pendente',
      confirmadoPorAdmin: false,
      observacoes: subData.observacoes || '',
      imagemComprovativo: subData.imagemComprovativo || '',
      createdAt: new Date().toISOString(),
    };

    await fsSaveOdkSubmission(newSub);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Utilizador',
      usuarioTipo: currentUser?.tipo || 'supervisor',
      acao: 'Criação',
      entidade: 'Submissão ODK',
      detalhes: `Confirmado envio de ${newSub.totalFormularios} formulários do ODK Collect (${newSub.formNome}) com recibo ${newSub.codigoReciboODK}.`,
    });

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
    };
    if (adminNotes !== undefined) {
      updateObj.observacoes = adminNotes;
    }

    await fsUpdateOdkSubmission(id, updateObj);

    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Edição',
      entidade: 'Submissão ODK',
      detalhes: `Status da submissão ODK ${id} alterado para "${status.toUpperCase()}" por ${currentUser?.nome || 'Administrador'}.`,
    });
  },

  async deleteOdkSubmission(id: string, currentUser?: User | null): Promise<void> {
    try {
      await fsDeleteOdkSubmission(id);
    } catch (e) {
      console.warn('Erro ao eliminar no Firestore fsDeleteOdkSubmission:', e);
    }
    try {
      await this.addAuditLog({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        usuarioId: currentUser?.id || 0,
        usuarioNome: currentUser?.nome || 'Utilizador',
        usuarioTipo: currentUser?.tipo || 'admin',
        acao: 'Eliminação',
        entidade: 'Submissão ODK',
        detalhes: `Submissão ODK ${id} eliminada por ${currentUser?.nome || 'Utilizador'}.`,
      });
    } catch (e) {
      console.warn('Erro ao guardar log de auditoria de eliminação ODK:', e);
    }
  },

  // Clear Test Data

  async clearAllTestData(currentUser?: User | null): Promise<void> {
    await fsClearAllTestData();
    await this.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id || 0,
      usuarioNome: currentUser?.nome || 'Administrador',
      usuarioTipo: currentUser?.tipo || 'admin',
      acao: 'Eliminação',
      entidade: 'Base de Dados de Teste',
      detalhes: `Os dados de teste foram eliminados com sucesso da base de dados Firebase por ${currentUser?.nome || 'Administrador'}.`,
    });
  },

  // AI Insights
  async getAiInsights(fichas: Ficha[]) {
    const res = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fichas }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao gerar análise');
    }
    return await res.json();
  },

  // Session
  getSessionUser(): number | null {
    return sessionUserId;
  },
  setSessionUser(id: number | null) {
    sessionUserId = id;
    if (id !== null) {
      sessionStorage.setItem('sismob_session', JSON.stringify(id));
    } else {
      sessionStorage.removeItem('sismob_session');
    }
  },
};

