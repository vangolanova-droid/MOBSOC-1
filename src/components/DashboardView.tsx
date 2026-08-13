import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sanitizeImageUrl } from '../utils/imageUtils';
import {
  Users,
  MapPin,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Plus,
  Sparkles,
  ArrowRight,
  Target,
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Mail,
  Phone,
  Bell,
  UserCheck,
  Send,
  MessageSquare,
  Sliders,
  ShieldAlert,
  Newspaper,
  Trash2,
  Edit3,
  Megaphone,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  X,
  Radio,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Tooltip as ActionTooltip } from './Tooltip';
import { MapaFichasView } from './MapaFichasView';
import { ActiveSupervisorsModal } from './ActiveSupervisorsModal';
import { Coordination, CoordinationGoal, Ficha, Mobilizador, PortalPost, User, CasoPFA } from '../types';
import { LOCATION_CONFIGS } from '../data/initialData';

interface DashboardViewProps {
  user: User;
  fichas: Ficha[];
  casosPFA?: CasoPFA[];
  mobilizadores: Mobilizador[];
  coordenacoes: Coordination[];
  users: User[];
  goals?: CoordinationGoal[];
  portalPosts?: PortalPost[];
  onNewFicha: () => void;
  onViewAllFichas: () => void;
  onViewPFACases?: () => void;
  onOpenAiModal: () => void;
  onOpenGoalModal?: () => void;
  onOpenPortalNews?: () => void;
  onSavePortalPost?: (post: PortalPost) => Promise<void>;
  onDeletePortalPost?: (id: string) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  fichas,
  casosPFA = [],
  mobilizadores,
  coordenacoes,
  users,
  goals = [],
  portalPosts = [],
  onNewFicha,
  onViewAllFichas,
  onViewPFACases,
  onOpenAiModal,
  onOpenGoalModal,
  onOpenPortalNews,
  onSavePortalPost,
  onDeletePortalPost,
}) => {
  const isAdmin = user.tipo === 'admin';

  // Date selection for Daily Target Monitor (default to today: 2026-08-03 or current system date)
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState('2026-08-03');
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [isActiveSupervisorsOpen, setIsActiveSupervisorsOpen] = useState(false);

  const activeSupervisorsCount = React.useMemo(() => {
    const loggedIn = (users || []).filter(
      (u) =>
        (u.tipo === 'supervisor' || u.tipo === 'admin') &&
        (u.isOnline === true || u.isLogged === true || u.id === user.id)
    );
    return loggedIn.length;
  }, [users, user]);

  // Carousel & Portal News States
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCarouselPlaying, setIsCarouselPlaying] = useState(true);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>('Todos');
  const [newsSearchQuery, setNewsSearchQuery] = useState<string>('');
  const [readerPost, setReaderPost] = useState<PortalPost | null>(null);

  // Filter posts for carousel (prefer featured posts, or all posts if no featured)
  const featuredPosts = portalPosts.filter((p) => p.destaque);
  const carouselPosts = featuredPosts.length > 0 ? featuredPosts : portalPosts;

  // Auto-advance carousel slide every 5 seconds
  useEffect(() => {
    if (!isCarouselPlaying || isCarouselHovered || carouselPosts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % carouselPosts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isCarouselPlaying, isCarouselHovered, carouselPosts.length]);

  const safeSlideIndex = currentSlideIndex >= carouselPosts.length ? 0 : currentSlideIndex;
  const activeSlide = carouselPosts[safeSlideIndex];

  // Filtered posts for grid below carousel
  const filteredGridPosts = portalPosts.filter((p) => {
    const matchesCat =
      selectedNewsCategory === 'Todos'
        ? true
        : selectedNewsCategory === 'Destaques'
        ? p.destaque
        : p.categoria === selectedNewsCategory;

    const matchesSearch =
      !newsSearchQuery.trim() ||
      p.titulo.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
      (p.subtitulo && p.subtitulo.toLowerCase().includes(newsSearchQuery.toLowerCase())) ||
      p.conteudo.toLowerCase().includes(newsSearchQuery.toLowerCase());

    return matchesCat && matchesSearch;
  });

  // Filter fichas if supervisor
  const visibleFichas = isAdmin
    ? fichas
    : fichas.filter((f) => f.coordId === user.coordId);

  // Supervisors list for monitoring
  const supervisorsList = users.filter(
    (u) => u.tipo === 'supervisor' && (isAdmin || u.coordId === user.coordId)
  );

  // Filter mobilizadores if supervisor
  const visibleMobilizadores = isAdmin
    ? mobilizadores
    : mobilizadores.filter((m) => m.coordId === user.coordId);

  // Daily target calculation
  const totalExpectedDailyFichas = visibleMobilizadores.length;
  const todayFichas = visibleFichas.filter((f) => f.data === targetDate);
  const submittedMobNames = new Set(todayFichas.map((f) => f.mobilizador.toLowerCase().trim()));

  const submittedMobilizadores = visibleMobilizadores.filter((m) =>
    submittedMobNames.has(m.nome.toLowerCase().trim())
  );
  const pendingMobilizadores = visibleMobilizadores.filter(
    (m) => !submittedMobNames.has(m.nome.toLowerCase().trim())
  );

  const dailyProgress =
    totalExpectedDailyFichas > 0
      ? Math.round((submittedMobilizadores.length / totalExpectedDailyFichas) * 100)
      : 0;

  const sendWhatsAppReminder = (
    targetName: string,
    role: 'supervisor' | 'mobilizador',
    phone?: string,
    coordName?: string
  ) => {
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const msg =
      role === 'supervisor'
        ? `Olá Supervisor(a) ${targetName}, a Direção da Coordenação ${coordName || 'Geral'} solicita a entrega das fichas de mobilização de campo do dia ${targetDate}. Por favor confirme a submissão dos dados recolhidos. Obrigado!`
        : `Olá ${targetName}, a equipa de coordenação aguarda a entrega da sua ficha de mobilização de campo do dia ${targetDate}. Por favor envie os dados assim que possível. Obrigado!`;

    const encodedText = encodeURIComponent(msg);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('244') ? cleanPhone : '244' + cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
    setReminderNotice(`📱 WhatsApp aberto com mensagem pré-formatada para ${targetName}.`);
  };

  const totalPessoas = visibleFichas.reduce(
    (acc, f) => acc + (f.totalPessoas || 0),
    0
  );
  const totalLocais = visibleFichas.reduce(
    (acc, f) => acc + (f.totalLocais || 0),
    0
  );
  const totalSim = visibleFichas.reduce((acc, f) => acc + (f.sim || 0), 0);
  const totalNao = visibleFichas.reduce((acc, f) => acc + (f.nao || 0), 0);
  const totalRespostas = totalSim + totalNao;
  const acceptanceRate =
    totalRespostas > 0 ? Math.round((totalSim / totalRespostas) * 100) : 0;

  // Chart 1: Pessoas por Local
  const localAgg: Record<string, number> = {
    'Casa a Casa': 0,
    Igreja: 0,
    'Praças / Mercados': 0,
    'Paragem Táxi': 0,
    Creche: 0,
    Escola: 0,
    'Ponto Água': 0,
    Outros: 0,
  };

  visibleFichas.forEach((f) => {
    if (!f.tableData) return;
    Object.entries(f.tableData).forEach(([key, val]) => {
      const pes = Array.isArray(val) ? val[1] || 0 : 0;
      if (key.startsWith('casa')) {
        localAgg['Casa a Casa'] += pes;
      } else if (key === 'igreja') {
        localAgg['Igreja'] += pes;
      } else if (key === 'pracas') {
        localAgg['Praças / Mercados'] += pes;
      } else if (key === 'paragem') {
        localAgg['Paragem Táxi'] += pes;
      } else if (key === 'creche') {
        localAgg['Creche'] += pes;
      } else if (key === 'escola') {
        localAgg['Escola'] += pes;
      } else if (key === 'agua') {
        localAgg['Ponto Água'] += pes;
      } else {
        localAgg['Outros'] += pes;
      }
    });
  });

  const totalLocalPessoas = Object.values(localAgg).reduce((acc, val) => acc + val, 0);

  const barData = Object.entries(localAgg).map(([name, value]) => {
    const percent = totalLocalPessoas > 0 ? Math.round((value / totalLocalPessoas) * 100) : 0;
    return {
      name,
      Pessoas: value,
      percent,
    };
  });

  // Chart 2: Acceptance Donut Data
  const donutData = [
    { name: 'SIM (Aceitaram)', value: totalSim, color: '#16A34A' },
    { name: 'NÃO (Recusaram)', value: totalNao, color: '#DC2626' },
  ];

  // Chart 3: Daily Progress vs Campaign Target (Recharts Data)
  const dateSubCountMap: Record<string, number> = {};
  visibleFichas.forEach((f) => {
    if (f.data) {
      dateSubCountMap[f.data] = (dateSubCountMap[f.data] || 0) + 1;
    }
  });

  const allActiveDates = Array.from(
    new Set([...Object.keys(dateSubCountMap), targetDate])
  ).sort();

  const targetPerDay = totalExpectedDailyFichas > 0 ? totalExpectedDailyFichas : 20;

  const dailyProgressChartData = allActiveDates.map((d) => {
    const submetidas = dateSubCountMap[d] || 0;
    const target = targetPerDay;
    const taxa = target > 0 ? Math.round((submetidas / target) * 100) : 0;
    return {
      data: d,
      dataDisplay: d.split('-').reverse().slice(0, 2).join('/'),
      Submetidas: submetidas,
      Target: target,
      TaxaCumprimento: taxa,
    };
  });

  return (
    <div className="space-y-2.5">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950">Dashboard Geral</h1>
          <p className="mt-0.5 text-xs font-bold text-slate-700">
            {user.tipo === 'supervisor' && user.coordNome
              ? `Acompanhamento operacional da ${user.coordNome}`
              : 'Visão geral consolidada das mobilizações de saúde no terreno'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onViewPFACases && (
            <ActionTooltip content="Abre o painel de vigilância de Paralisia Flácida Aguda (PFA) para controlo epidemiológico da Pólio (UNICEF/OMS).">
              <button
                onClick={onViewPFACases}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200 px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer animate-pulse"
                id="dash-btn-pfa"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <span>Casos PFA ({casosPFA.length})</span>
              </button>
            </ActionTooltip>
          )}

          {/* Botão de Ponto Verde Piscante: Supervisores a Lançar Dados */}
          <button
            onClick={() => setIsActiveSupervisorsOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-3.5 py-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300 shadow-2xs transition active:scale-95 cursor-pointer"
            id="dash-btn-supervisores-ativos"
            title="Clique para ver a lista de pessoas que estão a lançar os dados no sistema agora"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{activeSupervisorsCount} Supervisores em Lançamento</span>
          </button>

          <ActionTooltip content="Abre a inteligência artificial para resumir dados, gerar relatórios operacionais e identificar tendências no terreno.">
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
              id="dash-btn-ai"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Gerar Relatório IA</span>
            </button>
          </ActionTooltip>

          <ActionTooltip content="Abre o formulário digital para registar uma nova ficha de mobilização de campo.">
            <button
              onClick={onNewFicha}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white shadow-2xs transition active:scale-[0.98] cursor-pointer"
              id="dash-btn-nova-ficha"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Nova Ficha</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* Ticker Marquee Contínuo de Destaques em Movimento */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs animate-pulse">
            <Radio className="h-3 w-3 text-white" />
            <span>EM CAMPO</span>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className="flex items-center gap-8 whitespace-nowrap animate-marquee text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 text-sky-300">
                <Megaphone className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Brigadas Móveis ativas no Sumbe: Bairros Chingo, Quissala e 15 de Março em acção intensiva</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Meta do Dia: Sensibilização de 12.500 Famílias no Cuanza Sul</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Sincronização 100% Digital via ODK Collect Central & SisMob</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>Vigilância Epidemiológica de PFA / Pólio - Notificação em Tempo Real</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-sky-300">
                <Megaphone className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Brigadas Móveis ativas no Sumbe: Bairros Chingo, Quissala e 15 de Março em acção intensiva</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Meta do Dia: Sensibilização de 12.500 Famílias no Cuanza Sul</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controlo Diário de Fichas (Monitor de Metas) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100">
              <Target className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">
                Controlo Diário de Entrada de Fichas
              </h2>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Controlo global de submissões por mobilizador e coordenação'
                  : 'Controlo da meta diária da sua equipa de mobilizadores'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-medium"
              id="input-dash-target-date"
            />
          </div>
        </div>

        {/* Progress Metrics Bar */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 rounded-xl p-1">
          {/* Meta Diária - Azul */}
          <div className="rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/90 dark:bg-blue-950/60 p-2.5 sm:p-3 space-y-1 shadow-xs transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Meta Diária de Fichas
              </span>
              <span className="rounded-md bg-blue-200 dark:bg-blue-800 px-1.5 py-0.2 text-[9px] font-extrabold text-blue-900 dark:text-blue-100">
                Meta
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-blue-950 dark:text-white">
              {totalExpectedDailyFichas} <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">fichas</span>
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">Total mobilizadores registados</p>
          </div>

          {/* Submetidas Hoje - Verde Claro */}
          <div className="rounded-xl border-2 border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 p-2.5 sm:p-3 space-y-1 shadow-xs transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Submetidas Hoje ({targetDate})
              </span>
              <span className="rounded-md bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-900 dark:text-emerald-100">
                Entregues
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
              {todayFichas.length} <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">fichas</span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
              ✓ {submittedMobilizadores.length} de {totalExpectedDailyFichas} mobilizadores entregaram
            </p>
          </div>

          {/* Fichas Pendentes Hoje - Vermelho / Amarelo */}
          <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/60 p-2.5 sm:p-3 space-y-1 shadow-xs transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-900 dark:text-red-200 uppercase tracking-wider">
                Fichas Pendentes Hoje
              </span>
              <span className="rounded-md bg-red-200 dark:bg-red-800 px-1.5 py-0.2 text-[9px] font-extrabold text-red-900 dark:text-red-100">
                Em Falta
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
              {pendingMobilizadores.length} <span className="text-xs font-semibold text-red-800 dark:text-red-300">faltam</span>
            </div>
            <p className="text-[11px] text-red-800 dark:text-red-300 font-bold">Aguardando entrega de dados</p>
          </div>
        </div>

        {/* Global Campaign Targets & Achievements */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Metas & Objetivos de Alcance da Campanha (Sumbe)
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && onOpenGoalModal && (
                <button
                  onClick={onOpenGoalModal}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition cursor-pointer"
                  id="dash-btn-config-metas"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Configurar Metas</span>
                </button>
              )}

              {totalPessoas >= 5000 && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                  Meta Geral Cumprida 🎉
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Pessoas Goal - Verde Claro */}
            <div className="rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 p-2.5 sm:p-3 border-2 border-emerald-300 dark:border-emerald-700 space-y-1.5 shadow-xs transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md cursor-pointer">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-emerald-900 dark:text-emerald-200">Pessoas Alcançadas</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                  {totalPessoas.toLocaleString()} / {goals.reduce((s, g) => s + (g.targetPessoas || 0), 0) || 12500}
                </span>
              </div>
              <div className="w-full h-2.5 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (totalPessoas / (goals.reduce((s, g) => s + (g.targetPessoas || 0), 0) || 12500)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                <span>
                  {Math.round(
                    (totalPessoas / (goals.reduce((s, g) => s + (g.targetPessoas || 0), 0) || 12500)) * 100
                  )}% concluído
                </span>
                <span>Faltam {Math.max(0, (goals.reduce((s, g) => s + (g.targetPessoas || 0), 0) || 12500) - totalPessoas).toLocaleString()}</span>
              </div>
            </div>

            {/* Locais Goal - Azul Vivo */}
            <div className="rounded-xl bg-sky-50/90 dark:bg-sky-950/50 p-2.5 sm:p-3 border-2 border-sky-300 dark:border-sky-700 space-y-1.5 shadow-xs transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md cursor-pointer">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-sky-900 dark:text-sky-200">Locais Visitados</span>
                <span className="font-mono font-extrabold text-sky-700 dark:text-sky-300">
                  {totalLocais.toLocaleString()} / {goals.reduce((s, g) => s + (g.targetLocais || 0), 0) || 470}
                </span>
              </div>
              <div className="w-full h-2.5 bg-sky-200 dark:bg-sky-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (totalLocais / (goals.reduce((s, g) => s + (g.targetLocais || 0), 0) || 470)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-sky-800 dark:text-sky-300 font-bold">
                <span>
                  {Math.round(
                    (totalLocais / (goals.reduce((s, g) => s + (g.targetLocais || 0), 0) || 470)) * 100
                  )}% concluído
                </span>
                <span>Faltam {Math.max(0, (goals.reduce((s, g) => s + (g.targetLocais || 0), 0) || 470) - totalLocais).toLocaleString()}</span>
              </div>
            </div>

            {/* Acceptance Goal - Amarelo / Dourado */}
            <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/50 p-2.5 sm:p-3 border-2 border-amber-300 dark:border-amber-700 space-y-1.5 shadow-xs transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md cursor-pointer">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-amber-900 dark:text-amber-200">Meta Taxa Aceitação</span>
                <span className="font-mono font-extrabold text-amber-800 dark:text-amber-300">{acceptanceRate}% / 80%</span>
              </div>
              <div className="w-full h-2.5 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((acceptanceRate / 80) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-amber-800 dark:text-amber-300 font-bold">
                <span>{acceptanceRate >= 80 ? 'Objetivo Superado! 🎯' : 'Em progresso'}</span>
                <span>Meta: 80%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between text-xs text-slate-900 dark:text-white font-bold">
            <span>Cumprimento da Meta Diária ({targetDate}):</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold">{dailyProgress}% Concluído</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ${dailyProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        {/* Breakdown List of Mobilizadores */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
          {/* Submetidos - Verde */}
          <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/40 p-2.5 sm:p-3 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Fichas Entregues Hoje ({submittedMobilizadores.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {submittedMobilizadores.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-900"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                  {m.nome}
                </span>
              ))}
              {submittedMobilizadores.length === 0 && (
                <span className="text-[11px] text-emerald-900 italic font-semibold">
                  Nenhuma ficha submetida para a data selecionada.
                </span>
              )}
            </div>
          </div>

          {/* Pendentes - Vermelho */}
          <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50/90 dark:bg-red-950/40 p-2.5 sm:p-3 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-900 dark:text-red-200">
              <Clock className="h-3.5 w-3.5 text-red-600 stroke-[2.5]" />
              <span>Aguardando Ficha de Hoje ({pendingMobilizadores.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {pendingMobilizadores.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-100 border border-red-300 px-2 py-0.5 text-xs font-bold text-red-950"
                >
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span>{m.nome}</span>
                  <button
                    onClick={() => sendWhatsAppReminder(m.nome, 'mobilizador', m.telefone, m.coordNome)}
                    className="ml-0.5 inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.2 text-[9px] font-bold text-white hover:bg-emerald-700 transition"
                    title="Cobrar via WhatsApp"
                  >
                    <MessageSquare className="h-2.5 w-2.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              ))}
              {pendingMobilizadores.length === 0 && (
                <span className="text-[11px] text-emerald-800 font-extrabold italic">
                  🎉 Excelente! Todos os mobilizadores já entregaram a ficha de hoje!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast Alert if Reminder Triggered */}
      {reminderNotice && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-amber-600 animate-bounce" />
            <span className="font-medium">{reminderNotice}</span>
          </div>
          <button
            onClick={() => setReminderNotice(null)}
            className="rounded-lg bg-white border border-amber-200 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Carrossel Dinâmico & Mural de Publicações */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-5 shadow-2xs space-y-4">
        {/* Header da Secção */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold shadow-md">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Destaques & Publicações em Carrossel Dinâmico</span>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                  {portalPosts.length} {portalPosts.length === 1 ? 'publicação' : 'publicações'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Informações em rotação dinâmica, comunicados de saúde, brigadas móveis e avisos operacionais
              </p>
            </div>
          </div>

          {isAdmin && onOpenPortalNews && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPortalNews}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] cursor-pointer"
                id="dash-btn-criar-noticia"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Gerir / Criar Publicação</span>
              </button>
            </div>
          )}
        </div>

        {/* 1. CARROSSEL PRINCIPAL (HERO SLIDE) */}
        {carouselPosts.length > 0 && activeSlide ? (
          <div className="space-y-3">
            <div
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
              className="relative min-h-[340px] sm:min-h-[400px] md:min-h-[440px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl group"
            >
              {/* Background Imagem com transição suave */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide.id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  className="absolute inset-0"
                >
                  {activeSlide.imagemUrl && sanitizeImageUrl(activeSlide.imagemUrl) ? (
                    <img
                      src={sanitizeImageUrl(activeSlide.imagemUrl)}
                      alt={activeSlide.titulo}
                      className="w-full h-full object-cover filter brightness-[0.7] contrast-[1.1] transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950" />
                  )}
                  {/* Overlay gradiente escuro para legibilidade perfeita */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
                </motion.div>
              </AnimatePresence>

              {/* Controles do Carrossel (Overlay Superior) */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1 text-[11px] font-mono font-bold text-white shadow-md">
                    {safeSlideIndex + 1} / {carouselPosts.length}
                  </span>
                  {activeSlide.destaque && (
                    <span className="rounded-xl bg-amber-500 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-slate-950 shadow-md flex items-center gap-1 uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      Destaque Principal
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 p-1">
                  <button
                    onClick={() => setIsCarouselPlaying(!isCarouselPlaying)}
                    className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title={isCarouselPlaying ? 'Pausar Carrossel' : 'Iniciar Carrossel'}
                  >
                    {isCarouselPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() =>
                      setCurrentSlideIndex((prev) => (prev === 0 ? carouselPosts.length - 1 : prev - 1))
                    }
                    className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % carouselPosts.length)}
                    className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Próximo"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Conteúdo do Slide (Overlay Inferior) */}
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 z-10 space-y-2.5 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm text-white ${
                      activeSlide.categoria === 'Brigada Móvel'
                        ? 'bg-emerald-600'
                        : activeSlide.categoria === 'Aviso'
                        ? 'bg-rose-600'
                        : activeSlide.categoria === 'Guia'
                        ? 'bg-amber-600'
                        : activeSlide.categoria === 'Estatística'
                        ? 'bg-purple-600'
                        : 'bg-sky-600'
                    }`}
                  >
                    {activeSlide.categoria}
                  </span>

                  {activeSlide.subtitulo && (
                    <span className="text-xs font-bold text-sky-300 drop-shadow-sm flex items-center gap-1">
                      <span>•</span> {activeSlide.subtitulo}
                    </span>
                  )}

                  <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {activeSlide.data}
                  </span>
                </div>

                <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md">
                  {activeSlide.titulo}
                </h3>

                <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 sm:line-clamp-3 leading-relaxed font-normal max-w-3xl drop-shadow-sm">
                  {activeSlide.conteudo}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Emissor: <span className="text-white font-bold">{activeSlide.autor}</span>
                  </div>

                  <button
                    onClick={() => setReaderPost(activeSlide)}
                    className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ler Publicação Completa</span>
                  </button>
                </div>
              </div>

              {/* Linha de Progresso do Temporizador */}
              {isCarouselPlaying && !isCarouselHovered && (
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-20">
                  <motion.div
                    key={`${activeSlide.id}-${currentSlideIndex}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className="h-full bg-sky-400 shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Faixa de Miniaturas (Mini-Cards para seleção direta) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {carouselPosts.map((post, idx) => (
                <button
                  key={post.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`flex-1 min-w-[170px] max-w-[220px] rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    idx === safeSlideIndex
                      ? 'border-sky-500 bg-sky-50/90 dark:bg-sky-950/60 ring-2 ring-sky-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-500 mb-1">
                    <span className="truncate text-sky-600 dark:text-sky-400 font-extrabold">{post.categoria}</span>
                    <span className="font-mono text-[9px] text-slate-400">{post.data}</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1 leading-tight">
                    {post.titulo}
                  </h4>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 space-y-2">
            <Newspaper className="h-8 w-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nenhuma publicação registada na página inicial.
            </p>
          </div>
        )}

        {/* 2. MURAL COMPLETO DE PUBLICAÇÕES (FILTROS + PESQUISA + GRELA) */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Abas de Categorias */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['Todos', 'Destaques', 'Brigada Móvel', 'Notícia', 'Guia', 'Aviso', 'Estatística'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedNewsCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedNewsCategory === cat
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={newsSearchQuery}
                onChange={(e) => setNewsSearchQuery(e.target.value)}
                placeholder="Pesquisar notícias..."
                className="w-full h-8 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Grelha de Cartões de Notícias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGridPosts.map((post) => (
              <div
                key={post.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-sky-400 dark:hover:border-sky-500 transition-all duration-200 shadow-2xs hover:shadow-md"
              >
                {/* Imagem do Cartão */}
                {post.imagemUrl && sanitizeImageUrl(post.imagemUrl) && (
                  <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                    <img
                      src={sanitizeImageUrl(post.imagemUrl)}
                      alt={post.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).parentElement!.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 rounded-lg bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-white/10">
                      {post.categoria}
                    </span>
                  </div>
                )}

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    {!post.imagemUrl && (
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-2 py-0.5 text-[10px] font-extrabold text-sky-800 dark:text-sky-300">
                          {post.categoria}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{post.data}</span>
                      </div>
                    )}

                    <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight group-hover:text-sky-600 transition-colors">
                      {post.titulo}
                    </h3>

                    {post.subtitulo && (
                      <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                        {post.subtitulo}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {post.conteudo}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-500">{post.autor}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setReaderPost(post)}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 transition cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Ler</span>
                      </button>

                      {isAdmin && (
                        <>
                          {onOpenPortalNews && (
                            <button
                              onClick={onOpenPortalNews}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm(`Eliminar a publicação "${post.titulo}"?`)) {
                                if (onDeletePortalPost) await onDeletePortalPost(post.id);
                              }
                            }}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredGridPosts.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                Nenhuma publicação encontrada para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE LEITURA COMPLETA DE PUBLICAÇÃO */}
      {readerPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header com Imagem */}
            {readerPost.imagemUrl && (
              <div className="relative h-52 sm:h-64 -mx-6 -mt-6 overflow-hidden rounded-t-3xl bg-slate-950">
                <img
                  src={readerPost.imagemUrl}
                  alt={readerPost.titulo}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                <button
                  onClick={() => setReaderPost(null)}
                  className="absolute top-4 right-4 rounded-full bg-slate-950/80 p-2 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {!readerPost.imagemUrl && (
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="rounded-lg bg-sky-500/20 border border-sky-400/30 px-2.5 py-1 text-xs font-bold text-sky-300">
                  {readerPost.categoria}
                </span>
                <button
                  onClick={() => setReaderPost(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Conteúdo Detalhado */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-bold text-sky-400">{readerPost.categoria}</span>
                <span>•</span>
                <span className="font-mono">{readerPost.data}</span>
                <span>•</span>
                <span>Autor: {readerPost.autor}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {readerPost.titulo}
              </h2>

              {readerPost.subtitulo && (
                <h3 className="text-sm font-bold text-sky-300">
                  {readerPost.subtitulo}
                </h3>
              )}

              <div className="border-t border-slate-800 pt-4 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3">
                {readerPost.conteudo}
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Comunicado</span>
              </button>

              <button
                onClick={() => setReaderPost(null)}
                className="rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2 text-xs font-bold text-slate-950 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pessoas Alcançadas - Verde Claro */}
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/60 p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Total Pessoas Alcançadas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-950 dark:text-white">
              {totalPessoas.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Pessoas
            </span>
          </div>
          <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
            Soma acumulada em todas as fichas
          </p>
        </div>

        {/* Locais Visados - Azul */}
        <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/90 dark:bg-blue-950/60 p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
              Locais Visitados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-400">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-blue-950 dark:text-white">
              {totalLocais.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
              Pontos
            </span>
          </div>
          <p className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">
            Casas, Igrejas, Mercados, etc.
          </p>
        </div>

        {/* Total Fichas Submetidas - Sky / Cyan */}
        <div className="rounded-2xl border-2 border-sky-300 dark:border-sky-700 bg-sky-50/90 dark:bg-sky-950/60 p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-sky-950 dark:text-sky-200 uppercase tracking-wider">
              Total Fichas Submetidas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 border border-sky-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-sky-950 dark:text-white">
              {visibleFichas.length.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
              Relatórios
            </span>
          </div>
          <p className="text-[10px] font-semibold text-sky-800 dark:text-sky-300">
            Registo em base de dados
          </p>
        </div>

        {/* Taxa de Aceitação - Amarelo / Dourado */}
        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/60 p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
              Taxa de Aceitação
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-950 dark:text-white">
              {acceptanceRate}%
            </span>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              SIM vs NÃO
            </span>
          </div>
          <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
            {totalSim.toLocaleString()} Aceitações / {totalNao.toLocaleString()} Recusas
          </p>
        </div>
      </div>

      {/* Mapa de Distribuição Geográfica em Tempo Real */}
      <MapaFichasView
        fichas={fichas}
        coordenacoes={coordenacoes}
        className="w-full min-h-[420px]"
      />

      {/* Charts Section Grid */}
      {/* Chart 1: Progresso Diário vs Target da Campanha (Recharts) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-800">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Gráfico de Progresso Diário vs Target Estabelecido da Campanha
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Comparativo em Recharts: Fichas Submetidas vs Meta Diária Planeada ({targetPerDay} fichas/dia)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              ✓ Submetidas Hoje: {todayFichas.length}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              🎯 Meta Diária: {targetPerDay}
            </span>
          </div>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyProgressChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="dataDisplay" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-slate-900/95 p-3 text-white shadow-xl border border-slate-700 text-xs space-y-1">
                        <p className="font-extrabold text-blue-400 border-b border-slate-700 pb-1">
                          Data: {dataObj.data}
                        </p>
                        <p className="font-semibold text-emerald-400 flex items-center justify-between gap-4">
                          <span>Fichas Submetidas:</span>
                          <span className="font-mono font-bold">{dataObj.Submetidas}</span>
                        </p>
                        <p className="font-semibold text-blue-300 flex items-center justify-between gap-4">
                          <span>Target Estabelecido:</span>
                          <span className="font-mono font-bold">{dataObj.Target}</span>
                        </p>
                        <p className="font-semibold text-amber-300 flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                          <span>Taxa de Cumprimento:</span>
                          <span className="font-mono font-bold">{dataObj.TaxaCumprimento}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Submetidas" fill="#10B981" radius={[6, 6, 0, 0]} name="Fichas Submetidas" />
              <Line type="monotone" dataKey="Target" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} name="Target Estabelecido" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Bar Chart - Pessoas por Local de Mobilização */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                Distribuição de Pessoas por Tipo de Local
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Comparativo de alcance nos pontos estratégicos de intervenção
              </p>
            </div>
          </div>

          <div className="h-52 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ff4000',
                    borderColor: '#2563EB',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="Pessoas" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {barData.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-2 text-xs transition hover:border-blue-300 shadow-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="truncate text-[11px]">{item.name}</span>
                  <span className="text-blue-600 font-mono text-[11px]">
                    {item.percent}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {item.Pessoas.toLocaleString()} pessoas
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm flex flex-col justify-between space-y-2.5">
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">Aceitação de Visita Vacinal</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Respostas das famílias abordadas</p>
          </div>
          <div className="flex h-48 items-center justify-center">
            {totalRespostas > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#16A34A',
                      borderRadius: '0.75rem',
                      color: '#FFFFFF',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', color: '#64748b' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-500">
                Sem respostas registadas ainda
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Mobilizations */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Últimas Fichas Submetidas
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Acompanhamento do envio de relatórios em tempo real
            </p>
          </div>
          <button
            onClick={onViewAllFichas}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            id="dash-btn-ver-todas"
          >
            <span>Ver Todas</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Mobilizador</th>
                <th className="p-3">Coordenação</th>
                <th className="p-3">Bairro / Comunidade</th>
                <th className="p-3 text-center">Locais</th>
                <th className="p-3 text-right">Pessoas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleFichas.slice(0, 5).map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono text-slate-500">{f.data}</td>
                  <td className="p-3 font-bold text-slate-900">{f.mobilizador}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {f.coordNome}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{f.bairro}</td>
                  <td className="p-3 text-center font-mono text-slate-700">{f.totalLocais}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    {f.totalPessoas.toLocaleString()}
                  </td>
                </tr>
              ))}
              {visibleFichas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nenhuma ficha registada no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Supervisores a Lançar Dados */}
      <ActiveSupervisorsModal
        isOpen={isActiveSupervisorsOpen}
        onClose={() => setIsActiveSupervisorsOpen(false)}
        users={users}
        currentUser={user}
        fichas={fichas}
        coordenacoes={coordenacoes}
        mobilizadores={mobilizadores}
        onSelectSupervisorFichas={() => onViewAllFichas()}
      />
    </div>
  );
};
