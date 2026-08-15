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
  ShieldAlert,
  Notebook,
  ShieldCheck,
  Wallet,
  Palette,
  Check,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  Newspaper,
  MessageSquareWarning,
  UserPlus,
  Settings,
} from 'lucide-react';
import { User, Ficha, ODKSubmission } from '../types';
import { Tooltip as ActionTooltip } from './Tooltip';
import { hasElevatedAccess, isAdmin as checkIsAdmin, isReadOnlyEvaluator } from '../utils/permissions';
import { SettingsModal } from './SettingsModal';
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: 'light' | 'dark';
  currentPalette?: Theme;
  themeConfig?: UserThemeConfig;
  onSelectPalette?: (palette: Theme) => void;
  onUpdateThemeConfig?: (config: UserThemeConfig) => void;
  onToggleTheme?: () => void;
  onOpenAiModal?: () => void;
  onSelectTab: (tab: string) => void;
  onOpenNotepad?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenPortalNews?: () => void;
  onOpenCadastroHub?: (type?: 'mobilizador' | 'supervisor' | 'admin_junior' | 'admin') => void;
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
  isCollapsed: propIsCollapsed,
  onToggleCollapse,
  theme = 'light',
  currentPalette,
  themeConfig,
  onSelectPalette,
  onUpdateThemeConfig,
  onToggleTheme,
  onOpenAiModal,
  onSelectTab,
  onOpenNotepad,
  onOpenAuditLogs,
  onOpenPortalNews,
  onOpenCadastroHub,
  onLogout,
  onCloseMobile,
}) => {
  const isAdmin = user.tipo === 'admin';
  const isElevated = hasElevatedAccess(user);
  const todayStr = new Date().toISOString().split('T')[0];
  const [colorPickerOpen, setColorPickerOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);

  // Synchronize internal collapsed state with prop if provided
  const isCollapsed = propIsCollapsed ?? internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

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

  const pendingUsersCount = React.useMemo(() => {
    return users.filter((u) => u.status === 'pendente').length;
  }, [users]);

  // Handle navigation and always close mobile menu after selection
  const handleNav = (tab: string) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const primaryColor = currentPalette?.colors?.primary || '#00B2FF';
  const textContrastClass = currentSidebarPreset.isDark ? 'text-white' : 'text-slate-900';
  const subtextContrastClass = currentSidebarPreset.isDark ? 'text-slate-200' : 'text-slate-800';

  // Helper renderer for unified navigation items
  const renderNavItem = ({
    id,
    tab,
    label,
    icon: Icon,
    iconColor = 'text-sky-500',
    tooltip,
    badge,
    onClick,
  }: {
    id: string;
    tab?: string;
    label: string;
    icon: React.ElementType;
    iconColor?: string;
    tooltip: string;
    badge?: React.ReactNode;
    onClick?: () => void;
  }) => {
    const isActive = tab
      ? activeTab === tab ||
        (tab === 'mobilizadores' &&
          (activeTab === 'verMobilizadores' || activeTab === 'cadastrarMobilizador'))
      : false;

    const handleClick = () => {
      if (onClick) {
        onClick();
        onCloseMobile();
      } else if (tab) {
        handleNav(tab);
      }
    };

    if (isCollapsed) {
      return (
        <ActionTooltip content={tooltip} key={id}>
          <button
            onClick={handleClick}
            className={`relative flex h-10 w-10 items-center justify-center mx-auto rounded-xl transition cursor-pointer ${
              isActive
                ? 'text-white shadow-xs font-bold'
                : currentSidebarPreset.isDark
                ? 'hover:bg-white/15'
                : 'hover:bg-slate-200/80'
            }`}
            style={isActive ? { backgroundColor: primaryColor } : undefined}
            id={id}
            title={label}
          >
            <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : iconColor}`} />
            {badge && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-950 shadow-xs animate-pulse">
                {typeof badge === 'number' || typeof badge === 'string' ? badge : ''}
              </span>
            )}
          </button>
        </ActionTooltip>
      );
    }

    return (
      <ActionTooltip content={tooltip} key={id}>
        <button
          onClick={handleClick}
          className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2.5 text-xs transition cursor-pointer ${
            isActive
              ? 'text-white font-bold shadow-xs'
              : currentSidebarPreset.isDark
              ? 'font-semibold text-slate-100 hover:bg-white/10 hover:text-white'
              : 'font-bold text-slate-800 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
          style={isActive ? { backgroundColor: primaryColor } : undefined}
          id={id}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive ? 'text-white' : iconColor
              }`}
            />
            <span className="truncate">{label}</span>
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </button>
      </ActionTooltip>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen shrink-0 overflow-y-auto ${
          isOpen
            ? isCollapsed
              ? 'w-72 translate-x-0 opacity-100 md:w-20'
              : 'w-72 translate-x-0 opacity-100 md:w-68'
            : isCollapsed
            ? '-translate-x-full opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto md:w-20'
            : '-translate-x-full opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto md:w-68'
        }`}
        style={{
          backgroundColor: currentSidebarPreset.bg,
          color: currentSidebarPreset.text,
          borderColor: currentSidebarPreset.border,
        }}
      >
        {/* User Card Header & Toggle Sidebar Button */}
        <div
          className="border-b p-2.5 flex items-center justify-between gap-2 shrink-0"
          style={{ borderColor: currentSidebarPreset.border }}
        >
          {!isCollapsed ? (
            <>
              <div className="flex-1 min-w-0">
                <ActionTooltip content="Abre as definições do seu perfil de utilizador, onde pode alterar dados pessoais, senha e foto.">
                  <div
                    onClick={() => handleNav('perfil')}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 shadow-2xs cursor-pointer transition group w-full ${
                      currentSidebarPreset.isDark
                        ? 'bg-white/10 border-white/20 hover:bg-white/20'
                        : 'bg-slate-100 border-slate-300 hover:bg-slate-200/80'
                    }`}
                    title="Clique para abrir e gerir Meu Perfil"
                    id="nav-perfil-header"
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
                      <div
                        className={`text-xs font-extrabold truncate group-hover:opacity-80 transition ${textContrastClass}`}
                        title={user.nome}
                      >
                        {user.nome}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold border"
                          style={{
                            backgroundColor: currentSidebarPreset.isDark ? 'rgba(255,255,255,0.2)' : `${primaryColor}15`,
                            color: currentSidebarPreset.isDark ? '#FFFFFF' : primaryColor,
                            borderColor: currentSidebarPreset.isDark ? 'rgba(255,255,255,0.4)' : `${primaryColor}30`,
                          }}
                        >
                          {user.tipo === 'admin' ? 'Admin' : 'Sup'}
                        </span>
                        <span className={`text-[10px] font-semibold truncate ${subtextContrastClass}`}>
                          {user.coordNome || 'Direção Geral'}
                        </span>
                      </div>
                    </div>
                  </div>
                </ActionTooltip>
              </div>

              <ActionTooltip content="Recolher Menu Lateral">
                <button
                  onClick={toggleCollapse}
                  className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                    currentSidebarPreset.isDark
                      ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
                      : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Recolher Menu Lateral"
                  id="btn-hide-sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </ActionTooltip>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <ActionTooltip content="Meu Perfil - Aceder às definições do perfil">
                <button
                  onClick={() => handleNav('perfil')}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-white font-bold text-xs shadow-xs border transition cursor-pointer hover:ring-2 hover:ring-sky-400"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  title={user.nome}
                  id="nav-perfil-recolhido"
                >
                  {user.fotoUrl ? (
                    <img src={user.fotoUrl} alt={user.nome} className="h-full w-full object-cover" />
                  ) : (
                    <span>{user.nome.charAt(0).toUpperCase()}</span>
                  )}
                </button>
              </ActionTooltip>

              <ActionTooltip content="Expandir Menu Lateral">
                <button
                  onClick={toggleCollapse}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    currentSidebarPreset.isDark
                      ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
                      : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Expandir Menu Lateral"
                  id="btn-expand-sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </ActionTooltip>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Main Section */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Principal
              </div>
            ) : (
              <div className="my-1 border-t border-slate-300/30 dark:border-slate-700/50 mx-2" />
            )}
            <div className="space-y-1">
              {renderNavItem({
                id: 'nav-dashboard',
                tab: 'dashboard',
                label: 'Dashboard',
                icon: LayoutDashboard,
                iconColor: 'text-sky-400',
                tooltip: 'Visualiza o painel principal de indicadores e gráficos.',
              })}
            </div>
          </div>

          {/* Grupo 1: REGISTOS DE CAMPO */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Registos de Campo
              </div>
            ) : (
              <div className="my-1 border-t border-slate-300/30 dark:border-slate-700/50 mx-2" />
            )}
            <div className="space-y-1">
              {renderNavItem({
                id: 'nav-ficha',
                tab: 'ficha',
                label: 'Nova Ficha',
                icon: FilePlus,
                iconColor: 'text-emerald-400',
                tooltip: 'Abre o formulário para registar uma nova ficha.',
              })}
              {renderNavItem({
                id: 'nav-rumores',
                tab: 'rumores',
                label: 'Gestão de Rumores (6-Ficha)',
                icon: MessageSquareWarning,
                iconColor: 'text-amber-400',
                tooltip: '6 - Ficha de Gestão de Rumores e Comunicação de Risco (Supervisores e Coordenação).',
                badge: (
                  <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-extrabold">
                    RCCE
                  </span>
                ),
              })}
              {renderNavItem({
                id: 'nav-listFichas',
                tab: 'listFichas',
                label: 'Fichas Registadas',
                icon: ListFilter,
                iconColor: 'text-blue-400',
                tooltip: 'Aceda à lista de todas as fichas submetidas.',
              })}
              {renderNavItem({
                id: 'nav-casos-pfa',
                tab: 'casosPFA',
                label: 'Casos de PFA (Vigilância)',
                icon: ShieldAlert,
                iconColor: 'text-rose-500',
                tooltip: 'Vigilância Epidemiológica de Paralisia Flácida Aguda e Notificação Pólio (UNICEF/WHO).',
                badge: (
                  <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[9px] font-extrabold animate-pulse">
                    PFA
                  </span>
                ),
              })}
            </div>
          </div>

          {/* Grupo 2: RH-MC (Mobilizadores) */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                RH-MC (Mobilizadores)
              </div>
            ) : (
              <div className="my-1 border-t border-slate-300/30 dark:border-slate-700/50 mx-2" />
            )}
            <div className="space-y-1">
              {renderNavItem({
                id: 'nav-mobilizadores',
                tab: 'mobilizadores',
                label: 'Mobilizadores (RH-MC)',
                icon: UserCheck2,
                iconColor: 'text-purple-400',
                tooltip: 'Gere e visualiza a lista de mobilizadores comunitários.',
              })}
              {isElevated &&
                renderNavItem({
                  id: 'nav-financas',
                  tab: 'financas',
                  label: 'Finanças & Subsídios',
                  icon: Wallet,
                  iconColor: 'text-amber-400',
                  tooltip: 'Controlo financeiro de pagamentos e subsidiação.',
                })}
              {user.tipo === 'supervisor' && onOpenCadastroHub &&
                renderNavItem({
                  id: 'nav-cadastrar-mobilizador-sidebar',
                  label: 'Cadastrar Mobilizador',
                  icon: UserPlus,
                  iconColor: 'text-purple-400',
                  tooltip: 'Registar novo mobilizador comunitário sob a sua supervisão.',
                  badge: (
                    <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[9px] font-black text-purple-400">
                      NOVO
                    </span>
                  ),
                  onClick: () => onOpenCadastroHub('mobilizador'),
                })}
            </div>
          </div>

          {/* Grupo 3: MONITORIZAÇÃO & ATRASOS */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Monitorização & Atrasos
              </div>
            ) : (
              <div className="my-1 border-t border-slate-300/30 dark:border-slate-700/50 mx-2" />
            )}
            <div className="space-y-1">
              {renderNavItem({
                id: 'nav-atrasos',
                tab: 'atrasos',
                label: isElevated ? 'Controlo de Atrasos' : 'Alertas de Atraso',
                icon: ShieldAlert,
                iconColor: 'text-rose-400',
                tooltip: 'Monitoriza em tempo real as submissões e atrasos.',
                badge: alertStatus.hasAlert ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      activeTab === 'atrasos'
                        ? 'bg-white text-slate-900'
                        : 'bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    }`}
                    style={activeTab === 'atrasos' ? { color: primaryColor } : undefined}
                  >
                    {isElevated ? alertStatus.count : '!'}
                  </span>
                ) : undefined,
              })}
            </div>
          </div>

          {/* Grupo 4: INTEGRAÇÃO ODK COLLECT */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                ODK Collect Central
              </div>
            ) : (
              <div className="my-1 border-t border-slate-300/30 dark:border-slate-700/50 mx-2" />
            )}
            <div className="space-y-1">
              {renderNavItem({
                id: 'nav-odk-collect',
                tab: 'odk',
                label: 'Confirmação ODK',
                icon: Smartphone,
                iconColor: 'text-teal-400',
                tooltip: 'Aprovação e gestão de formulários ODK Collect.',
                badge:
                  pendingOdkCount > 0 ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        activeTab === 'odk'
                          ? 'bg-white text-emerald-700'
                          : 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {pendingOdkCount}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                      ODK
                    </span>
                  ),
              })}
            </div>
          </div>

          {/* Admin Section */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {user.tipo === 'admin_junior'
                  ? 'Avaliação Institucional UNICEF'
                  : isElevated
                  ? 'Administração & Análise'
                  : 'Análise Operacional'}
              </div>
            ) : (
              <div className="my-1 border-t border-slate-300/30 dark:border-slate-700/50 mx-2" />
            )}
            <div className="space-y-1">
              {renderNavItem({
                id: 'nav-consolidado',
                tab: 'consolidado',
                label: 'Consolidado',
                icon: BarChart3,
                iconColor: 'text-fuchsia-400',
                tooltip: 'Apresenta o resumo consolidado dos dados.',
              })}

              {isElevated && (
                <>
                  {renderNavItem({
                    id: 'nav-relatorios',
                    tab: 'relatorios',
                    label: 'Relatórios Oficiais',
                    icon: BookOpen,
                    iconColor: 'text-indigo-400',
                    tooltip: 'Gera relatórios institucionais oficiais.',
                  })}
                  {renderNavItem({
                    id: 'nav-graficos',
                    tab: 'graficos',
                    label: 'Gráficos Analíticos',
                    icon: PieChart,
                    iconColor: 'text-pink-400',
                    tooltip: 'Exibe gráficos comparativos detalhados.',
                  })}
                  {renderNavItem({
                    id: 'nav-utilizadores',
                    tab: 'utilizadores',
                    label: 'Utilizadores',
                    icon: Users,
                    iconColor: 'text-orange-400',
                    tooltip: 'Gere as contas de acesso do sistema.',
                    badge:
                      pendingUsersCount > 0 ? (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950 animate-pulse">
                          {pendingUsersCount}
                        </span>
                      ) : undefined,
                  })}
                  {renderNavItem({
                    id: 'nav-coordenacoes',
                    tab: 'coordenacoes',
                    label: 'Coordenações',
                    icon: Building2,
                    iconColor: 'text-cyan-400',
                    tooltip: 'Gere as unidades de coordenação e locais.',
                  })}

                  {onOpenNotepad && isAdmin &&
                    renderNavItem({
                      id: 'nav-notepad',
                      label: 'Bloco de Notas',
                      icon: Notebook,
                      iconColor: 'text-amber-400',
                      tooltip: 'Bloco de notas privado da administração.',
                      badge: (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                          ADMIN
                        </span>
                      ),
                      onClick: onOpenNotepad,
                    })}

                  {onOpenPortalNews && isAdmin &&
                    renderNavItem({
                      id: 'nav-portal-news',
                      label: 'Notícias do Portal',
                      icon: Newspaper,
                      iconColor: 'text-sky-400',
                      tooltip: 'Publicar e gerir notícias do portal.',
                      badge: (
                        <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[9px] font-medium text-sky-500">
                          PORTAL
                        </span>
                      ),
                      onClick: onOpenPortalNews,
                    })}

                  {onOpenCadastroHub && isAdmin &&
                    renderNavItem({
                      id: 'nav-central-cadastro',
                      label: 'Cadastrar...',
                      icon: UserPlus,
                      iconColor: 'text-purple-400',
                      tooltip: 'Central única de cadastros: Mobilizadores (RH-MC), Supervisores, Avaliador UNICEF e Administradores.',
                      badge: (
                        <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[9px] font-black text-purple-400">
                          CADASTRO
                        </span>
                      ),
                      onClick: () => onOpenCadastroHub(),
                    })}

                  {onOpenAuditLogs &&
                    renderNavItem({
                      id: 'nav-audit-logs',
                      label: 'Histórico de Auditoria',
                      icon: ShieldCheck,
                      iconColor: 'text-emerald-400',
                      tooltip: 'Aceda ao registo detalhado de auditoria.',
                      badge: (
                        <span className="rounded-full bg-[#1596EC]/10 border border-[#1596EC]/20 px-2 py-0.5 text-[9px] font-medium text-[#1596EC]">
                          AUDIT
                        </span>
                      ),
                      onClick: onOpenAuditLogs,
                    })}
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Footer with Sidebar Color Switcher & Logout */}
        <div
          className="border-t p-2 space-y-2 shrink-0"
          style={{ borderColor: currentSidebarPreset.border }}
        >
          {/* Sidebar Color Selector */}
          {!isCollapsed ? (
            <div className="space-y-1.5">
              <ActionTooltip content="Permite alterar a cor de fundo e aparência do menu de navegação lateral.">
                <button
                  onClick={() => setColorPickerOpen(!colorPickerOpen)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-2xs cursor-pointer ${
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
                      style={{
                        backgroundColor: currentSidebarPreset.bg,
                        borderColor: currentSidebarPreset.border,
                      }}
                    />
                    <span className="truncate">Cor: {currentSidebarPreset.name.split(' ')[0]}</span>
                  </div>
                  <Palette className="h-4 w-4 shrink-0 text-sky-500" />
                </button>
              </ActionTooltip>

              {colorPickerOpen && (
                <div className="p-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 space-y-1.5 shadow-lg">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 px-1">
                    Selecione a Cor:
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
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition text-left cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-sky-500 border-sky-600 font-extrabold'
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
          ) : (
            <div className="relative">
              <ActionTooltip content="Alterar a cor do menu lateral">
                <button
                  onClick={() => setColorPickerOpen(!colorPickerOpen)}
                  className={`flex h-10 w-10 items-center justify-center mx-auto rounded-xl border transition cursor-pointer ${
                    currentSidebarPreset.isDark
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                  }`}
                  id="btn-sidebar-color-recolhido"
                >
                  <Palette className="h-5 w-5 text-sky-500" />
                </button>
              </ActionTooltip>

              {colorPickerOpen && (
                <div className="absolute bottom-12 left-12 z-50 w-48 p-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 space-y-1.5 shadow-2xl">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 px-1">
                    Cor do Sidebar:
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {SIDEBAR_COLORS.map((col) => {
                      const isSelected = activeSidebarColorId === col.id;
                      return (
                        <button
                          key={col.id}
                          onClick={() => {
                            handleSelectSidebarColor(col.id);
                            setColorPickerOpen(false);
                          }}
                          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition text-left cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-sky-500 border-sky-600'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
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
                          <span className="truncate flex-1">{col.name}</span>
                          {isSelected && <Check className="h-3 w-3 shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão de Configurações do Sistema - Debaixo da Cor do Sidebar */}
          {!isCollapsed ? (
            <ActionTooltip content="Configurações do Sistema: temas, fontes, cantos arredondados e modo escuro.">
              <button
                onClick={() => setSettingsOpen(true)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-2xs cursor-pointer ${
                  currentSidebarPreset.isDark
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
                title="Clique para abrir as Configurações do Sistema"
                id="btn-sidebar-configuracoes"
              >
                <div className="flex items-center gap-2 truncate">
                  <Settings className="h-4 w-4 shrink-0 text-blue-500 animate-spin-slow" />
                  <span className="truncate">Configurações</span>
                </div>
                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  Sistema
                </span>
              </button>
            </ActionTooltip>
          ) : (
            <ActionTooltip content="Configurações do Sistema">
              <button
                onClick={() => setSettingsOpen(true)}
                className={`flex h-10 w-10 items-center justify-center mx-auto rounded-xl border transition cursor-pointer ${
                  currentSidebarPreset.isDark
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
                title="Configurações do Sistema"
                id="btn-sidebar-configuracoes-recolhido"
              >
                <Settings className="h-5 w-5 text-blue-500" />
              </button>
            </ActionTooltip>
          )}

          {/* Logout Button */}
          {renderNavItem({
            id: 'btn-logout',
            label: 'Sair',
            icon: LogOut,
            tooltip: 'Encerra a sua sessão no sistema com segurança.',
            onClick: () => {
              onLogout();
              onCloseMobile();
            },
          })}
        </div>
      </aside>

      {/* Modal de Configurações do Sistema */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        theme={theme}
        currentPalette={currentPalette}
        themeConfig={themeConfig}
        onSelectPalette={onSelectPalette}
        onUpdateThemeConfig={onUpdateThemeConfig}
        onToggleTheme={onToggleTheme}
        onOpenAiModal={onOpenAiModal}
        onOpenNotepad={onOpenNotepad}
        onOpenPortalNews={onOpenPortalNews}
        onOpenAuditLogs={onOpenAuditLogs}
      />
    </>
  );
};

