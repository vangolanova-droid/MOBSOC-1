import React, { useState, useEffect, useCallback } from 'react';
import { Coordination, CoordinationGoal, Ficha, Mobilizador, User, ODKSubmission, AuditLog, PortalPost, CasoPFA, FichaRumor } from './types';
import {
  INITIAL_USERS,
  INITIAL_COORDINATIONS,
  INITIAL_MOBILIZADORES,
  INITIAL_FICHAS,
  INITIAL_CASOS_PFA,
  INITIAL_ODK_SUBMISSIONS,
  INITIAL_RUMORES,
} from './data/initialData';
import { FIELD_GALLERY_ITEMS } from './data/fieldGalleryData';
import { api } from './services/api';
import { fsSubscribeCollection, initFirestoreDatabase, fsSaveGoal, fsSavePortalPost, fsDeletePortalPost, fsGetPortalPosts, fsSaveCasoPFA, fsUpdateCasoPFA, fsSaveRumor, fsUpdateRumor, fsDeleteRumor } from './services/firebaseService';
import {
  Theme,
  UserThemeConfig,
  getUserConfig,
  saveUserConfig,
  applyThemeVariables,
} from './utils/theme';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { NovaFichaView } from './components/NovaFichaView';
import { FichasListView } from './components/FichasListView';
import { ConsolidadoView } from './components/ConsolidadoView';
import { RelatoriosView } from './components/RelatoriosView';
import { GraficosView } from './components/GraficosView';
import { UtilizadoresView } from './components/UtilizadoresView';
import { CoordenacoesView } from './components/CoordenacoesView';
import { PerfilView } from './components/PerfilView';
import { MobilizadoresView } from './components/MobilizadoresView';
import { AtrasosView } from './components/AtrasosView';
import { ODKCollectView } from './components/ODKCollectView';
import { PFACasesView } from './components/PFACasesView';
import { GestaoRumoresView } from './components/GestaoRumoresView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { BlocoDeNotasModal } from './components/BlocoDeNotasModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { GoalManagerModal } from './components/GoalManagerModal';
import { PortalNewsManagerModal } from './components/PortalNewsManagerModal';
import { Footer } from './components/Footer';
import { PendingFichasAlert } from './components/PendingFichasAlert';
import { getPendingFichasOver48h } from './utils/fichaUtils';

