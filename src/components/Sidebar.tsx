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
} from 'lucide-react';
import { User, Ficha } from '../types';
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
  isOpen: boolean;
  currentPalette?: Theme;
  themeConfig?: UserThemeConfig;
  onUpdateThemeConfig?: (config: UserThemeConfig) => void;
  onSelectTab: (tab: string) => void;
  onOpenNotepad?: () => void;
  onOpenAuditLogs?: () => void;
  onLogout: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  fichas = [],
  users = [],
  isOpen,
  currentPalette,
  themeConfig,
  onUpdateThemeConfig,
  onSelectTab,
  onOpenNotepad,
  onOpenAuditLogs,
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

  const handleNav = (tab: string) => {
    onSelectTab(tab);
    onCloseMobile();
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
      {/* Mobile overlay - strictly under header */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[57px] z-40 bg-slate-950/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-[57px] bottom-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-200 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:translate-x-0 shrink-0 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: currentSidebarPreset.bg,
          color: currentSidebarPreset.text,
          borderColor: currentSidebarPreset.border,
        }}
      >
        {/* User Card Header */}
        <div
          className="border-b p-3"
          style={{ borderColor: currentSidebarPreset.border }}
        >
          <div
            onClick={() => handleNav('perfil')}
            className={`flex items-center gap-3 rounded-xl border p-2.5 shadow-2xs cursor-pointer transition group ${
              currentSidebarPreset.isDark
                ? 'bg-white/10 border-white/20 hover:bg-white/20'
                : 'bg-slate-100 border-slate-300 hover:bg-slate-200/80'
            }`}
            title="Clique para abrir e gerir Meu Perfil"
          >
            {/* Avatar Circle */}
            <div
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-white font-bold text-sm shadow-xs border"
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
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold border"
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Main Section */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Principal
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNav('dashboard')}
                className={getNavBtnClass(activeTab === 'dashboard')}
                style={activeTab === 'dashboard' ? { backgroundColor: primaryColor } : undefined}
                id="nav-dashboard"
              >
                <LayoutDashboard className={`h-4 w-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>

          {/* Grupo 1: REGISTOS DE CAMPO */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>Registos de Campo</span>
              <FolderKanban className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNav('ficha')}
                className={getNavBtnClass(activeTab === 'ficha')}
                style={activeTab === 'ficha' ? { backgroundColor: primaryColor } : undefined}
                id="nav-ficha"
              >
                <FilePlus className={`h-4 w-4 ${activeTab === 'ficha' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Nova Ficha</span>
              </button>

              <button
                onClick={() => handleNav('listFichas')}
                className={getNavBtnClass(activeTab === 'listFichas')}
                style={activeTab === 'listFichas' ? { backgroundColor: primaryColor } : undefined}
                id="nav-listFichas"
              >
                <ListFilter className={`h-4 w-4 ${activeTab === 'listFichas' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Fichas Registadas</span>
              </button>
            </div>
          </div>

          {/* Grupo 2: RH-MC (Recursos Humanos - Mobilizadores Comunitários) */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>RH-MC (Mobilizadores)</span>
              <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-1">
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

              {isAdmin && (
                <button
                  onClick={() => handleNav('financas')}
                  className={getNavBtnClass(activeTab === 'financas')}
                  style={activeTab === 'financas' ? { backgroundColor: primaryColor } : undefined}
                  id="nav-financas"
                >
                  <Wallet className={`h-4 w-4 ${activeTab === 'financas' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>Finanças & Subsídios</span>
                </button>
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
            </div>
          </div>

          {/* Admin Section */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              {isAdmin ? 'Administração & Análise' : 'Análise Operacional'}
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNav('consolidado')}
                className={getNavBtnClass(activeTab === 'consolidado')}
                style={activeTab === 'consolidado' ? { backgroundColor: primaryColor } : undefined}
                id="nav-consolidado"
              >
                <BarChart3 className={`h-4 w-4 ${activeTab === 'consolidado' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Consolidado</span>
              </button>

              {/* Permissão restrita apenas para Administrador */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleNav('relatorios')}
                    className={getNavBtnClass(activeTab === 'relatorios')}
                    style={activeTab === 'relatorios' ? { backgroundColor: primaryColor } : undefined}
                    id="nav-relatorios"
                  >
                    <BookOpen className={`h-4 w-4 ${activeTab === 'relatorios' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>Relatórios Oficiais</span>
                  </button>

                  <button
                    onClick={() => handleNav('graficos')}
                    className={getNavBtnClass(activeTab === 'graficos')}
                    style={activeTab === 'graficos' ? { backgroundColor: primaryColor } : undefined}
                    id="nav-graficos"
                  >
                    <PieChart className={`h-4 w-4 ${activeTab === 'graficos' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>Gráficos Analíticos</span>
                  </button>

                  <button
                    onClick={() => handleNav('utilizadores')}
                    className={getNavBtnClass(activeTab === 'utilizadores')}
                    style={activeTab === 'utilizadores' ? { backgroundColor: primaryColor } : undefined}
                    id="nav-utilizadores"
                  >
                    <Users className={`h-4 w-4 ${activeTab === 'utilizadores' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>Utilizadores</span>
                  </button>

                  <button
                    onClick={() => handleNav('coordenacoes')}
                    className={getNavBtnClass(activeTab === 'coordenacoes')}
                    style={activeTab === 'coordenacoes' ? { backgroundColor: primaryColor } : undefined}
                    id="nav-coordenacoes"
                  >
                    <Building2 className={`h-4 w-4 ${activeTab === 'coordenacoes' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>Coordenações</span>
                  </button>

                  {onOpenNotepad && (
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
                  )}

                  {onOpenAuditLogs && (
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
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};
