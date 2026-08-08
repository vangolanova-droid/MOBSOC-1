import React, { useState, useEffect } from 'react';
import { Coordination, Ficha, Mobilizador, User, ODKSubmission, AuditLog } from './types';
import { api } from './services/api';
import { fsSubscribeCollection, initFirestoreDatabase } from './services/firebaseService';
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
import { AiAssistantModal } from './components/AiAssistantModal';
import { BlocoDeNotasModal } from './components/BlocoDeNotasModal';
import { AuditLogsModal } from './components/AuditLogsModal';
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
  const [users, setUsers] = useState<User[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<Coordination[]>([]);
  const [mobilizadores, setMobilizadores] = useState<Mobilizador[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [odkSubmissions, setOdkSubmissions] = useState<ODKSubmission[]>([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
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
          const deduped = deduplicateById(items);
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

  const handleRefresh = async () => {
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
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    api.setSessionUser(user.id);
    setActiveTab('dashboard');
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
    setCurrentUser(null);
    api.setSessionUser(null);
  };

  // User Actions
  const handleCreateUser = async (userPartial: Partial<User>) => {
    const created = await api.createUser(userPartial, currentUser);
    setUsers((prev) => deduplicateById([created, ...prev]));
  };

  const handleUpdateUser = async (id: number, fields: Partial<User>) => {
    const updated = await api.updateUser(id, fields, currentUser);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(updated);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteUser(id, currentUser);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Coordination Actions
  const handleCreateCoordination = async (nome: string, coordenador?: string, bairros?: string[]) => {
    const created = await api.createCoordination(nome, coordenador, bairros, currentUser);
    setCoordenacoes((prev) => deduplicateById([...prev, created]));
  };

  const handleUpdateCoordination = async (id: number, fields: Partial<Coordination>) => {
    const updated = await api.updateCoordination(id, fields, currentUser);
    setCoordenacoes((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteCoordination = async (id: number) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteCoordination(id, currentUser);
    setCoordenacoes((prev) => prev.filter((c) => c.id !== id));
  };

  // Mobilizador Actions
  const handleCreateMobilizador = async (mobPartial: Partial<Mobilizador>) => {
    const created = await api.createMobilizador(mobPartial, currentUser);
    setMobilizadores((prev) => deduplicateById([...prev, created]));
  };

  const handleUpdateMobilizador = async (id: number, fields: Partial<Mobilizador>) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    const updated = await api.updateMobilizador(id, fields, currentUser);
    setMobilizadores((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleDeleteMobilizador = async (id: number) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteMobilizador(id, currentUser);
    setMobilizadores((prev) => prev.filter((m) => m.id !== id));
  };

  // Clear test data
  const handleClearTestData = async () => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.clearAllTestData(currentUser);
    setFichas([]);
    setMobilizadores([]);
  };
  const handleSaveFicha = async (fichaPartial: Partial<Ficha>) => {
    const created = await api.createFicha(fichaPartial, currentUser);
    setFichas((prev) => deduplicateById([created, ...prev]));
    setActiveTab('listFichas');
  };

  const handleDeleteFicha = async (id: number) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteFicha(id, currentUser);
    setFichas((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFicha = async (id: number, fields: Partial<Ficha>) => {
    const isOnlyStatusUpdate = Object.keys(fields).every((k) => k === 'status');
    if (currentUser?.tipo !== 'admin' && !isOnlyStatusUpdate) {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    const updated = await api.updateFicha(id, fields, currentUser);
    setFichas((prev) => prev.map((f) => (f.id === id ? updated : f)));
  };

  // ODK Submission Actions
  const handleCreateOdkSubmission = async (subData: Partial<ODKSubmission>) => {
    const created = await api.createOdkSubmission(subData, currentUser);
    setOdkSubmissions((prev) => deduplicateById([created, ...prev]));
  };

  const handleUpdateOdkSubmissionStatus = async (
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
  };

  const handleDeleteOdkSubmission = async (id: string) => {
    if (currentUser?.tipo !== 'admin') {
      throw new Error('CONTACTA O ADMINISTRADOR INFORMANDO O MOTIVO PARA A PERMISSÃO\nTelefone/whatsApp: +244 923591571 / +244 953855260');
    }
    await api.deleteOdkSubmission(id, currentUser);
    setOdkSubmissions((prev) => prev.filter((s) => s.id !== id));
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
          <p className="text-xs font-semibold text-slate-500">A carregar SisMob...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#a6ada7] text-slate-900 dark:text-slate-900 antialiased selection:bg-[#00B2FF] selection:text-white transition-colors">
      {/* Top Corner Startup Alert for Fichas Pendentes (+48h) */}
      {!pendingAlertDismissed && pendingOver48hFichas.length > 0 && (
        <PendingFichasAlert
          pendingFichas={pendingOver48hFichas}
          onViewPending={handleViewPendingFichas}
          onClose={() => setPendingAlertDismissed(true)}
        />
      )}

      <Header
        user={currentUser}
        coordenacoes={coordenacoes}
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
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      <div className="flex min-h-[calc(100vh-57px)]">
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
          onLogout={handleLogout}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-2 sm:p-2.5 w-full min-w-0 overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={currentUser}
              fichas={fichas}
              mobilizadores={mobilizadores}
              coordenacoes={coordenacoes}
              users={users}
              onNewFicha={() => setActiveTab('ficha')}
              onViewAllFichas={() => setActiveTab('listFichas')}
              onOpenAiModal={() => setAiModalOpen(true)}
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

          {activeTab === 'utilizadores' && currentUser.tipo === 'admin' && (
            <UtilizadoresView
              users={users}
              coordenacoes={coordenacoes}
              onCreateUser={handleCreateUser}
              onDeleteUser={handleDeleteUser}
              onOpenNotepad={() => setNotepadOpen(true)}
            />
          )}

          {activeTab === 'coordenacoes' && currentUser.tipo === 'admin' && (
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
      </div>

      {/* Footer with Developer & Company Credits - Spans 100% full width under sidebar and main view */}
      <Footer />

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
    </div>
  );
}
