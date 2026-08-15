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
      : user.tipo === 'admin_junior'
      ? 'Gabinete de Avaliação UNICEF'
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
            className="flex h-8 px-2.5 items-center justify-center rounded-lg bg-white font-black shadow-sm text-xs tracking-tight select-none"
            style={{ color: primaryColor }}
          >
            SirDm
          </div>
          <div className="leading-tight">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white block">
              SirDm
            </span>
            <span className="text-[10px] font-medium text-white/85 hidden xl:inline-block">
              Sistema de Registo de Dados de Mobilização
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {/* Indicador de Supervisores com Ponto Verde Piscando */}
        <button
          onClick={() => setIsActiveSupervisorsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-950/60 hover:bg-emerald-900/80 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm backdrop-blur-xs cursor-pointer active:scale-95"
          title="Supervisores e equipas a aceder ao sistema em tempo real — Clique para ver as pessoas"
          id="btn-header-active-supervisors"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="text-emerald-300 font-black">{activeSupervisorsCount}</span>
        </button>

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
              {user.tipo === 'admin'
                ? 'Administrador'
                : user.tipo === 'admin_junior'
                ? 'Avaliador UNICEF'
                : 'Supervisor'}
            </div>
          </div>
        </button>
      </div>

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
