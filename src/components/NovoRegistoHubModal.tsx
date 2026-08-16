import React, { useState } from 'react';
import {
  X,
  FilePlus,
  MessageSquareWarning,
  ShieldAlert,
  UserPlus,
  Building2,
  Users,
  Target,
  Newspaper,
  ChevronRight,
  Sparkles,
  ClipboardList,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { User } from '../types';

export interface NovoRegistoHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSelectAction: (actionKey: string) => void;
}

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  iconColor: string;
  iconBg: string;
  hoverBorder: string;
  category: 'campo' | 'gestao' | 'planeamento';
  minRole?: 'user' | 'supervisor' | 'admin';
}

export const NovoRegistoHubModal: React.FC<NovoRegistoHubModalProps> = ({
  isOpen,
  onClose,
  user,
  onSelectAction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'todas' | 'campo' | 'gestao' | 'planeamento'>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const isAdmin = user.tipo === 'admin';
  const isSupervisor = user.tipo === 'supervisor' || isAdmin;

  const actions: ActionItem[] = [
    // --- 1. OPERAÇÃO DE CAMPO ---
    {
      id: 'ficha',
      title: 'Ficha Diária de Mobilização',
      subtitle: 'SISMOB • Registo Operacional de Campo',
      description: 'Lançamento de visitas domiciliares, pessoas sensibilizadas, vacinas e locais visitados.',
      icon: FilePlus,
      badge: 'Principal',
      badgeColor: 'bg-emerald-600 text-white',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800',
      hoverBorder: 'hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20',
      category: 'campo',
      minRole: 'user',
    },
    {
      id: 'rumores',
      title: 'Ficha 6: Gestão de Boatos e Rumores',
      subtitle: 'RCCE • Comunicação de Risco Comunitário',
      description: 'Identificação, classificação e proposta de resposta para mitigar desinformação vacinal.',
      icon: MessageSquareWarning,
      badge: 'RCCE',
      badgeColor: 'bg-amber-600 text-white',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800',
      hoverBorder: 'hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20',
      category: 'campo',
      minRole: 'user',
    },
    {
      id: 'casosPFA',
      title: 'Notificação de Caso Suspeito PFA',
      subtitle: 'Vigilância Epidemiológica da Pólio (OMS / UNICEF)',
      description: 'Registo e alerta imediato de Paralisia Flácida Aguda em crianças de 0 a 15 anos.',
      icon: ShieldAlert,
      badge: 'Vigilância Crítica',
      badgeColor: 'bg-rose-600 text-white',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800',
      hoverBorder: 'hover:border-rose-500 hover:ring-2 hover:ring-rose-500/20',
      category: 'campo',
      minRole: 'user',
    },

    // --- 2. GESTÃO E ESTRUTURA ---
    {
      id: 'cadastrarMobilizador',
      title: 'Cadastrar Mobilizador Comunitário (RH-MC)',
      subtitle: 'Recursos Humanos de Campo',
      description: 'Registo de novo ativista/mobilizador com atribuição de coordenação, contacto e dados bancários.',
      icon: UserPlus,
      badge: 'RH-MC',
      badgeColor: 'bg-purple-600 text-white',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800',
      hoverBorder: 'hover:border-purple-500 hover:ring-2 hover:ring-purple-500/20',
      category: 'gestao',
      minRole: 'supervisor',
    },
    {
      id: 'cadastrarUtilizador',
      title: 'Criar Conta de Supervisor / Utilizador',
      subtitle: 'Controlo de Acessos ao Sistema',
      description: 'Criar credenciais e permissões para novos supervisores ou administradores.',
      icon: Users,
      badge: 'Apenas Admin',
      badgeColor: 'bg-orange-600 text-white',
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-950/80 border-orange-200 dark:border-orange-800',
      hoverBorder: 'hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20',
      category: 'gestao',
      minRole: 'admin',
    },
    {
      id: 'cadastrarCoordenacao',
      title: 'Criar Nova Coordenação Territorial',
      subtitle: 'Estrutura Geográfica e Unidades Sanitárias',
      description: 'Registo de novas áreas operacionais, municípios, bairros e unidades de saúde.',
      icon: Building2,
      badge: 'Apenas Admin',
      badgeColor: 'bg-cyan-600 text-white',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/80 border-cyan-200 dark:border-cyan-800',
      hoverBorder: 'hover:border-cyan-500 hover:ring-2 hover:ring-cyan-500/20',
      category: 'gestao',
      minRole: 'admin',
    },

    // --- 3. PLANEAMENTO & COMUNICAÇÃO ---
    {
      id: 'modalMetas',
      title: 'Definir Metas Operacionais de Fichas',
      subtitle: 'Monitor de Desempenho & SLA',
      description: 'Configurar objetivos quantitativos diários de mobilização por coordenação.',
      icon: Target,
      badge: 'Supervisão',
      badgeColor: 'bg-blue-600 text-white',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800',
      hoverBorder: 'hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20',
      category: 'planeamento',
      minRole: 'supervisor',
    },
    {
      id: 'modalNoticias',
      title: 'Publicar Comunicado no Portal',
      subtitle: 'Mural de Avisos & Notícias Institucionais',
      description: 'Criar avisos, diretrizes de campanha ou alertas informativos para toda a equipa.',
      icon: Newspaper,
      badge: 'Apenas Admin',
      badgeColor: 'bg-sky-600 text-white',
      iconColor: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-100 dark:bg-sky-950/80 border-sky-200 dark:border-sky-800',
      hoverBorder: 'hover:border-sky-500 hover:ring-2 hover:ring-sky-500/20',
      category: 'planeamento',
      minRole: 'admin',
    },
  ];

  const filteredActions = actions.filter((action) => {
    // Role filter
    if (action.minRole === 'admin' && !isAdmin) return false;
    if (action.minRole === 'supervisor' && !isSupervisor) return false;

    // Category filter
    if (selectedCategory !== 'todas' && action.category !== selectedCategory) return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        action.title.toLowerCase().includes(q) ||
        action.subtitle.toLowerCase().includes(q) ||
        action.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleActionClick = (actionId: string) => {
    onSelectAction(actionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        id="modal-hub-cadastros"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-blue-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Central de Cadastros e Lançamentos
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  Hub Unificado
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecione o tipo de formulário ou entidade que deseja registar no sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (Esc)"
            id="btn-close-hub-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'todas', label: 'Todos os Registos' },
              { id: 'campo', label: 'Operação de Campo' },
              { id: 'gestao', label: 'Gestão & Estrutura' },
              { id: 'planeamento', label: 'Planeamento' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative shrink-0 sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar formulário..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Action Grid List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ClipboardList className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Nenhum formulário encontrado
              </p>
              <p className="text-xs text-slate-400">
                Tente ajustar os termos da sua pesquisa ou selecione outra categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 text-left transition shadow-xs hover:shadow-md cursor-pointer ${action.hoverBorder}`}
                    id={`btn-hub-action-${action.id}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${action.iconBg}`}
                        >
                          <Icon className={`h-5 w-5 ${action.iconColor}`} />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {action.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide ${action.badgeColor}`}
                            >
                              {action.badge}
                            </span>
                          )}
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition transform group-hover:translate-x-0.5">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {action.title}
                        </h4>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {action.subtitle}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed pt-0.5">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      <span>Iniciar lançamento</span>
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 sm:px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Perfil ativo:
            </span>
            <span className="rounded-md bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">
              {user.tipo === 'admin' ? 'Administrador Geral' : 'Supervisor de Campo'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
