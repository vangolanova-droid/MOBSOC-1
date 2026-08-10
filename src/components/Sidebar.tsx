import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Plus,
  FileText,
  Users,
  Wallet,
  Clock,
  Smartphone,
  BadgeCheck,
  Database,
  FileBarChart,
  PieChart,
  UserCog,
  Network,
  NotebookPen,
  Newspaper,
  History,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Palette,
  Check,
  Building2,
  FolderKanban,
  UserCheck2,
  ListFilter,
  FilePlus,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Notebook,
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
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
  const alertStatus = useMemo(() => {
    if (isAdmin) {
      const supervisores = users.filter(
        (u) => u.tipo === 'user' || u.tipo === 'supervisor' || u.tipo === 'coordenador'
      );
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

  const pendingOdkCount = useMemo(() => {
    if (isAdmin) {
      return odkSubmissions.filter((s) => s.status === 'pendente').length;
    }
    return odkSubmissions.filter((s) => s.supervisorId === user.id && s.status === 'pendente').length;
  }, [isAdmin, odkSubmissions, user.id]);

  const pendingUsersCount = useMemo(() => {
    return users.filter((u) => u.status === 'pendente').length;
  }, [users]);

  const handleNav = (tab: string) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const primaryColor = currentPalette?.colors?.primary || '#2563EB';

  // Helper for item classes
  const getItemClass = (isActive: boolean) => {
    if (isActive) {
      return 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold shadow-md';
    }
    return 'text-[#A1A1AA] hover:bg-[#27272A] hover:text-white font-medium';
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#18181B] text-white border-r border-[#27272A] transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen shrink-0 ${
          isOpen
            ? isCollapsed
              ? 'w-72 md:w-20 translate-x-0'
              : 'w-72 translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-20 overflow-hidden'
        }`}
        id="app-sidebar"
      >
        {/* Header Branding & Collapse Toggle */}
        <div className="flex h-16 items-center justify-between border-b border-[#27272A] px-3.5 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-white truncate">
                  Gestão Vacinação
                </h2>
                <p className="text-[10px] font-semibold text-[#A1A1AA] truncate">
                  Portal Institucional
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] text-white font-black shadow-sm">
              <Database className="h-5 w-5" />
            </div>
          )}

          {/* Expand / Collapse Button (Desktop) & Close (Mobile) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#27272A] hover:text-white transition cursor-pointer"
              title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
              id="btn-toggle-collapse-sidebar"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#27272A] hover:text-white transition cursor-pointer"
              title="Fechar Menu"
              id="btn-close-mobile-sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items Container */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* 1. PRINCIPAL */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                PRINCIPAL
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            <ActionTooltip content="Dashboard — Painel principal de estatísticas e metas" side="right">
              <button
                onClick={() => handleNav('dashboard')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'dashboard'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-dashboard"
              >
                <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
                {!isCollapsed && <span>Dashboard</span>}
              </button>
            </ActionTooltip>
          </div>

          {/* 2. REGISTOS DE CAMPO */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                REGISTOS DE CAMPO
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            <ActionTooltip content="Nova Ficha — Registar nova ficha de campo" side="right">
              <button
                onClick={() => handleNav('ficha')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'ficha'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-nova-ficha"
              >
                <Plus className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
                {!isCollapsed && <span>Nova Ficha</span>}
              </button>
            </ActionTooltip>

            <ActionTooltip content="Fichas Registadas — Lista completa de fichas submetidas" side="right">
              <button
                onClick={() => handleNav('listFichas')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'listFichas'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-fichas-registadas"
              >
                <FileText className="h-4.5 w-4.5 shrink-0" />
                {!isCollapsed && <span>Fichas Registadas</span>}
              </button>
            </ActionTooltip>
          </div>

          {/* 3. RH-MC */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                RH-MC
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            <ActionTooltip content="Mobilizadores (RH-MC) — Recursos Humanos de Mobilização" side="right">
              <button
                onClick={() => handleNav('mobilizadores')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'mobilizadores' ||
                    activeTab === 'verMobilizadores' ||
                    activeTab === 'cadastrarMobilizador'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-mobilizadores"
              >
                <Users className="h-4.5 w-4.5 shrink-0" />
                {!isCollapsed && <span>Mobilizadores (RH-MC)</span>}
              </button>
            </ActionTooltip>
          </div>

          {/* 4. FINANÇAS & MONITORIZAÇÃO */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                FINANÇAS & MONITORIZAÇÃO
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            {isAdmin && (
              <ActionTooltip content="Finanças & Subsídios — Gestão financeira e pagamentos" side="right">
                <button
                  onClick={() => handleNav('financas')}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                    activeTab === 'financas'
                  )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                  id="nav-financas"
                >
                  <Wallet className="h-4.5 w-4.5 shrink-0 text-amber-400" />
                  {!isCollapsed && <span>Finanças & Subsídios</span>}
                </button>
              </ActionTooltip>
            )}

            <ActionTooltip content="Controlo de Atrasos — Monitorização de submissões em tempo real" side="right">
              <button
                onClick={() => handleNav('atrasos')}
                className={`relative flex w-full items-center ${
                  isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                } py-2.5 text-xs transition cursor-pointer rounded-xl ${getItemClass(
                  activeTab === 'atrasos'
                )}`}
                id="nav-atrasos"
              >
                {!isCollapsed ? (
                  <>
                    <div className="flex items-center gap-3 truncate">
                      <Clock className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                      <span className="truncate">
                        {isAdmin ? 'Controlo de Atrasos' : 'Alertas de Atraso'}
                      </span>
                    </div>
                    {alertStatus.hasAlert && (
                      <span className="shrink-0 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2">
                        {isAdmin ? alertStatus.count : '!'}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                    {alertStatus.hasAlert && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </>
                )}
              </button>
            </ActionTooltip>
          </div>

          {/* 5. ODK COLLECT */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                ODK COLLECT
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            <ActionTooltip content="ODK Collect Central — Painel de dados ODK" side="right">
              <button
                onClick={() => handleNav('odk')}
                className={`relative flex w-full items-center ${
                  isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                } py-2.5 text-xs transition cursor-pointer rounded-xl ${getItemClass(
                  activeTab === 'odk'
                )}`}
                id="nav-odk-central"
              >
                {!isCollapsed ? (
                  <>
                    <div className="flex items-center gap-3 truncate">
                      <Smartphone className="h-4.5 w-4.5 shrink-0 text-sky-400" />
                      <span className="truncate">ODK Collect Central</span>
                    </div>
                    {pendingOdkCount > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2">
                        {pendingOdkCount}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Smartphone className="h-5 w-5 shrink-0 text-sky-400" />
                    {pendingOdkCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </>
                )}
              </button>
            </ActionTooltip>

            <ActionTooltip content="Confirmação ODK — Validação de capturas de ecrã e ficheiros" side="right">
              <button
                onClick={() => handleNav('odk')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'odk'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-odk-confirmacao"
              >
                <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
                {!isCollapsed && <span>Confirmação ODK</span>}
              </button>
            </ActionTooltip>
          </div>

          {/* 6. ADMINISTRAÇÃO & ANÁLISE */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                ADMINISTRAÇÃO & ANÁLISE
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            <ActionTooltip content="Consolidado — Resumo de estatísticas acumuladas" side="right">
              <button
                onClick={() => handleNav('consolidado')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'consolidado'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-consolidado"
              >
                <Database className="h-4.5 w-4.5 shrink-0" />
                {!isCollapsed && <span>Consolidado</span>}
              </button>
            </ActionTooltip>

            {isAdmin && (
              <>
                <ActionTooltip content="Relatórios Oficiais — Relatórios estruturados para impressão/PDF" side="right">
                  <button
                    onClick={() => handleNav('relatorios')}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                      activeTab === 'relatorios'
                    )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                    id="nav-relatorios"
                  >
                    <FileBarChart className="h-4.5 w-4.5 shrink-0 text-purple-400" />
                    {!isCollapsed && <span>Relatórios Oficiais</span>}
                  </button>
                </ActionTooltip>

                <ActionTooltip content="Gráficos Analíticos — Visualizações gráficas de cobertura e metas" side="right">
                  <button
                    onClick={() => handleNav('graficos')}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                      activeTab === 'graficos'
                    )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                    id="nav-graficos"
                  >
                    <PieChart className="h-4.5 w-4.5 shrink-0 text-indigo-400" />
                    {!isCollapsed && <span>Gráficos Analíticos</span>}
                  </button>
                </ActionTooltip>

                <ActionTooltip content="Utilizadores — Gestão de contas de utilizadores do sistema" side="right">
                  <button
                    onClick={() => handleNav('utilizadores')}
                    className={`relative flex w-full items-center ${
                      isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                    } py-2.5 text-xs transition cursor-pointer rounded-xl ${getItemClass(
                      activeTab === 'utilizadores'
                    )}`}
                    id="nav-utilizadores"
                  >
                    {!isCollapsed ? (
                      <>
                        <div className="flex items-center gap-3 truncate">
                          <UserCog className="h-4.5 w-4.5 shrink-0 text-blue-400" />
                          <span className="truncate">Utilizadores</span>
                        </div>
                        {pendingUsersCount > 0 && (
                          <span className="shrink-0 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 animate-pulse">
                            {pendingUsersCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <UserCog className="h-5 w-5 shrink-0 text-blue-400" />
                        {pendingUsersCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </>
                    )}
                  </button>
                </ActionTooltip>

                <ActionTooltip content="Coordenações — Gestão das coordenações provinciais e municipais" side="right">
                  <button
                    onClick={() => handleNav('coordenacoes')}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                      activeTab === 'coordenacoes'
                    )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                    id="nav-coordenacoes"
                  >
                    <Network className="h-4.5 w-4.5 shrink-0 text-teal-400" />
                    {!isCollapsed && <span>Coordenações</span>}
                  </button>
                </ActionTooltip>
              </>
            )}
          </div>

          {/* 7. FERRAMENTAS */}
          {onOpenNotepad && isAdmin && (
            <div className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                  FERRAMENTAS
                </div>
              ) : (
                <div className="h-px bg-[#27272A] my-2" />
              )}

              <ActionTooltip content="Bloco de Notas — Anotações e relatórios rápidos da administração" side="right">
                <button
                  onClick={() => {
                    onCloseMobile();
                    onOpenNotepad();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer text-[#A1A1AA] hover:bg-[#27272A] hover:text-white font-medium ${
                    isCollapsed ? 'justify-center px-0' : ''
                  }`}
                  id="nav-bloco-notas"
                >
                  <NotebookPen className="h-4.5 w-4.5 shrink-0 text-amber-400" />
                  {!isCollapsed && <span>Bloco de Notas</span>}
                </button>
              </ActionTooltip>
            </div>
          )}

          {/* 8. PORTAL */}
          {onOpenPortalNews && isAdmin && (
            <div className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                  PORTAL
                </div>
              ) : (
                <div className="h-px bg-[#27272A] my-2" />
              )}

              <ActionTooltip content="Notícias do Portal — Comunicados e anúncios institucionais" side="right">
                <button
                  onClick={() => {
                    onCloseMobile();
                    onOpenPortalNews();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer text-[#A1A1AA] hover:bg-[#27272A] hover:text-white font-medium ${
                    isCollapsed ? 'justify-center px-0' : ''
                  }`}
                  id="nav-noticias-portal"
                >
                  <Newspaper className="h-4.5 w-4.5 shrink-0 text-sky-400" />
                  {!isCollapsed && <span>Notícias do Portal</span>}
                </button>
              </ActionTooltip>
            </div>
          )}

          {/* 9. AUDITORIA */}
          {onOpenAuditLogs && isAdmin && (
            <div className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                  AUDITORIA
                </div>
              ) : (
                <div className="h-px bg-[#27272A] my-2" />
              )}

              <ActionTooltip content="Histórico de Auditoria — Registos e logs de segurança" side="right">
                <button
                  onClick={() => {
                    onCloseMobile();
                    onOpenAuditLogs();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer text-[#A1A1AA] hover:bg-[#27272A] hover:text-white font-medium ${
                    isCollapsed ? 'justify-center px-0' : ''
                  }`}
                  id="nav-historico-auditoria"
                >
                  <History className="h-4.5 w-4.5 shrink-0 text-blue-400" />
                  {!isCollapsed && <span>Histórico de Auditoria</span>}
                </button>
              </ActionTooltip>
            </div>
          )}

          {/* 10. ADMIN */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-extrabold tracking-wider text-[#A1A1AA] uppercase">
                ADMIN
              </div>
            ) : (
              <div className="h-px bg-[#27272A] my-2" />
            )}

            <ActionTooltip content="Administração — Configurações do perfil e preferências" side="right">
              <button
                onClick={() => handleNav('perfil')}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${getItemClass(
                  activeTab === 'perfil'
                )} ${isCollapsed ? 'justify-center px-0' : ''}`}
                id="nav-administracao"
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
                {!isCollapsed && <span>Administração</span>}
              </button>
            </ActionTooltip>
          </div>
        </nav>

        {/* Bottom Profile & Logout Footer */}
        <div className="border-t border-[#27272A] p-2.5 space-y-2 bg-[#18181B] shrink-0">
          {/* User Profile Card */}
          <ActionTooltip content="Meu Perfil — Gerir dados pessoais e palavra-passe" side="right">
            <div
              onClick={() => handleNav('perfil')}
              className={`flex items-center gap-2.5 rounded-xl border border-[#27272A] bg-[#27272A]/50 p-2 text-white hover:bg-[#27272A] cursor-pointer transition ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              id="btn-sidebar-user-profile"
            >
              <div
                className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold text-xs text-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {user.fotoUrl ? (
                  <img src={user.fotoUrl} alt={user.nome} className="h-full w-full object-cover" />
                ) : (
                  <span>{user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1 text-xs font-bold text-white">
                    <span className="truncate">{user.nome}</span>
                    <span className="shrink-0 rounded-md bg-[#3F3F46] px-1.5 py-0.2 text-[9px] font-extrabold text-[#A1A1AA]">
                      {isAdmin ? 'Admin' : 'Sup'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] truncate">
                    {user.coordNome || 'Direção Geral'}
                  </p>
                </div>
              )}
            </div>
          </ActionTooltip>

          {/* Sair (Logout) Button */}
          <ActionTooltip content="Sair do sistema" side="right">
            <button
              onClick={onLogout}
              className={`flex w-full items-center gap-2.5 rounded-xl border border-[#3F3F46]/60 bg-[#27272A]/30 py-2 px-3 text-xs font-bold text-[#A1A1AA] hover:bg-red-600/90 hover:border-red-600 hover:text-white transition cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              id="btn-sidebar-logout"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          </ActionTooltip>
        </div>
      </aside>
    </>
  );
};

