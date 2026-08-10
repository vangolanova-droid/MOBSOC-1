import React from 'react';
import {
  LayoutDashboard,
  FilePlus,
  ListFilter,
  UserCheck2,
  BarChart3,
  BookOpen,
  PieChart,
  Users,
  Building2,
  LogOut,
  Clock,
  ShieldAlert,
  FolderKanban,
  Notebook,
  ShieldCheck,
  Wallet,
  FileSpreadsheet,
  Palette,
  Check,
  Smartphone,
  PanelLeftClose,
  Newspaper,
} from 'lucide-react';
import { User, Ficha, ODKSubmission } from '../types';
import { Tooltip as ActionTooltip } from './Tooltip';
import {
  Theme,
  UserThemeConfig,
  SIDEBAR_COLORS,
  saveUserConfig,
  applyThemeVariables,
  getUserConfig,
} from '../utils/theme';

interface SidebarProps {
  user: User;
  activeTab: string;
  fichas?: Ficha[];
  users?: User[];
  odkSubmissions?: ODKSubmission[];
  isOpen: boolean;
  currentPalette?: Theme;
  themeConfig?: UserThemeConfig;
  onUpdateThemeConfig?: (config: UserThemeConfig) => void;
  onSelectTab: (tab: string) => void;
  onOpenNotepad?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenPortalNews?: () => void;
  onLogout: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  fichas = [],
  users = [],
  odkSubmissions = [],
  isOpen,
  currentPalette,
  themeConfig,
  onUpdateThemeConfig,
  onSelectTab,
  onOpenNotepad,
  onOpenAuditLogs,
  onOpenPortalNews,
  onLogout,
  onCloseMobile,
}) => {
  const isAdmin = user.tipo === 'admin';
  const todayStr = new Date().toISOString().split('T')[0];
  const [colorPickerOpen, setColorPickerOpen] = React.useState(false);

  // Calculate active sidebar color preset
  const activeSidebarColorId = themeConfig?.sidebarColor || 'default';
  const currentSidebarPreset =
    SIDEBAR_COLORS.find((sb) => sb.id === activeSidebarColorId) || SIDEBAR_COLORS[0];

  const handleSelectSidebarColor = (colorId: string) => {
    const currentConfig = themeConfig || getUserConfig();
    const updated = { ...currentConfig, sidebarColor: colorId };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) {
      onUpdateThemeConfig(updated);
    }
  };

  // Calculate delay & alert status for Admin vs Supervisor
  const alertStatus = React.useMemo(() => {
    if (isAdmin) {
      const supervisores = users.filter((u) => u.tipo === 'user' || u.tipo === 'supervisor' || u.tipo === 'coordenador');
      let count = 0;
      supervisores.forEach((sup) => {
        const hasFichaToday = fichas.some(
          (f) => f.userId === sup.id && f.dataRegisto?.startsWith(todayStr)
        );
        if (!hasFichaToday) count++;
      });
      return { hasAlert: count > 0, count };
    } else {
      const myFichaToday = fichas.some(
        (f) => f.userId === user.id && f.dataRegisto?.startsWith(todayStr)
      );
      return { hasAlert: !myFichaToday, count: !myFichaToday ? 1 : 0 };
    }
  }, [isAdmin, users, fichas, todayStr, user.id]);

  const pendingOdkCount = React.useMemo(() => {
    if (isAdmin) {
      return odkSubmissions.filter((s) => s.status === 'pendente').length;
    }
    return odkSubmissions.filter((s) => s.supervisorId === user.id && s.status === 'pendente').length;
  }, [isAdmin, odkSubmissions, user.id]);

  const handleNav = (tab: string) => {
    onSelectTab(tab);
  };

  const primaryColor = currentPalette?.colors?.primary || '#00B2FF';

  const getNavBtnClass = (isActive: boolean) => {
    if (isActive) {
      return 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-xs transition';
    }
    if (currentSidebarPreset.isDark) {
      return 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 hover:text-white transition';
    }
    return 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-200/80 hover:text-black transition';
  };

  const textContrastClass = currentSidebarPreset.isDark ? 'text-white' : 'text-slate-900';
  const subtextContrastClass = currentSidebarPreset.isDark ? 'text-slate-200' : 'text-slate-800';
  const sectionTitleClass = currentSidebarPreset.isDark ? 'text-slate-300' : 'text-slate-900';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r transition-all duration-300 md:sticky md:top-0 md:h-screen shrink-0 overflow-y-auto ${
          isOpen
            ? 'w-76 translate-x-0 opacity-100'
            : 'w-0 -translate-x-full opacity-0 pointer-events-none border-none p-0 overflow-hidden md:w-0 md:p-0 md:border-none'
        }`}
        style={{
          backgroundColor: currentSidebarPreset.bg,
          color: currentSidebarPreset.text,
          borderColor: currentSidebarPreset.border,
        }}
      >
        {/* User Card Header & Hide Sidebar Button */}
        <div
          className="border-b p-3 flex items-center justify-between gap-2"
          style={{ borderColor: currentSidebarPreset.border }}
        >
          <div className="flex-1 min-w-0">
            <ActionTooltip content="Abre as definições do seu perfil de utilizador, onde pode alterar dados pessoais, senha e foto.">
              <div
                onClick={() => handleNav('perfil')}
                className={`flex items-center gap-3 rounded-xl border p-2 shadow-2xs cursor-pointer transition group w-full ${
                  currentSidebarPreset.isDark
                    ? 'bg-white/10 border-white/20 hover:bg-white/20'
                    : 'bg-slate-100 border-slate-300 hover:bg-slate-200/80'
                }`}
                title="Clique para abrir e gerir Meu Perfil"
              >
                {/* Avatar Circle */}
                <div
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-white font-bold text-xs shadow-xs border"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                >
                  {user.fotoUrl ? (
                    <img
                      src={user.fotoUrl}
                      alt={user.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{user.nome.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className={`text-xs font-extrabold truncate flex items-center justify-between gap-1 ${textContrastClass}`}>
                    <span className="truncate group-hover:opacity-80 transition">{user.nome}</span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-bold border"
                      style={{
                        backgroundColor: currentSidebarPreset.isDark ? 'rgba(255,255,255,0.2)' : `${primaryColor}15`,
                        color: currentSidebarPreset.isDark ? '#FFFFFF' : primaryColor,
                        borderColor: currentSidebarPreset.isDark ? 'rgba(255,255,255,0.4)' : `${primaryColor}30`,
                      }}
                    >
                      {user.tipo === 'admin' ? 'Admin' : 'Sup'}
                    </span>
                  </div>
                  <div className={`text-[10px] font-semibold truncate ${subtextContrastClass}`}>
                    {user.coordNome || 'Direção Geral'}
                  </div>
                </div>
              </div>
            </ActionTooltip>
          </div>

          <ActionTooltip content="Esconder / Ocultar o menu lateral de navegação">
            <button
              onClick={onCloseMobile}
              className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                currentSidebarPreset.isDark
                  ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
                  : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
              title="Esconder Menu Lateral"
              id="btn-hide-sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </ActionTooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Main Section */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Principal
            </div>
            <div className="space-y-1">
              <ActionTooltip content="Visualiza o painel principal de indicadores, gráficos de progresso diário e totais acumulados.">
                <button
                  onClick={() => handleNav('dashboard')}
                  className={getNavBtnClass(activeTab === 'dashboard')}
                  style={activeTab === 'dashboard' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-dashboard"
                >
                  <LayoutDashboard className={`h-4 w-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>Dashboard</span>
                </button>
              </ActionTooltip>
            </div>
          </div>

          {/* Grupo 1: REGISTOS DE CAMPO */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>Registos de Campo</span>
              <FolderKanban className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-1">
              <ActionTooltip content="Abre o formulário para registar uma nova ficha de mobilização de vacinação em campo.">
                <button
                  onClick={() => handleNav('ficha')}
                  className={getNavBtnClass(activeTab === 'ficha')}
                  style={activeTab === 'ficha' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-ficha"
                >
                  <FilePlus className={`h-4 w-4 ${activeTab === 'ficha' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>Nova Ficha</span>
                </button>
              </ActionTooltip>

              <ActionTooltip content="Aceda à lista de todas as fichas submetidas, com filtros de busca e exportação Excel/PDF.">
                <button
                  onClick={() => handleNav('listFichas')}
                  className={getNavBtnClass(activeTab === 'listFichas')}
                  style={activeTab === 'listFichas' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-listFichas"
                >
                  <ListFilter className={`h-4 w-4 ${activeTab === 'listFichas' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>Fichas Registadas</span>
                </button>
              </ActionTooltip>
            </div>
          </div>

          {/* Grupo 2: RH-MC (Recursos Humanos - Mobilizadores Comunitários) */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>RH-MC (Mobilizadores)</span>
              <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-1">
              <ActionTooltip content="Gere e visualiza a lista de mobilizadores comunitários atribuídos à sua equipa ou coordenação.">
                <button
                  onClick={() => handleNav('mobilizadores')}
                  className={getNavBtnClass(
                    activeTab === 'mobilizadores' ||
                      activeTab === 'verMobilizadores' ||
                      activeTab === 'cadastrarMobilizador'
                  )}
                  style={
                    activeTab === 'mobilizadores' ||
                    activeTab === 'verMobilizadores' ||
                    activeTab === 'cadastrarMobilizador'
                      ? { backgroundColor: primaryColor }
                      : undefined
                  }
                  id="nav-mobilizadores"
                >
                  <UserCheck2 className={`h-4 w-4 ${
                    activeTab === 'mobilizadores' ||
                    activeTab === 'verMobilizadores' ||
                    activeTab === 'cadastrarMobilizador'
                      ? 'text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`} />
                  <span>Mobilizadores (RH-MC)</span>
                </button>
              </ActionTooltip>

              {isAdmin && (
                <ActionTooltip content="Controlo financeiro de pagamentos, folhas de presença e subsidiação de mobilizadores.">
                  <button
                    onClick={() => handleNav('financas')}
                    className={getNavBtnClass(activeTab === 'financas')}
                    style={activeTab === 'financas' ? { backgroundColor: primaryColor } : undefined}
                    id="nav-financas"
                  >
                    <Wallet className={`h-4 w-4 ${activeTab === 'financas' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>Finanças & Subsídios</span>
                  </button>
                </ActionTooltip>
              )}
            </div>
          </div>

          {/* Grupo 3: MONITORIZAÇÃO & ATRASOS */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>Monitorização & Atrasos</span>
              <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-1">
              <ActionTooltip content="Monitoriza em tempo real quais supervisores ou equipas ainda não submeteram fichas no dia de hoje.">
                <button
                  onClick={() => handleNav('atrasos')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    activeTab === 'atrasos'
                      ? 'text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  style={activeTab === 'atrasos' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-atrasos"
                >
                  <div className="flex items-center gap-3 truncate">
                    <ShieldAlert className={`h-4 w-4 ${activeTab === 'atrasos' ? 'text-white' : 'text-amber-600 dark:text-amber-500'}`} />
                    <span className="truncate">
                      {isAdmin ? 'Controlo de Atrasos' : 'Alertas de Atraso'}
                    </span>
                  </div>
                  {alertStatus.hasAlert && (
                    <span
                      className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        activeTab === 'atrasos'
                          ? 'bg-white'
                          : 'bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                      }`}
                      style={activeTab === 'atrasos' ? { color: primaryColor } : undefined}
                    >
                      {isAdmin ? alertStatus.count : 'Pendente'}
                    </span>
                  )}
                </button>
              </ActionTooltip>
            </div>
          </div>

          {/* Grupo 4: INTEGRAÇÃO ODK COLLECT */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>ODK Collect Central</span>
              <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <ActionTooltip content="Módulo de verificação, upload de capturas de ecrã e aprovação de formulários ODK Collect.">
                <button
                  onClick={() => handleNav('odk')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    activeTab === 'odk'
                      ? 'text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  style={activeTab === 'odk' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-odk-collect"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Smartphone className={`h-4 w-4 ${activeTab === 'odk' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className="truncate">Confirmação ODK</span>
                  </div>
                  {pendingOdkCount > 0 ? (
                    <span
                      className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        activeTab === 'odk'
                          ? 'bg-white text-emerald-700'
                          : 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {pendingOdkCount}
                    </span>
                  ) : (
                    <span className="ml-1 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                      ODK
                    </span>
                  )}
                </button>
              </ActionTooltip>
            </div>
          </div>


          {/* Admin Section */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              {isAdmin ? 'Administração & Análise' : 'Análise Operacional'}
            </div>
            <div className="space-y-1">
              <ActionTooltip content="Apresenta o resumo consolidado dos dados por coordenação, município e período de campanha.">
                <button
                  onClick={() => handleNav('consolidado')}
                  className={getNavBtnClass(activeTab === 'consolidado')}
                  style={activeTab === 'consolidado' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-consolidado"
                >
                  <BarChart3 className={`h-4 w-4 ${activeTab === 'consolidado' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>Consolidado</span>
                </button>
              </ActionTooltip>

              {/* Permissão restrita apenas para Administrador */}
              {isAdmin && (
                <>
                  <ActionTooltip content="Gera relatórios institucionais oficiais em formato impresso ou PDF.">
                    <button
                      onClick={() => handleNav('relatorios')}
                      className={getNavBtnClass(activeTab === 'relatorios')}
                      style={activeTab === 'relatorios' ? { backgroundColor: primaryColor } : undefined}
                      id="nav-relatorios"
                    >
                      <BookOpen className={`h-4 w-4 ${activeTab === 'relatorios' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>Relatórios Oficiais</span>
                    </button>
                  </ActionTooltip>

                  <ActionTooltip content="Exibe gráficos comparativos detalhados de desempenho, cobertura e taxas de aceitação.">
                    <button
                      onClick={() => handleNav('graficos')}
                      className={getNavBtnClass(activeTab === 'graficos')}
                      style={activeTab === 'graficos' ? { backgroundColor: primaryColor } : undefined}
                      id="nav-graficos"
                    >
                      <PieChart className={`h-4 w-4 ${activeTab === 'graficos' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>Gráficos Analíticos</span>
                    </button>
                  </ActionTooltip>

                  <ActionTooltip content="Gere as contas de acesso dos supervisores, coordenadores e administradores do sistema.">
                    <button
                      onClick={() => handleNav('utilizadores')}
                      className={getNavBtnClass(activeTab === 'utilizadores')}
                      style={activeTab === 'utilizadores' ? { backgroundColor: primaryColor } : undefined}
                      id="nav-utilizadores"
                    >
                      <Users className={`h-4 w-4 shrink-0 ${activeTab === 'utilizadores' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>Utilizadores</span>
                      {users.filter((u) => u.status === 'pendente').length > 0 && (
                        <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950 animate-pulse">
                          {users.filter((u) => u.status === 'pendente').length}
                        </span>
                      )}
                    </button>
                  </ActionTooltip>

                  <ActionTooltip content="Gere as unidades de coordenação provincial, municipal e locais de vacinação.">
                    <button
                      onClick={() => handleNav('coordenacoes')}
                      className={getNavBtnClass(activeTab === 'coordenacoes')}
                      style={activeTab === 'coordenacoes' ? { backgroundColor: primaryColor } : undefined}
                      id="nav-coordenacoes"
                    >
                      <Building2 className={`h-4 w-4 shrink-0 ${activeTab === 'coordenacoes' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>Coordenações</span>
                    </button>
                  </ActionTooltip>

                  {onOpenNotepad && (
                    <ActionTooltip content="Abre um bloco de notas privado para anotações rápidas e lembretes da administração.">
                      <button
                        onClick={() => {
                          onCloseMobile();
                          onOpenNotepad();
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#1596EC]/10 hover:text-[#1596EC] transition"
                        id="nav-notepad"
                      >
                        <div className="flex items-center gap-3">
                          <Notebook className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span>Bloco de Notas</span>
                        </div>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                          ADMIN
                        </span>
                      </button>
                    </ActionTooltip>
                  )}

                  {onOpenPortalNews && (
                    <ActionTooltip content="Publicar e gerir notícias, comunicados e avisos apresentados na página inicial do portal.">
                      <button
                        onClick={() => {
                          onCloseMobile();
                          onOpenPortalNews();
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-500 transition"
                        id="nav-portal-news"
                      >
                        <div className="flex items-center gap-3">
                          <Newspaper className="h-4 w-4 text-sky-500" />
                          <span>Notícias do Portal</span>
                        </div>
                        <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[9px] font-medium text-sky-500">
                          PORTAL
                        </span>
                      </button>
                    </ActionTooltip>
                  )}

                  {onOpenAuditLogs && (
                    <ActionTooltip content="Aceda ao registo detalhado de auditoria com todas as ações efetuadas na plataforma.">
                      <button
                        onClick={() => {
                          onCloseMobile();
                          onOpenAuditLogs();
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#1596EC]/10 hover:text-[#1596EC] transition"
                        id="nav-audit-logs"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-4 w-4 text-[#1596EC]" />
                          <span>Histórico de Auditoria</span>
                        </div>
                        <span className="rounded-full bg-[#1596EC]/10 border border-[#1596EC]/20 px-2 py-0.5 text-[9px] font-medium text-[#1596EC]">
                          AUDIT
                        </span>
                      </button>
                    </ActionTooltip>
                  )}
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Footer with Sidebar Color Switcher & Logout */}
        <div
          className="border-t p-3 space-y-2.5"
          style={{ borderColor: currentSidebarPreset.border }}
        >
          {/* Quick Sidebar Color Switcher Button */}
          <div className="space-y-1.5">
            <ActionTooltip content="Permite alterar a cor de fundo e aparência do menu de navegação lateral.">
              <button
                onClick={() => setColorPickerOpen(!colorPickerOpen)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-2xs ${
                  currentSidebarPreset.isDark
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
                title="Clique para alterar a cor do menu lateral"
                id="btn-sidebar-color"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-3.5 w-3.5 rounded-full border shrink-0 shadow-xs"
                    style={{ backgroundColor: currentSidebarPreset.bg, borderColor: currentSidebarPreset.border }}
                  />
                  <span className="truncate">Cor do Sidebar: {currentSidebarPreset.name.split(' ')[0]}</span>
                </div>
                <Palette className="h-4 w-4 shrink-0 text-blue-500" />
              </button>
            </ActionTooltip>

            {/* Sidebar Color Selector Dropdown */}
            {colorPickerOpen && (
              <div className="p-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 space-y-1.5 shadow-lg">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 px-1">
                  Selecione a Cor do Sidebar:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {SIDEBAR_COLORS.map((col) => {
                    const isSelected = activeSidebarColorId === col.id;
                    return (
                      <button
                        key={col.id}
                        onClick={() => {
                          handleSelectSidebarColor(col.id);
                          setColorPickerOpen(false);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition text-left ${
                          isSelected
                            ? 'ring-2 ring-blue-500 border-blue-600 font-extrabold'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-500'
                        }`}
                        style={{
                          backgroundColor: col.bg,
                          color: col.text,
                        }}
                      >
                        <span
                          className="h-3 w-3 rounded-full border shrink-0"
                          style={{ backgroundColor: col.bg, borderColor: col.border }}
                        />
                        <span className="truncate flex-1">{col.name.split(' ')[0]}</span>
                        {isSelected && <Check className="h-3 w-3 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ActionTooltip content="Encerra com segurança a sua sessão de utilizador no sistema.">
            <button
              onClick={onLogout}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition shadow-2xs ${
                currentSidebarPreset.isDark
                  ? 'border-white/20 bg-white/10 text-white hover:bg-red-600 hover:border-red-600'
                  : 'border-slate-300 bg-white text-slate-900 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
              }`}
              id="btn-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </ActionTooltip>
        </div>
      </aside>
    </>
  );
};
