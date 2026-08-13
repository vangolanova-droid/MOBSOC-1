import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Menu,
  Wifi,
  WifiOff,
  Notebook,
  Sun,
  Moon,
  ShieldCheck,
  Printer,
  Palette,
  X,
  Check,
  Type,
  LayoutGrid,
  FileSpreadsheet,
  Newspaper,
  Settings,
  Bell,
  BellOff,
  FileText,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  ExternalLink,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { Coordination, User, Ficha, ODKSubmission, AuditLog, Mobilizador } from '../types';
import { Tooltip as ActionTooltip } from './Tooltip';
import { ActiveSupervisorsModal } from './ActiveSupervisorsModal';
import {
  Theme,
  THEMES,
  AVAILABLE_FONTS,
  SIDEBAR_COLORS,
  UserThemeConfig,
  saveUserConfig,
  applyThemeVariables,
  getUserConfig,
} from '../utils/theme';

export interface HeaderNotification {
  id: string;
  type: 'ficha' | 'odk' | 'audit' | 'user';
  title: string;
  subtitle: string;
  details?: string;
  timestamp: string;
  severity: 'high' | 'medium' | 'info';
  tabTarget?: string;
  actionLabel?: string;
}

interface HeaderProps {
  user: User;
  coordenacoes?: Coordination[];
  fichas?: Ficha[];
  odkSubmissions?: ODKSubmission[];
  auditLogs?: AuditLog[];
  users?: User[];
  mobilizadores?: Mobilizador[];
  isOnline: boolean;
  theme?: 'light' | 'dark';
  currentPalette?: Theme;
  themeConfig?: UserThemeConfig;
  onSelectPalette?: (palette: Theme) => void;
  onUpdateThemeConfig?: (config: UserThemeConfig) => void;
  onToggleTheme?: () => void;
  onToggleSidebar: () => void;
  onNewFicha: () => void;
  onOpenAiModal: () => void;
  onOpenNotepad?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenPortalNews?: () => void;
  onSelectTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  coordenacoes,
  fichas = [],
  odkSubmissions = [],
  auditLogs = [],
  users = [],
  mobilizadores = [],
  isOnline,
  theme = 'light',
  currentPalette,
  themeConfig,
  onSelectPalette,
  onUpdateThemeConfig,
  onToggleTheme,
  onToggleSidebar,
  onNewFicha,
  onOpenAiModal,
  onOpenNotepad,
  onOpenAuditLogs,
  onOpenPortalNews,
  onSelectTab,
}) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isActiveSupervisorsOpen, setIsActiveSupervisorsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'todas' | 'fichas' | 'odk' | 'criticas'>('todas');
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const activeSupervisorsCount = useMemo(() => {
    const loggedIn = (users || []).filter(
      (u) =>
        (u.tipo === 'supervisor' || u.tipo === 'admin') &&
        (u.isOnline === true || u.isLogged === true || u.id === user.id)
    );
    return loggedIn.length;
  }, [users, user]);

  const userCoordination = coordenacoes?.find((c) => c.id === user.coordId);
  const coordenadorNomeDisplay =
    user.tipo === 'admin'
      ? 'Gestor do Sistema'
      : userCoordination?.coordenador
      ? `Coordenador: ${userCoordination.coordenador}`
      : user.coordenadorNome && user.coordenadorNome !== 'Direção Geral de Saúde'
      ? `Coordenador: ${user.coordenadorNome}`
      : 'Gestor do Sistema';

  const handleQuickPrint = () => {
    window.print();
  };

  const primaryColor = currentPalette?.colors?.primary || '#00B2FF';

  const handleSelectTheme = (themeId: string) => {
    const updated: UserThemeConfig = {
      theme: themeId,
      darkMode: themeConfig?.darkMode ?? theme === 'dark',
      borderRadius: themeConfig?.borderRadius || '12',
      fontFamily: themeConfig?.fontFamily || 'Inter',
    };
    saveUserConfig(updated);
    const applied = applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
    if (onSelectPalette) onSelectPalette(applied);
  };

  const handleToggleDarkModeLocal = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else if (onUpdateThemeConfig && themeConfig) {
      const updated = { ...themeConfig, darkMode: !themeConfig.darkMode };
      saveUserConfig(updated);
      applyThemeVariables(updated);
      onUpdateThemeConfig(updated);
    }
  };

  const handleUpdateRadius = (radius: string) => {
    if (!themeConfig) return;
    const updated = { ...themeConfig, borderRadius: radius };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
  };

  const handleUpdateFont = (font: string) => {
    if (!themeConfig) return;
    const updated = { ...themeConfig, fontFamily: font };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
  };

  const handleSelectSidebarColor = (colorId: string) => {
    const currentConfig = themeConfig || getUserConfig();
    const updated = { ...currentConfig, sidebarColor: colorId };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) {
      onUpdateThemeConfig(updated);
    }
  };

  const activeSidebarColorId = themeConfig?.sidebarColor || 'default';

  // Derived Realtime Notifications
  const allNotifications = useMemo(() => {
    const list: HeaderNotification[] = [];

    // 1. Fichas Pendentes
    (fichas || []).forEach((f) => {
      if (f.status === 'pendente') {
        list.push({
          id: `ficha-${f.id}`,
          type: 'ficha',
          title: 'Ficha de Mobilização Pendente',
          subtitle: `Mobilizador: ${f.mobilizador || 'Sem Nome'} • Coord: ${f.coordNome || 'Geral'}`,
          details: `Local: ${f.bairro || f.municipio || 'N/A'} • ${f.totalPessoas || 0} Pessoas • ${f.totalLocais || 0} Locais`,
          timestamp: f.data || 'Hoje',
          severity: 'medium',
          tabTarget: 'listFichas',
          actionLabel: 'Validar Ficha',
        });
      }
    });

    // 2. Submissões ODK Collect Pendentes ou Divergentes
    (odkSubmissions || []).forEach((s) => {
      if (s.status === 'pendente' || s.status === 'divergencia') {
        const isDiv = s.status === 'divergencia';
        list.push({
          id: `odk-${s.id}`,
          type: 'odk',
          title: isDiv ? 'ODK Collect: Divergência Crítica' : 'ODK Collect: Submissão Pendente',
          subtitle: `Mobilizador: ${s.mobilizadorNome} • Coord: ${s.coordNome || 'Geral'}`,
          details: `Local: ${s.bairro || s.municipio || 'N/A'} • ${s.pessoasTotal || 0} Pessoas`,
          timestamp: s.dataSubmissao || 'Recentemente',
          severity: isDiv ? 'high' : 'medium',
          tabTarget: 'odk',
          actionLabel: 'Validar ODK',
        });
      }
    });

    // 3. Ações Críticas em Campo (Audit Logs)
    (auditLogs || []).forEach((log) => {
      const acao = (log.acao || '').toLowerCase();
      const detalhes = (log.detalhes || '').toLowerCase();
      if (
        acao.includes('elimina') ||
        acao.includes('rejeita') ||
        detalhes.includes('elimina') ||
        detalhes.includes('rejeit') ||
        detalhes.includes('diverg')
      ) {
        list.push({
          id: `audit-${log.id}`,
          type: 'audit',
          title: `Ação no Terreno: ${log.acao}`,
          subtitle: `Por ${log.usuarioNome} (${log.usuarioTipo === 'admin' ? 'Admin' : 'Supervisor'})`,
          details: log.detalhes,
          timestamp: log.timestamp,
          severity: 'high',
          actionLabel: 'Ver Registos de Auditoria',
        });
      }
    });

    // 4. Novos Utilizadores Pendentes
    (users || []).forEach((u) => {
      if (u.status === 'pendente') {
        list.push({
          id: `user-${u.id}`,
          type: 'user',
          title: 'Novo Utilizador Pendente de Aprovação',
          subtitle: `${u.nome} (${u.email})`,
          details: `Solicitação de acesso ao sistema`,
          timestamp: u.createdAt || 'Hoje',
          severity: 'medium',
          tabTarget: 'utilizadores',
          actionLabel: 'Aprovar Utilizador',
        });
      }
    });

    return list;
  }, [fichas, odkSubmissions, auditLogs, users]);

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      if (notificationFilter === 'fichas') return n.type === 'ficha';
      if (notificationFilter === 'odk') return n.type === 'odk';
      if (notificationFilter === 'criticas') return n.severity === 'high' || n.type === 'audit' || n.type === 'user';
      return true;
    });
  }, [allNotifications, notificationFilter]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !readNotificationIds.has(n.id)).length;
  }, [allNotifications, readNotificationIds]);

  const handleMarkAllRead = () => {
    const allIds = new Set(allNotifications.map((n) => n.id));
    setReadNotificationIds(allIds);
  };

  const handleNotificationClick = (item: HeaderNotification) => {
    setReadNotificationIds((prev) => new Set([...prev, item.id]));
    setIsNotificationsOpen(false);
    if (item.type === 'audit' && onOpenAuditLogs) {
      onOpenAuditLogs();
    } else if (item.tabTarget && onSelectTab) {
      onSelectTab(item.tabTarget);
    }
  };

  return (
    <header
      className="sticky top-0 z-50 flex h-[48px] w-full items-center justify-between border-b border-white/20 bg-[#00B2FF] px-3 text-white shadow-sm md:px-4 transition-colors shrink-0"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <ActionTooltip content="Abrir o menu lateral de navegação">
            <button
              onClick={onToggleSidebar}
              className="rounded-lg p-2 transition text-white/90 hover:bg-white/15 hover:text-white cursor-pointer"
              title="Abrir Menu Lateral"
              id="btn-hamburger"
            >
              <Menu className="h-5 w-5" />
            </button>
          </ActionTooltip>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black shadow-sm text-sm"
            style={{ color: primaryColor }}
          >
            SM
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              SisMob
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {/* Indicador de Supervisores a Lançar Dados com Ponto Verde Piscando */}
        <button
          onClick={() => setIsActiveSupervisorsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-950/60 hover:bg-emerald-900/80 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm backdrop-blur-xs cursor-pointer active:scale-95"
          title="Supervisores e equipas a lançar dados no sistema em tempo real — Clique para ver as pessoas"
          id="btn-header-active-supervisors"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="text-emerald-300 font-black">{activeSupervisorsCount}</span>
          <span className="hidden sm:inline text-white font-bold">em Lançamento</span>
        </button>

        {/* Status Indicator */}
        <div
          className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white sm:flex backdrop-blur-xs"
          title={isOnline ? 'Servidor Conectado' : 'Modo Offline - Guardando em LocalStorage'}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-300" /> : <WifiOff className="h-3.5 w-3.5 text-amber-300" />}
          <span>{isOnline ? 'Servidor Online' : 'Modo Local'}</span>
        </div>

        {/* Dark Mode Direct Button */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 transition shadow-xs backdrop-blur-xs cursor-pointer"
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Dark'}
          id="btn-header-dark-mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-300" />
              <span className="hidden sm:inline">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-slate-100" />
              <span className="hidden sm:inline">Modo Dark</span>
            </>
          )}
        </button>

        {/* Quick New Ficha */}
        <button
          onClick={onNewFicha}
          className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold shadow-xs transition active:scale-[0.98]"
          style={{ color: primaryColor }}
          id="btn-header-new-ficha"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Nova Ficha</span>
        </button>

        {/* Realtime Notification Bell Button */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative flex items-center justify-center rounded-xl border border-white/25 bg-white/15 p-2 text-white hover:bg-white/25 transition shadow-xs backdrop-blur-xs cursor-pointer"
            title="Notificações e Alertas do Terreno em Tempo Real"
            id="btn-header-notifications"
          >
            <Bell className="h-4.5 w-4.5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-md animate-pulse border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown Panel */}
          {isNotificationsOpen && (
            <>
              {/* Backdrop Overlay */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotificationsOpen(false)}
              />

              <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-slate-800 dark:text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Panel Header */}
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>Notificações & Alertas</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-100 dark:bg-red-900/60 px-1.5 py-0.2 text-[10px] font-black text-red-700 dark:text-red-300">
                            {unreadCount} novas
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Ações dos mobilizadores, submissões ODK e alertas críticos
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck className="h-3 w-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold gap-1 overflow-x-auto">
                  <button
                    onClick={() => setNotificationFilter('todas')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      notificationFilter === 'todas'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Todas ({allNotifications.length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter('fichas')}
                    className={`px-2 py-1 rounded-lg transition ${
                      notificationFilter === 'fichas'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Fichas ({allNotifications.filter((n) => n.type === 'ficha').length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter('odk')}
                    className={`px-2 py-1 rounded-lg transition ${
                      notificationFilter === 'odk'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    ODK ({allNotifications.filter((n) => n.type === 'odk').length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter('criticas')}
                    className={`px-2 py-1 rounded-lg transition ${
                      notificationFilter === 'criticas'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Críticas ({allNotifications.filter((n) => n.severity === 'high' || n.type === 'audit').length})
                  </button>
                </div>

                {/* Notification Items List */}
                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-1.5">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 opacity-80" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tudo em dia!
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Nenhuma notificação ou alerta pendente nesta categoria.
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((item) => {
                      const isRead = readNotificationIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3 transition cursor-pointer flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                            !isRead
                              ? 'bg-blue-50/40 dark:bg-blue-950/20'
                              : 'opacity-80'
                          }`}
                        >
                          {/* Type Icon Badge */}
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold ${
                              item.severity === 'high'
                                ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
                                : item.type === 'odk'
                                ? 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300'
                                : item.type === 'user'
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.type === 'ficha' ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : item.type === 'odk' ? (
                              <Smartphone className="h-3.5 w-3.5" />
                            ) : item.type === 'user' ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldAlert className="h-3.5 w-3.5" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 space-y-0.5 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                                {item.title}
                              </h5>
                              <span className="text-[9px] text-slate-400 shrink-0">
                                {item.timestamp}
                              </span>
                            </div>

                            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                              {item.subtitle}
                            </p>

                            {item.details && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {item.details}
                              </p>
                            )}

                            {item.actionLabel && (
                              <div className="pt-1 flex items-center justify-between text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                                <span className="flex items-center gap-1 hover:underline">
                                  <span>{item.actionLabel}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                                {!isRead && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panel Footer */}
                <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      if (onOpenAuditLogs) onOpenAuditLogs();
                    }}
                    className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    Ver Registos de Auditoria Completos &rarr;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Configurações (Settings Gear Icon) Button */}
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 transition shadow-xs backdrop-blur-xs cursor-pointer"
          title="Configurações do Sistema e Cores"
          id="btn-header-configuracoes"
        >
          <Settings className="h-4 w-4 text-white animate-spin-slow" />
          <span className="hidden sm:inline">Configurações</span>
        </button>

        {/* User Badge */}
        <button
          type="button"
          onClick={() => onSelectTab && onSelectTab('perfil')}
          className="hidden items-center gap-2.5 border-l border-white/25 pl-3 md:flex text-left hover:opacity-90 transition focus:outline-none group cursor-pointer"
          title="Clique para ver e editar Meu Perfil"
          id="btn-header-profile"
        >
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-bold shadow-2xs border border-white/30"
            style={{ color: primaryColor }}
          >
            {user.fotoUrl ? (
              <img src={user.fotoUrl} alt={user.nome} className="h-full w-full object-cover" />
            ) : (
              <span>{user.nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>{user.nome}</span>
            </div>
            <div className="text-[10px] font-medium tracking-wider uppercase text-white/80">
              {user.tipo === 'admin' ? 'Administrador' : 'Supervisor'}
            </div>
          </div>
        </button>
      </div>

      {/* Settings / Configurações & Color Customization Modal */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Configurações do Sistema
                </h3>
              </div>
              <button
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions inside Settings */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                1. Ferramentas & Atalhos
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setIsPaletteOpen(false);
                    onOpenAiModal();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:border-blue-300 transition"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Análise IA</span>
                </button>

                {user.tipo === 'admin' && onOpenNotepad && (
                  <button
                    onClick={() => {
                      setIsPaletteOpen(false);
                      onOpenNotepad();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:border-amber-300 transition"
                  >
                    <Notebook className="h-4 w-4 text-amber-600" />
                    <span>Bloco Notas</span>
                  </button>
                )}

                {user.tipo === 'admin' && onOpenPortalNews && (
                  <button
                    onClick={() => {
                      setIsPaletteOpen(false);
                      onOpenPortalNews();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 hover:border-sky-300 transition"
                  >
                    <Newspaper className="h-4 w-4 text-sky-500" />
                    <span>Notícias</span>
                  </button>
                )}

                {user.tipo === 'admin' && onOpenAuditLogs && (
                  <button
                    onClick={() => {
                      setIsPaletteOpen(false);
                      onOpenAuditLogs();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition"
                  >
                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                    <span>Auditoria</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsPaletteOpen(false);
                    handleQuickPrint();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                >
                  <Printer className="h-4 w-4 text-slate-500" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Cores do Sidebar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                2. Cores do Menu Lateral (Sidebar)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SIDEBAR_COLORS.map((col) => {
                  const isSelected = activeSidebarColorId === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleSelectSidebarColor(col.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition text-left ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                      style={{
                        backgroundColor: col.bg,
                        color: col.text,
                      }}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border shrink-0 shadow-xs"
                        style={{ backgroundColor: col.bg, borderColor: col.border }}
                      />
                      <span className="truncate flex-1">{col.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temas Oficiais */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                3. Temas Oficiais do Sistema
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {THEMES.map((t) => {
                  const isSelected = (currentPalette?.id || themeConfig?.theme || 'executivo') === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTheme(t.id)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center -space-x-1.5 shrink-0">
                          <span
                            className="h-4 w-4 rounded-full border border-white dark:border-slate-900 shadow-2xs"
                            style={{ backgroundColor: t.colors.primary }}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-white dark:border-slate-900 shadow-2xs"
                            style={{ backgroundColor: t.colors.sidebar }}
                          />
                        </div>
                        <span className="font-bold text-[11px] truncate">{t.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">Modo Escuro (Dark Mode)</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Alterna entre interface clara e escura</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDarkModeLocal}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    themeConfig?.darkMode || theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      themeConfig?.darkMode || theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Border Radius Control */}
            {themeConfig && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <LayoutGrid className="h-3.5 w-3.5 text-blue-500" />
                  <span>Arredondamento de Cantos (Border Radius)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '8', label: 'Suave (8px)' },
                    { id: '12', label: 'Padrão (12px)' },
                    { id: '16', label: 'Acentuado (16px)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleUpdateRadius(r.id)}
                      className={`rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                        themeConfig.borderRadius === r.id
                          ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Font Family Control */}
            {themeConfig && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-blue-500" />
                    <span>Fonte da Interface ({AVAILABLE_FONTS.length} Opções)</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    Ativa: {themeConfig.fontFamily}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto p-0.5">
                  {AVAILABLE_FONTS.map((font) => {
                    const isSelected = themeConfig.fontFamily === font.id || themeConfig.fontFamily === font.name;
                    return (
                      <button
                        key={font.id}
                        onClick={() => handleUpdateFont(font.id)}
                        style={{ fontFamily: font.fontFamily }}
                        className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition text-left flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/90 text-blue-900 dark:bg-blue-950/70 dark:text-blue-100 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold truncate text-[11px]">{font.name}</span>
                          {isSelected && <Check className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
                          {font.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Supervisors Modal */}
      <ActiveSupervisorsModal
        isOpen={isActiveSupervisorsOpen}
        onClose={() => setIsActiveSupervisorsOpen(false)}
        users={users}
        currentUser={user}
        fichas={fichas}
        odkSubmissions={odkSubmissions}
        coordenacoes={coordenacoes}
        mobilizadores={mobilizadores}
        onSelectSupervisorFichas={() => {
          if (onSelectTab) onSelectTab('listFichas');
        }}
      />
    </header>
  );
};
