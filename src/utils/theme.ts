export interface ThemeColors {
  primary: string;
  secondary: string;
  sidebar: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export interface UserThemeConfig {
  theme: string; // 'executivo' | 'verde' | 'vermelho' | 'grafite'
  darkMode: boolean;
  borderRadius: string; // e.g. '8', '12', '16'
  fontFamily: string; // e.g. 'Inter', 'Roboto', 'Plus Jakarta Sans'
  sidebarColor?: string; // 'default' | 'navy' | 'cyan' | 'emerald' | 'graphite' | 'burgundy' | 'amber' | 'cinza_médio'
}

export interface SidebarColorOption {
  id: string;
  name: string;
  bg: string;
  text: string;
  border: string;
  isDark: boolean;
}

export const SIDEBAR_COLORS: SidebarColorOption[] = [
  { id: 'default', name: 'Branco / Padrão', bg: '#FFFFFF', text: '#0F172A', border: '#E2E8F0', isDark: false },
  { id: 'navy', name: 'Azul Marinho Escuro', bg: '#0F172A', text: '#FFFFFF', border: '#1E293B', isDark: true },
  { id: 'cyan', name: 'Azul Cyan SisMob', bg: '#004B87', text: '#FFFFFF', border: '#00335E', isDark: true },
  { id: 'emerald', name: 'Verde Saúde', bg: '#064E3B', text: '#FFFFFF', border: '#022C22', isDark: true },
  { id: 'graphite', name: 'Cinza Grafite', bg: '#1E293B', text: '#FFFFFF', border: '#334155', isDark: true },
  { id: 'burgundy', name: 'Vinho Executivo', bg: '#881337', text: '#FFFFFF', border: '#4C0519', isDark: true },
  { id: 'amber', name: 'Dourado Escuro', bg: '#78350F', text: '#FFFFFF', border: '#451A03', isDark: true },
  { id: 'cinza_médio', name: 'Cinza Suave (#a6ada7)', bg: '#a6ada7', text: '#101712', border: '#8c948d', isDark: false },
];

export const THEMES: Theme[] = [
  {
    id: 'cyan_sismob',
    name: 'Azul Cyan SisMob (#00B2FF)',
    colors: {
      primary: '#00B2FF',
      secondary: '#0080FF',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'executivo',
    name: 'Azul Executivo',
    colors: {
      primary: '#0B5CAD',
      secondary: '#0284C7',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'verde',
    name: 'Verde Institucional',
    colors: {
      primary: '#15803D',
      secondary: '#059669',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'vermelho',
    name: 'Vermelho Institucional',
    colors: {
      primary: '#B91C1C',
      secondary: '#E11D48',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'grafite',
    name: 'Grafite Premium',
    colors: {
      primary: '#1E293B',
      secondary: '#334155',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'roxo',
    name: 'Roxo Moderno',
    colors: {
      primary: '#7C3AED',
      secondary: '#9333EA',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'laranja',
    name: 'Laranja Energia',
    colors: {
      primary: '#EA580C',
      secondary: '#F97316',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'indigo',
    name: 'Índigo Elegante',
    colors: {
      primary: '#4338CA',
      secondary: '#4F46E5',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'teal',
    name: 'Teal Saúde',
    colors: {
      primary: '#0D9488',
      secondary: '#14B8A6',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  {
    id: 'rosa',
    name: 'Rosa Magenta',
    colors: {
      primary: '#BE185D',
      secondary: '#DB2777',
      sidebar: '#FFFFFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
];

export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  category: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  { id: 'Inter', name: 'Inter', fontFamily: "'Inter', sans-serif", category: 'Sistemas & Padrão' },
  { id: 'Roboto', name: 'Roboto', fontFamily: "'Roboto', sans-serif", category: 'Google Moderno' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta', fontFamily: "'Plus Jakarta Sans', sans-serif", category: 'Corporativo Elegante' },
  { id: 'Outfit', name: 'Outfit', fontFamily: "'Outfit', sans-serif", category: 'Tech Minimalista' },
  { id: 'Poppins', name: 'Poppins', fontFamily: "'Poppins', sans-serif", category: 'Geométrico Amigável' },
  { id: 'DM Sans', name: 'DM Sans', fontFamily: "'DM Sans', sans-serif", category: 'Executivo Sóbrio' },
  { id: 'Nunito', name: 'Nunito', fontFamily: "'Nunito', sans-serif", category: 'Arredondado Leve' },
  { id: 'Open Sans', name: 'Open Sans', fontFamily: "'Open Sans', sans-serif", category: 'Universal Legível' },
  { id: 'Montserrat', name: 'Montserrat', fontFamily: "'Montserrat', sans-serif", category: 'Robusto Marcante' },
  { id: 'Work Sans', name: 'Work Sans', fontFamily: "'Work Sans', sans-serif", category: 'Funcional Limpo' },
  { id: 'Fira Code', name: 'Fira Code', fontFamily: "'Fira Code', monospace", category: 'Monospaced Tech' },
  { id: 'Merriweather', name: 'Merriweather', fontFamily: "'Merriweather', serif", category: 'Clássico Serifado' },
];

export const DEFAULT_USER_CONFIG: UserThemeConfig = {
  theme: 'cyan_sismob',
  darkMode: false,
  borderRadius: '12',
  fontFamily: 'Inter',
  sidebarColor: 'default',
};

export function getUserConfig(): UserThemeConfig {
  try {
    const raw = localStorage.getItem('sismob_theme_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_USER_CONFIG, ...parsed };
    }
    return DEFAULT_USER_CONFIG;
  } catch {
    return DEFAULT_USER_CONFIG;
  }
}

export function saveUserConfig(config: UserThemeConfig): void {
  try {
    localStorage.setItem('sismob_theme_config', JSON.stringify(config));
    localStorage.setItem('sismob_theme', config.darkMode ? 'dark' : 'light');
    localStorage.setItem('sismob_palette', config.theme || 'cyan_sismob');
  } catch (err) {
    console.error('Erro ao guardar configurações de tema:', err);
  }
}

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyThemeVariables(config: UserThemeConfig): Theme {
  const theme = getThemeById(config.theme || 'cyan_sismob');
  const root = document.documentElement;

  if (config.darkMode) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.setProperty('--color-background', '#0F172A');
    root.style.setProperty('--color-card', '#1E293B');
    root.style.setProperty('--color-sidebar', '#0F172A');
    root.style.setProperty('--color-text', '#F8FAFC');
    root.style.setProperty('--color-text-secondary', '#94A3B8');
    root.style.setProperty('--color-border', '#334155');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.setProperty('--color-background', '#FFFFFF');
    root.style.setProperty('--color-card', '#FFFFFF');
    root.style.setProperty('--color-sidebar', '#FFFFFF');
    root.style.setProperty('--color-text', '#0F172A');
    root.style.setProperty('--color-text-secondary', '#475569');
    root.style.setProperty('--color-border', '#E2E8F0');
  }

  // Sidebar custom color variables
  const sidebarPreset = SIDEBAR_COLORS.find((sb) => sb.id === config.sidebarColor) || SIDEBAR_COLORS[0];
  root.style.setProperty('--sidebar-bg', sidebarPreset.bg);
  root.style.setProperty('--sidebar-text', sidebarPreset.text);
  root.style.setProperty('--sidebar-border', sidebarPreset.border);

  root.style.setProperty('--color-primary', theme.colors.primary || '#00B2FF');
  root.style.setProperty('--color-secondary', theme.colors.secondary || '#0080FF');
  root.style.setProperty('--color-success', theme.colors.success);
  root.style.setProperty('--color-warning', theme.colors.warning);
  root.style.setProperty('--color-danger', theme.colors.danger);

  const radiusPx = `${config.borderRadius || '12'}px`;
  root.style.setProperty('--border-radius', radiusPx);

  const matchedFont = AVAILABLE_FONTS.find((f) => f.id === config.fontFamily || f.name === config.fontFamily);
  const fontStack = matchedFont ? matchedFont.fontFamily : `'${config.fontFamily || 'Inter'}', sans-serif`;

  root.style.setProperty('--font-family', fontStack);
  document.body.style.fontFamily = fontStack;

  return theme;
}

// Backward compatibility alias
export type ColorPalette = Theme;
export const PALETTES = THEMES;
export function getSavedPalette(): Theme {
  const config = getUserConfig();
  return getThemeById(config.theme);
}
