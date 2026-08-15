import React from 'react';
import {
  Settings,
  X,
  Sparkles,
  Notebook,
  Newspaper,
  ShieldCheck,
  Printer,
  Check,
  LayoutGrid,
  Type,
} from 'lucide-react';
import { User } from '../types';
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  theme?: 'light' | 'dark';
  currentPalette?: Theme;
  themeConfig?: UserThemeConfig;
  onSelectPalette?: (palette: Theme) => void;
  onUpdateThemeConfig?: (config: UserThemeConfig) => void;
  onToggleTheme?: () => void;
  onOpenAiModal?: () => void;
  onOpenNotepad?: () => void;
  onOpenPortalNews?: () => void;
  onOpenAuditLogs?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  theme = 'light',
  currentPalette,
  themeConfig,
  onSelectPalette,
  onUpdateThemeConfig,
  onToggleTheme,
  onOpenAiModal,
  onOpenNotepad,
  onOpenPortalNews,
  onOpenAuditLogs,
}) => {
  if (!isOpen) return null;

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

  const handleQuickPrint = () => {
    window.print();
  };

  const activeSidebarColorId = themeConfig?.sidebarColor || 'default';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600 animate-spin-slow" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Configurações do Sistema
            </h3>
          </div>
          <button
            onClick={onClose}
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
            {onOpenAiModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiModal();
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Análise IA</span>
              </button>
            )}

            {user.tipo === 'admin' && onOpenNotepad && (
              <button
                onClick={() => {
                  onClose();
                  onOpenNotepad();
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer"
              >
                <Notebook className="h-4 w-4 text-amber-600" />
                <span>Bloco Notas</span>
              </button>
            )}

            {user.tipo === 'admin' && onOpenPortalNews && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPortalNews();
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 hover:border-sky-300 transition cursor-pointer"
              >
                <Newspaper className="h-4 w-4 text-sky-500" />
                <span>Notícias</span>
              </button>
            )}

            {user.tipo === 'admin' && onOpenAuditLogs && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuditLogs();
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span>Auditoria</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                handleQuickPrint();
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
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
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition text-left cursor-pointer ${
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
                  className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition text-left cursor-pointer ${
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
                  className={`rounded-lg border py-1.5 text-[11px] font-semibold transition cursor-pointer ${
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
                    className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition text-left flex flex-col justify-between cursor-pointer ${
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
  );
};