function deduplicateById<T extends { id: number | string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (item && item.id !== undefined && item.id !== null) {
      map.set(String(item.id).trim(), item);
    }
  });
  return Array.from(map.values());
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [coordenacoes, setCoordenacoes] = useState<Coordination[]>(INITIAL_COORDINATIONS);
  const [mobilizadores, setMobilizadores] = useState<Mobilizador[]>(INITIAL_MOBILIZADORES);
  const [fichas, setFichas] = useState<Ficha[]>(INITIAL_FICHAS);
  const [casosPFA, setCasosPFA] = useState<CasoPFA[]>(INITIAL_CASOS_PFA);
  const [rumores, setRumores] = useState<FichaRumor[]>(INITIAL_RUMORES);
  const [odkSubmissions, setOdkSubmissions] = useState<ODKSubmission[]>(INITIAL_ODK_SUBMISSIONS);
  const [goals, setGoals] = useState<CoordinationGoal[]>([]);
  const [portalPosts, setPortalPosts] = useState<PortalPost[]>([]);
  const [portalNewsOpen, setPortalNewsOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Alert for Fichas Pendentes (+48h)
  const [pendingAlertDismissed, setPendingAlertDismissed] = useState(false);
  const [fichasStatusFilter, setFichasStatusFilter] = useState('');

  const [themeConfig, setThemeConfig] = useState<UserThemeConfig>(getUserConfig);
  const [palette, setPalette] = useState<Theme>(() => applyThemeVariables(getUserConfig()));
  const [loading, setLoading] = useState(true);

  // Sync theme and CSS variables on mount & when config changes
  useEffect(() => {
    const appliedTheme = applyThemeVariables(themeConfig);
    setPalette(appliedTheme);
  }, [themeConfig]);

  const toggleTheme = () => {
    const updated: UserThemeConfig = { ...themeConfig, darkMode: !themeConfig.darkMode };
    setThemeConfig(updated);
    saveUserConfig(updated);
  };

  const handleSelectPalette = (newTheme: Theme) => {
    setPalette(newTheme);
    const updated: UserThemeConfig = { ...themeConfig, theme: newTheme.id };
    setThemeConfig(updated);
    saveUserConfig(updated);
  };

  const handleUpdateThemeConfig = (updated: UserThemeConfig) => {
    setThemeConfig(updated);
    saveUserConfig(updated);
  };

  // Initialize data with instant cache loading + Firebase real-time subscriptions
  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubCoords: (() => void) | undefined;
    let unsubMobs: (() => void) | undefined;
    let unsubFichas: (() => void) | undefined;

    const setupFirebaseRealtime = async () => {
      await initFirestoreDatabase();

      const sid = api.getSessionUser();

      unsubUsers = fsSubscribeCollection<User>(
        'users',
        (items) => {
          let deduped = deduplicateById(items);
          const adminIdx = deduped.findIndex((u) => u.id === 1 || u.tipo === 'admin');
          if (adminIdx === -1) {
            deduped = [INITIAL_USERS[0], ...deduped];
          } else {
            deduped[adminIdx] = {
              ...deduped[adminIdx],
              id: 1,
              nome: 'ANDRÉ BUMBA DE MELO',
              email: 'v.angola.nova@gmail.com',
              senha: 'Andre2021',
              telefone: '923591571',
              tipo: 'admin',
              status: 'ativo',
            };
          }
          setUsers(deduped);
          if (sid) {
            const found = deduped.find((u) => u.id === sid);
            if (found) setCurrentUser(found);
          }
          setLoading(false);
        },
        (a, b) => a.id - b.id
      );

      unsubCoords = fsSubscribeCollection<Coordination>(
        'coordenacoes',
        (items) => setCoordenacoes(deduplicateById(items)),
        (a, b) => a.id - b.id
      );

      unsubMobs = fsSubscribeCollection<Mobilizador>(
        'mobilizadores',
        (items) => setMobilizadores(deduplicateById(items)),
        (a, b) => a.id - b.id
      );

      unsubFichas = fsSubscribeCollection<Ficha>(
        'fichas',
        (items) => setFichas(deduplicateById(items)),
        (a, b) => Number(b.id) - Number(a.id)
      );

      fsSubscribeCollection<CasoPFA>(
        'casos_pfa',
        (items) => setCasosPFA(deduplicateById(items)),
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

      fsSubscribeCollection<FichaRumor>(
        'rumores',
        (items) => setRumores(deduplicateById(items)),
        (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
      );

      fsSubscribeCollection<ODKSubmission>(
        'odk_submissions',
        (items) => setOdkSubmissions(deduplicateById(items)),
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

      fsSubscribeCollection<AuditLog>(
        'audit_logs',
        (items) => setAuditLogs(items),
        (a, b) => b.timestamp.localeCompare(a.timestamp)
      );

      fsSubscribeCollection<CoordinationGoal>(
        'coordination_goals',
        (items) => setGoals(items),
        (a, b) => a.coordId - b.coordId
      );

      fsSubscribeCollection<PortalPost>(
        'portal_posts',
        (items) => {
          setPortalPosts(deduplicateById(items).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

      api.checkServerHealth().then((online) => setIsOnline(online));
    };

    setupFirebaseRealtime();

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubCoords) unsubCoords();
      if (unsubMobs) unsubMobs();
      if (unsubFichas) unsubFichas();
    };
  }, []);

  const handleSaveGoal = async (goal: CoordinationGoal) => {
    await fsSaveGoal(goal);
  };

  const handleSavePortalPost = useCallback(async (post: PortalPost) => {
    await fsSavePortalPost(post);
    setPortalPosts((prev) => deduplicateById([post, ...prev]));
  }, []);

  const handleDeletePortalPost = useCallback(async (id: string) => {
    await fsDeletePortalPost(id);
    setPortalPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const [f, u, c, m] = await Promise.all([
        api.getFichas(),
        api.getUsers(),
        api.getCoordenacoes(),
        api.getMobilizadores(),
      ]);
      setFichas(f);
      setUsers(u);
      setCoordenacoes(c);
      setMobilizadores(m);
    } catch (e) {
      console.warn('Refresh warning:', e);
    }
  }, []);

  const handleLogin = (user: User) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedUser: User = {
      ...user,
      isOnline: true,
      isLogged: true,
      ultimoAcesso: `Hoje às ${timeStr} (Sessão Ativa)`,
    };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    api.setSessionUser(user.id);
    setActiveTab('dashboard');

    // Sync online status to Firestore
    import('./services/firebaseService').then(({ fsUpdateUser }) => {
      fsUpdateUser(user.id, {
        isOnline: true,
        isLogged: true,
        ultimoAcesso: `Hoje às ${timeStr} (Sessão Ativa)`,
      }).catch(console.warn);
    });

    api.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: user.id,
      usuarioNome: user.nome,
      usuarioTipo: user.tipo,
      acao: 'Login',
      entidade: 'Sessão',
      detalhes: `Sessão iniciada por ${user.nome} (${user.email})`,
    });
  };

  const handleLogout = () => {
    if (currentUser) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const offlineUser: User = {
        ...currentUser,
        isOnline: false,
        isLogged: false,
        ultimoAcesso: `Desconectado às ${timeStr}`,
      };
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? offlineUser : u)));

      import('./services/firebaseService').then(({ fsUpdateUser }) => {
        fsUpdateUser(currentUser.id, {
          isOnline: false,
          isLogged: false,
          ultimoAcesso: `Desconectado às ${timeStr}`,
        }).catch(console.warn);
      });
    }
    setCurrentUser(null);
    api.setSessionUser(null);
  };

  // User Actions
  const handleCreateUser = useCallback(async (userPartial: Partial<User>) => {
    const created = await api.createUser(userPartial, currentUser);
    setUsers((prev) => deduplicateById([created, ...prev]));
  }, [currentUser]);

  const handleUpdateUser = useCallback(async (id: number, fields: Partial<User>) => {
    const updated = await api.updateUser(id, fields, currentUser);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(updated);
    }
  }, [currentUser]);

  const handleDeleteUser = useCallback(async (id: number) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteUser(id, currentUser);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, [currentUser]);

  // Coordination Actions
  const handleCreateCoordination = useCallback(async (nome: string, coordenador?: string, bairros?: string[]) => {
    const created = await api.createCoordination(nome, coordenador, bairros, currentUser);
    setCoordenacoes((prev) => deduplicateById([...prev, created]));
  }, [currentUser]);

  const handleUpdateCoordination = useCallback(async (id: number, fields: Partial<Coordination>) => {
    const updated = await api.updateCoordination(id, fields, currentUser);
    setCoordenacoes((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, [currentUser]);

  const handleDeleteCoordination = useCallback(async (id: number) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteCoordination(id, currentUser);
    setCoordenacoes((prev) => prev.filter((c) => c.id !== id));
  }, [currentUser]);

  // Mobilizador Actions
  const handleCreateMobilizador = useCallback(async (mobPartial: Partial<Mobilizador>) => {
    const created = await api.createMobilizador(mobPartial, currentUser);
    setMobilizadores((prev) => deduplicateById([...prev, created]));
  }, [currentUser]);

  const handleUpdateMobilizador = useCallback(async (id: number, fields: Partial<Mobilizador>) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    const updated = await api.updateMobilizador(id, fields, currentUser);
    setMobilizadores((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, [currentUser]);

  const handleDeleteMobilizador = useCallback(async (id: number) => {
    if (!currentUser) {
      throw new Error('Sessão expirada. Por favor inicie sessão novamente.');
    }
    await api.deleteMobilizador(id, currentUser);
    setMobilizadores((prev) => prev.filter((m) => m.id !== id));
  }, [currentUser]);

  // Clear test data
  const handleClearTestData = useCallback(async () => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.clearAllTestData(currentUser);
    setFichas([]);
    setMobilizadores([]);
  }, [currentUser]);

  const handleSaveFicha = useCallback(async (fichaPartial: Partial<Ficha>) => {
    const created = await api.createFicha(fichaPartial, currentUser);
    setFichas((prev) => deduplicateById([created, ...prev]));

    // If PFA cases were attached, save them to the PFA collection
    if (fichaPartial.pfaCasos && fichaPartial.pfaCasos.length > 0) {
      for (const caso of fichaPartial.pfaCasos) {
        await fsSaveCasoPFA({ ...caso, fichaId: created.id });
      }
    }

    setActiveTab('listFichas');
  }, [currentUser]);

  const handleSaveCasoPFA = useCallback(async (caso: CasoPFA) => {
    await fsSaveCasoPFA(caso);
    setCasosPFA((prev) => deduplicateById([caso, ...prev]));
  }, []);

  const handleUpdateCasoPFA = useCallback(async (id: string, fields: Partial<CasoPFA>) => {
    await fsUpdateCasoPFA(id, fields);
    setCasosPFA((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }, []);

  const handleSaveRumor = useCallback(async (rumor: FichaRumor) => {
    await fsSaveRumor(rumor);
    setRumores((prev) => deduplicateById([rumor, ...prev]));
    api.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id ?? 0,
      usuarioNome: currentUser?.nome ?? 'Sistema',
      usuarioTipo: currentUser?.tipo ?? 'supervisor',
      acao: 'Registo de Rumor',
      entidade: 'Gestão de Rumores',
      detalhes: `Novo rumor registado em ${rumor.local}: "${rumor.rumor.substring(0, 50)}..."`,
    });
  }, [currentUser]);

  const handleUpdateRumor = useCallback(async (id: string, fields: Partial<FichaRumor>) => {
    await fsUpdateRumor(id, fields);
    setRumores((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    api.addAuditLog({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      usuarioId: currentUser?.id ?? 0,
      usuarioNome: currentUser?.nome ?? 'Sistema',
      usuarioTipo: currentUser?.tipo ?? 'supervisor',
      acao: 'Atualização de Rumor',
      entidade: 'Gestão de Rumores',
      detalhes: `Rumor ${id} atualizado. Estado: ${fields.estado || 'Modificado'}`,
    });
  }, [currentUser]);

  const handleDeleteRumor = useCallback(async (id: string) => {
    await fsDeleteRumor(id);
    setRumores((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleDeleteFicha = useCallback(async (id: number) => {
    if (!currentUser) {
      throw new Error('Sessão expirada. Por favor inicie sessão novamente.');
    }
    await api.deleteFicha(id, currentUser);
    setFichas((prev) => prev.filter((f) => f.id !== id));
  }, [currentUser]);

  const handleUpdateFicha = useCallback(async (id: number, fields: Partial<Ficha>) => {
    const isOnlyStatusUpdate = Object.keys(fields).every((k) => k === 'status');
    if (currentUser?.tipo !== 'admin' && !isOnlyStatusUpdate) {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    const updated = await api.updateFicha(id, fields, currentUser);
    setFichas((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }, [currentUser]);

  // ODK Submission Actions
  const handleCreateOdkSubmission = useCallback(async (subData: Partial<ODKSubmission>) => {
    const created = await api.createOdkSubmission(subData, currentUser);
    setOdkSubmissions((prev) => deduplicateById([created, ...prev]));
  }, [currentUser]);

  const handleUpdateOdkSubmissionStatus = useCallback(async (
    id: string,
    status: 'confirmado' | 'divergencia' | 'pendente',
    adminNotes?: string
  ) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.updateOdkSubmissionStatus(id, status, adminNotes, currentUser);
    setOdkSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              confirmadoPorAdmin: status === 'confirmado',
              adminConfirmadorNome: currentUser.nome,
              dataConfirmacaoAdmin: new Date().toISOString().replace('T', ' ').slice(0, 16),
              observacoes: adminNotes !== undefined ? adminNotes : s.observacoes,
            }
          : s
      )
    );
  }, [currentUser]);

  const handleDeleteOdkSubmission = useCallback(async (id: string) => {
    try {
      await api.deleteOdkSubmission(id, currentUser);
    } catch (err) {
      console.warn('Erro ao apagar no Firestore, eliminando localmente:', err);
    }
    setOdkSubmissions((prev) => prev.filter((s) => String(s.id) !== String(id)));
  }, [currentUser]);


  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        portalPosts={portalPosts}
        fichas={fichas}
        coordenacoes={coordenacoes}
        onLogin={handleLogin}
        onRegisterUser={handleCreateUser}
      />
    );
  }

  const handleOpenAuditLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      if (Array.isArray(logs) && logs.length > 0) {
        setAuditLogs(logs);
      }
    } catch (e) {
      console.warn('Erro ao carregar histórico de auditoria:', e);
    }
    setAuditLogsOpen(true);
  };

  const pendingOver48hFichas = getPendingFichasOver48h(fichas, currentUser);

  const handleViewPendingFichas = () => {
    setFichasStatusFilter('pendente_48h');
    setActiveTab('listFichas');
  };

  return (
    <div className="min-h-screen bg-[#ececec] text-slate-900 antialiased selection:bg-[#00B2FF] selection:text-white transition-colors flex flex-col md:flex-row" style={{ backgroundColor: '#ececec' }}>
      {/* Top Corner Startup Alert for Fichas Pendentes (+48h) */}
      {!pendingAlertDismissed && pendingOver48hFichas.length > 0 && (
        <PendingFichasAlert
          pendingFichas={pendingOver48hFichas}
          onViewPending={handleViewPendingFichas}
          onClose={() => setPendingAlertDismissed(true)}
        />
      )}

      {/* Extended Sidebar - Top-to-Bottom */}
      <Sidebar
        user={currentUser}
        activeTab={activeTab}
        fichas={fichas}
        users={users}
        odkSubmissions={odkSubmissions}
        isOpen={sidebarOpen}
        currentPalette={palette}
        themeConfig={themeConfig}
        onUpdateThemeConfig={handleUpdateThemeConfig}
        onSelectTab={setActiveTab}
        onOpenNotepad={() => setNotepadOpen(true)}
        onOpenAuditLogs={handleOpenAuditLogs}
        onOpenPortalNews={() => setPortalNewsOpen(true)}
        onOpenGoalModal={() => setGoalModalOpen(true)}
        onLogout={handleLogout}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Column: Header, Main View, Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          user={currentUser}
          coordenacoes={coordenacoes}
          fichas={fichas}
          odkSubmissions={odkSubmissions}
          auditLogs={auditLogs}
          users={users}
          mobilizadores={mobilizadores}
          isOnline={isOnline}
          theme={themeConfig.darkMode ? 'dark' : 'light'}
          currentPalette={palette}
          themeConfig={themeConfig}
          onSelectPalette={handleSelectPalette}
          onUpdateThemeConfig={handleUpdateThemeConfig}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewFicha={() => setActiveTab('ficha')}
          onOpenAiModal={() => setAiModalOpen(true)}
          onOpenNotepad={() => setNotepadOpen(true)}
          onOpenAuditLogs={handleOpenAuditLogs}
          onOpenPortalNews={() => setPortalNewsOpen(true)}
          onOpenGoalModal={() => setGoalModalOpen(true)}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        <main className="flex-1 p-3 sm:p-4 w-full min-w-0 overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={currentUser}
              fichas={fichas}
              casosPFA={casosPFA}
              mobilizadores={mobilizadores}
              coordenacoes={coordenacoes}
              users={users}
              goals={goals}
              portalPosts={portalPosts}
              rumores={rumores}
              onNewFicha={() => setActiveTab('ficha')}
              onOpenRumores={() => setActiveTab('rumores')}
              onViewAllFichas={() => setActiveTab('listFichas')}
              onViewPFACases={() => setActiveTab('casosPFA')}
              onOpenAiModal={() => setAiModalOpen(true)}
              onOpenGoalModal={() => setGoalModalOpen(true)}
              onOpenPortalNews={() => setPortalNewsOpen(true)}
              onSavePortalPost={handleSavePortalPost}
              onDeletePortalPost={handleDeletePortalPost}
            />
          )}

          {activeTab === 'rumores' && (
            <GestaoRumoresView
              user={currentUser}
              rumores={rumores}
              coordenacoes={coordenacoes}
              users={users}
              onSaveRumor={handleSaveRumor}
              onUpdateRumor={handleUpdateRumor}
              onDeleteRumor={handleDeleteRumor}
            />
          )}

          {activeTab === 'ficha' && (
            <NovaFichaView
              user={currentUser}
              coordenacoes={coordenacoes}
              mobilizadores={mobilizadores}
              onSaveFicha={handleSaveFicha}
            />
          )}

          {(activeTab === 'mobilizadores' ||
            activeTab === 'cadastrarMobilizador' ||
            activeTab === 'verMobilizadores') && (
            <MobilizadoresView
              user={currentUser}
              users={users}
              mobilizadores={mobilizadores}
              coordenacoes={coordenacoes}
              fichas={fichas}
              initialFocusRegister={activeTab === 'cadastrarMobilizador'}
              initialTab="geral"
              onCreateMobilizador={handleCreateMobilizador}
              onUpdateMobilizador={handleUpdateMobilizador}
              onDeleteMobilizador={handleDeleteMobilizador}
            />
          )}

          {activeTab === 'financas' &&
            (currentUser.tipo === 'admin' ? (
              <MobilizadoresView
                user={currentUser}
                users={users}
                mobilizadores={mobilizadores}
                coordenacoes={coordenacoes}
                fichas={fichas}
                initialTab="financas"
                onCreateMobilizador={handleCreateMobilizador}
                onUpdateMobilizador={handleUpdateMobilizador}
                onDeleteMobilizador={handleDeleteMobilizador}
              />
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-xs text-red-700 shadow-sm">
                ⚠️ Acesso Restrito: Apenas o Administrador possui permissão para visualizar Finanças & Subsídios.
              </div>
            ))}

          {activeTab === 'atrasos' && (
            <AtrasosView
              user={currentUser}
              users={users}
              fichas={fichas}
              coordenacoes={coordenacoes}
              mobilizadores={mobilizadores}
              onNewFicha={() => setActiveTab('ficha')}
            />
          )}

          {activeTab === 'casosPFA' && (
            <PFACasesView
              user={currentUser}
              casosPFA={casosPFA}
              coordenacoes={coordenacoes}
              onSaveCasoPFA={handleSaveCasoPFA}
              onUpdateCasoPFA={handleUpdateCasoPFA}
            />
          )}

          {activeTab === 'odk' && (
            <ODKCollectView
              user={currentUser}
              coordenacoes={coordenacoes}
              users={users}
              submissions={odkSubmissions}
              onCreateSubmission={handleCreateOdkSubmission}
              onUpdateStatus={handleUpdateOdkSubmissionStatus}
              onDeleteSubmission={handleDeleteOdkSubmission}
            />
          )}

          {activeTab === 'listFichas' && (
            <FichasListView
              user={currentUser}
              users={users}
              fichas={fichas}
              coordenacoes={coordenacoes}
              mobilizadores={mobilizadores}
              initialStatusFilter={fichasStatusFilter}
              onDeleteFicha={handleDeleteFicha}
              onUpdateFicha={handleUpdateFicha}
              onRefresh={handleRefresh}
              onClearTestData={handleClearTestData}
            />
          )}

          {activeTab === 'consolidado' && (
            <ConsolidadoView user={currentUser} fichas={fichas} />
          )}

          {activeTab === 'relatorios' &&
            (currentUser.tipo === 'admin' ? (
              <RelatoriosView
                user={currentUser}
                fichas={fichas}
                coordenacoes={coordenacoes}
                users={users}
                mobilizadores={mobilizadores}
                goals={goals}
              />
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-xs text-red-700 shadow-sm">
                ⚠️ Acesso Restrito: Apenas o Administrador possui permissão para visualizar Relatórios Oficiais.
              </div>
            ))}

          {activeTab === 'graficos' &&
            (currentUser.tipo === 'admin' ? (
              <GraficosView
                user={currentUser}
                fichas={fichas}
                mobilizadores={mobilizadores}
                coordenacoes={coordenacoes}
                users={users}
              />
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-xs text-red-700 shadow-sm">
                ⚠️ Acesso Restrito: Apenas o Administrador possui permissão para visualizar Gráficos Analíticos.
              </div>
            ))}

          {(activeTab === 'utilizadores' || activeTab === 'cadastrarUtilizador') && currentUser.tipo === 'admin' && (
            <UtilizadoresView
              users={users}
              coordenacoes={coordenacoes}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onOpenNotepad={() => setNotepadOpen(true)}
            />
          )}

          {(activeTab === 'coordenacoes' || activeTab === 'cadastrarCoordenacao') && currentUser.tipo === 'admin' && (
            <CoordenacoesView
              coordenacoes={coordenacoes}
              users={users}
              onCreateCoordination={handleCreateCoordination}
              onUpdateCoordination={handleUpdateCoordination}
              onDeleteCoordination={handleDeleteCoordination}
            />
          )}

          {activeTab === 'perfil' && (
            <PerfilView
              user={currentUser}
              users={users}
              coordenacoes={coordenacoes}
              isOnline={isOnline}
              themeConfig={themeConfig}
              onUpdateThemeConfig={handleUpdateThemeConfig}
              onUpdateUser={handleUpdateUser}
              onClearTestData={handleClearTestData}
            />
          )}
        </main>

        {/* Footer with Developer & Company Credits - Seamlessly floating on main page background */}
        <Footer />
      </div>

      {/* Gemini AI Assistant Modal */}
      <AiAssistantModal
        fichas={fichas}
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />

      {/* Admin Notepad Modal */}
      <BlocoDeNotasModal
        isOpen={notepadOpen}
        onClose={() => setNotepadOpen(false)}
        users={users}
        coordenacoes={coordenacoes}
      />

      {/* Audit Logs Modal */}
      <AuditLogsModal
        isOpen={auditLogsOpen}
        onClose={() => setAuditLogsOpen(false)}
        logs={auditLogs}
      />

      {/* Goal Manager Modal */}
      <GoalManagerModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        coordenacoes={coordenacoes}
        goals={goals}
        onSaveGoal={handleSaveGoal}
      />

      {/* Portal News Manager Modal */}
      {portalNewsOpen && currentUser?.tipo === 'admin' && (
        <PortalNewsManagerModal
          user={currentUser}
          posts={portalPosts}
          onSavePost={handleSavePortalPost}
          onDeletePost={handleDeletePortalPost}
          onClose={() => setPortalNewsOpen(false)}
        />
      )}
    </div>
  );
}
