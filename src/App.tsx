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
import { api, getStoredUser } from './services/api';
import { initSyncService, subscribeFichaSynced } from './services/syncService';
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
import { CadastroHubModal } from './components/CadastroHubModal';
import { Footer } from './components/Footer';
import { PendingFichasAlert } from './components/PendingFichasAlert';
import { getPendingFichasOver48h } from './utils/fichaUtils';
import { hasElevatedAccess, isReadOnlyEvaluator } from './utils/permissions';

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
  const [cadastroHubOpen, setCadastroHubOpen] = useState(false);
  const [cadastroHubDefaultType, setCadastroHubDefaultType] = useState<
    'mobilizador' | 'supervisor' | 'admin_junior' | 'admin' | undefined
  >(undefined);

  const handleOpenCadastroHub = (
    type?: 'mobilizador' | 'supervisor' | 'admin_junior' | 'admin'
  ) => {
    setCadastroHubDefaultType(type);
    setCadastroHubOpen(true);
  };

  // Alert for Fichas Pendentes (+48h)
  const [pendingAlertDismissed, setPendingAlertDismissed] = useState(false);
  const [fichasStatusFilter, setFichasStatusFilter] = useState('');

  const [themeConfig, setThemeConfig] = useState<UserThemeConfig>(getUserConfig);
  const [palette, setPalette] = useState<Theme>(() => applyThemeVariables(getUserConfig()));
  const [loading, setLoading] = useState(true);

  // Inicializar o serviço de sincronização offline e escutar fichas sincronizadas com sucesso
  useEffect(() => {
    const cleanupSync = initSyncService();

    const unsubscribeFicha = subscribeFichaSynced((syncedFicha, localId) => {
      setFichas((prev) => {
        const idx = prev.findIndex(
          (f) => (f.localId && f.localId === localId) || f.id === syncedFicha.id
        );
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...syncedFicha, syncStatus: 'synced' };
          return next;
        }
        return deduplicateById([{ ...syncedFicha, syncStatus: 'synced' }, ...prev]);
      });
    });

    return () => {
      cleanupSync();
      unsubscribeFicha();
    };
  }, []);

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

  // Initialize data with secure API fetch + SSE real-time subscriptions
  useEffect(() => {
    let unsubscribeSSE: (() => void) | undefined;

    const initializeData = async () => {
      setLoading(true);
      try {
        const [u, c, m, f, pfa, rum, odk, logs, gls, posts, online] = await Promise.all([
          api.getUsers(),
          api.getCoordenacoes(),
          api.getMobilizadores(),
          api.getFichas(),
          api.getCasosPFA(),
          api.getRumores(),
          api.getOdkSubmissions(),
          api.getAuditLogs(),
          api.getGoals(),
          api.getPortalPosts(),
          api.checkServerHealth(),
        ]);

        let dedupedUsers = deduplicateById(u);
        const adminIdx = dedupedUsers.findIndex((user) => user.id === 1 || user.tipo === 'admin');
        if (adminIdx === -1) {
          dedupedUsers = [INITIAL_USERS[0], ...dedupedUsers];
        }

        setUsers(dedupedUsers);
        setCoordenacoes(deduplicateById(c));
        setMobilizadores(deduplicateById(m));
        setFichas(deduplicateById(f));
        setCasosPFA(deduplicateById(pfa));
        setRumores(deduplicateById(rum));
        setOdkSubmissions(deduplicateById(odk));
        setAuditLogs(logs);
        setGoals(gls);
        setPortalPosts(deduplicateById(posts).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setIsOnline(online);

        const storedUser = getStoredUser();
        const sid = api.getSessionUser();
        if (sid) {
          const found = dedupedUsers.find((user) => user.id === sid);
          if (found) {
            setCurrentUser(found);
          } else if (storedUser) {
            setCurrentUser(storedUser);
          }
        }
      } catch (err) {
        console.warn('[SisMob] Erro ao carregar dados iniciais:', err);
      } finally {
        setLoading(false);
      }

      // Connect SSE for real-time live data updates across devices
      unsubscribeSSE = api.subscribeToEvents((event) => {
        const { entity, action, data } = event;
        if (!data) return;

        if (entity === 'fichas') {
          if (action === 'delete') {
            setFichas((prev) => prev.filter((f) => String(f.id) !== String(data.id)));
          } else {
            setFichas((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'users') {
          if (action === 'delete') {
            setUsers((prev) => prev.filter((u) => u.id !== data.id));
          } else {
            setUsers((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'coordenacoes') {
          if (action === 'delete') {
            setCoordenacoes((prev) => prev.filter((c) => c.id !== data.id));
          } else {
            setCoordenacoes((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'mobilizadores') {
          if (action === 'delete') {
            setMobilizadores((prev) => prev.filter((m) => m.id !== data.id));
          } else {
            setMobilizadores((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'casos_pfa') {
          if (action === 'delete') {
            setCasosPFA((prev) => prev.filter((c) => String(c.id) !== String(data.id)));
          } else {
            setCasosPFA((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'rumores') {
          if (action === 'delete') {
            setRumores((prev) => prev.filter((r) => String(r.id) !== String(data.id)));
          } else {
            setRumores((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'odk_submissions') {
          if (action === 'delete') {
            setOdkSubmissions((prev) => prev.filter((s) => String(s.id) !== String(data.id)));
          } else {
            setOdkSubmissions((prev) => deduplicateById([data, ...prev]));
          }
        } else if (entity === 'audit_logs') {
          setAuditLogs((prev) => [data, ...prev]);
        } else if (entity === 'portal_posts') {
          if (action === 'delete') {
            setPortalPosts((prev) => prev.filter((p) => p.id !== data.id));
          } else {
            setPortalPosts((prev) => deduplicateById([data, ...prev]));
          }
        }
      });
    };

    initializeData();

    return () => {
      if (unsubscribeSSE) unsubscribeSSE();
    };
  }, []);

  const handleSaveGoal = async (goal: CoordinationGoal) => {
    await api.saveGoal(goal);
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.coordId === goal.coordId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = goal;
        return copy;
      }
      return [...prev, goal];
    });
  };

  const handleSavePortalPost = useCallback(async (post: PortalPost) => {
    await api.savePortalPost(post);
    setPortalPosts((prev) => deduplicateById([post, ...prev]));
  }, []);

  const handleDeletePortalPost = useCallback(async (id: string) => {
    await api.deletePortalPost(id);
    setPortalPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const [f, u, c, m, pfa, rum, odk] = await Promise.all([
        api.getFichas(),
        api.getUsers(),
        api.getCoordenacoes(),
        api.getMobilizadores(),
        api.getCasosPFA(),
        api.getRumores(),
        api.getOdkSubmissions(),
      ]);
      setFichas(f);
      setUsers(u);
      setCoordenacoes(c);
      setMobilizadores(m);
      setCasosPFA(pfa);
      setRumores(rum);
      setOdkSubmissions(odk);
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

    api.updateUser(user.id, {
      isOnline: true,
      isLogged: true,
      ultimoAcesso: `Hoje às ${timeStr} (Sessão Ativa)`,
    }, updatedUser).catch(console.warn);

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

      api.updateUser(currentUser.id, {
        isOnline: false,
        isLogged: false,
        ultimoAcesso: `Desconectado às ${timeStr}`,
      }, currentUser).catch(console.warn);
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

  const handleSaveFicha = useCallback(async (fichaPartial: Partial<Ficha>): Promise<Ficha> => {
    const created = await api.createFicha(fichaPartial, currentUser);
    setFichas((prev) => deduplicateById([created, ...prev]));

    // Se estiver online e houver casos de PFA anexados, regista também na coleção de PFA
    if (created.syncStatus === 'synced' && fichaPartial.pfaCasos && fichaPartial.pfaCasos.length > 0) {
      for (const caso of fichaPartial.pfaCasos) {
        await api.createCasoPFA({ ...caso, fichaId: created.id }, currentUser).catch(console.warn);
      }
    }

    setActiveTab('listFichas');
    return created;
  }, [currentUser]);

  const handleSaveCasoPFA = useCallback(async (caso: CasoPFA) => {
    const created = await api.createCasoPFA(caso, currentUser);
    setCasosPFA((prev) => deduplicateById([created, ...prev]));
  }, [currentUser]);

  const handleUpdateCasoPFA = useCallback(async (id: string, fields: Partial<CasoPFA>) => {
    const updated = await api.updateCasoPFA(id, fields, currentUser);
    setCasosPFA((prev) => prev.map((c) => (String(c.id) === String(id) ? updated : c)));
  }, [currentUser]);

  const handleDeleteCasoPFA = useCallback(async (id: string) => {
    await api.deleteCasoPFA(id, currentUser);
    setCasosPFA((prev) => prev.filter((c) => String(c.id) !== String(id)));
  }, [currentUser]);

  const handleSaveRumor = useCallback(async (rumor: FichaRumor) => {
    const created = await api.createRumor(rumor, currentUser);
    setRumores((prev) => deduplicateById([created, ...prev]));
  }, [currentUser]);

  const handleUpdateRumor = useCallback(async (id: string, fields: Partial<FichaRumor>) => {
    const updated = await api.updateRumor(id, fields, currentUser);
    setRumores((prev) => prev.map((r) => (String(r.id) === String(id) ? updated : r)));
  }, [currentUser]);

  const handleDeleteRumor = useCallback(async (id: string) => {
    await api.deleteRumor(id, currentUser);
    setRumores((prev) => prev.filter((r) => String(r.id) !== String(id)));
  }, [currentUser]);

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
        theme={themeConfig.darkMode ? 'dark' : 'light'}
        currentPalette={palette}
        themeConfig={themeConfig}
        onSelectPalette={handleSelectPalette}
        onUpdateThemeConfig={handleUpdateThemeConfig}
        onToggleTheme={toggleTheme}
        onOpenAiModal={() => setAiModalOpen(true)}
        onSelectTab={setActiveTab}
        onOpenNotepad={() => setNotepadOpen(true)}
        onOpenAuditLogs={handleOpenAuditLogs}
        onOpenPortalNews={() => setPortalNewsOpen(true)}
        onOpenCadastroHub={handleOpenCadastroHub}
        onLogout={handleLogout}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Column: Header, Main View, Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* UNICEF Evaluation Mode Banner */}
        {currentUser?.tipo === 'admin_junior' && (
          <div className="bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-black flex flex-wrap items-center justify-between gap-2 shadow-xs border-b border-amber-500">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                Modo Avaliação UNICEF
              </span>
              <span className="text-slate-950 font-bold text-xs">
                Perfil de Visualização Institucional Completa — Modo de leitura ativo para avaliação do sistema e decisão de expansão para outros municípios.
              </span>
            </div>
            <span className="text-[10px] uppercase font-black bg-slate-950/10 px-2.5 py-1 rounded-full text-slate-900 border border-slate-950/20">
              Acesso de Consulta / Não Mutável
            </span>
          </div>
        )}

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
              onOpenCadastroHub={handleOpenCadastroHub}
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
            (hasElevatedAccess(currentUser) ? (
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
                ⚠️ Acesso Restrito: Apenas a Administração possui permissão para visualizar Finanças & Subsídios.
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
            (hasElevatedAccess(currentUser) ? (
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
                ⚠️ Acesso Restrito: Apenas Administradores e Avaliadores possuem permissão para visualizar Relatórios Oficiais.
              </div>
            ))}

          {activeTab === 'graficos' &&
            (hasElevatedAccess(currentUser) ? (
              <GraficosView
                user={currentUser}
                fichas={fichas}
                mobilizadores={mobilizadores}
                coordenacoes={coordenacoes}
                users={users}
              />
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-xs text-red-700 shadow-sm">
                ⚠️ Acesso Restrito: Apenas Administradores e Avaliadores possuem permissão para visualizar Gráficos Analíticos.
              </div>
            ))}

          {activeTab === 'utilizadores' && hasElevatedAccess(currentUser) && (
            <UtilizadoresView
              users={users}
              coordenacoes={coordenacoes}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onOpenNotepad={() => setNotepadOpen(true)}
            />
          )}

          {activeTab === 'coordenacoes' && hasElevatedAccess(currentUser) && (
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

      {/* Central Única de Cadastro Modal (Hub de Cadastro Organizado) */}
      <CadastroHubModal
        isOpen={cadastroHubOpen}
        onClose={() => setCadastroHubOpen(false)}
        user={currentUser}
        users={users}
        coordenacoes={coordenacoes}
        onCreateMobilizador={handleCreateMobilizador}
        onCreateUser={handleCreateUser}
        initialType={cadastroHubDefaultType}
      />
    </div>
  );
}
