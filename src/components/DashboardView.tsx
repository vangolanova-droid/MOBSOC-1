import React, { useState } from 'react';
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
} from 'recharts';
import { Coordination, Ficha, Mobilizador, User } from '../types';
import { LOCATION_CONFIGS } from '../data/initialData';

interface DashboardViewProps {
  user: User;
  fichas: Ficha[];
  mobilizadores: Mobilizador[];
  coordenacoes: Coordination[];
  users: User[];
  onNewFicha: () => void;
  onViewAllFichas: () => void;
  onOpenAiModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  fichas,
  mobilizadores,
  coordenacoes,
  users,
  onNewFicha,
  onViewAllFichas,
  onOpenAiModal,
}) => {
  const isAdmin = user.tipo === 'admin';

  // Date selection for Daily Target Monitor (default to today: 2026-08-03 or current system date)
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState('2026-08-03');
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

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

  return (
    <div className="space-y-3.5">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard Geral</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {user.tipo === 'supervisor' && user.coordNome
              ? `Acompanhamento operacional da ${user.coordNome}`
              : 'Visão geral consolidada das mobilizações de saúde no terreno'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
            id="dash-btn-ai"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Gerar Relatório IA</span>
          </button>
          <button
            onClick={onNewFicha}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-medium text-white shadow-2xs transition active:scale-[0.98]"
            id="dash-btn-nova-ficha"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nova Ficha</span>
          </button>
        </div>
      </div>

      {/* Controlo Diário de Fichas (Monitor de Metas) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-4.5 shadow-2xs space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Controlo Diário de Entrada de Fichas
              </h2>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Controlo global de submissões por mobilizador e coordenação'
                  : 'Controlo da meta diária da sua equipa de mobilizadores'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-medium"
              id="input-dash-target-date"
            />
          </div>
        </div>

        {/* Progress Metrics Bar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl p-2.5">
          {/* Meta Diária - Azul */}
          <div className="rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/90 dark:bg-blue-950/60 p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Meta Diária de Fichas
              </span>
              <span className="rounded-md bg-blue-200 dark:bg-blue-800 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 dark:text-blue-100">
                Meta
              </span>
            </div>
            <div className="text-3xl font-black font-mono text-blue-950 dark:text-white">
              {totalExpectedDailyFichas} <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">fichas</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">Total mobilizadores registados</p>
          </div>

          {/* Submetidas Hoje - Verde Claro */}
          <div className="rounded-xl border-2 border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Submetidas Hoje ({targetDate})
              </span>
              <span className="rounded-md bg-emerald-200 dark:bg-emerald-800 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 dark:text-emerald-100">
                Entregues
              </span>
            </div>
            <div className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300">
              {todayFichas.length} <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">fichas</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">
              ✓ {submittedMobilizadores.length} de {totalExpectedDailyFichas} mobilizadores entregaram
            </p>
          </div>

          {/* Fichas Pendentes Hoje - Vermelho / Amarelo */}
          <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/60 p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900 dark:text-red-200 uppercase tracking-wider">
                Fichas Pendentes Hoje
              </span>
              <span className="rounded-md bg-red-200 dark:bg-red-800 px-2 py-0.5 text-[10px] font-extrabold text-red-900 dark:text-red-100">
                Em Falta
              </span>
            </div>
            <div className="text-3xl font-black font-mono text-red-600 dark:text-red-400">
              {pendingMobilizadores.length} <span className="text-xs font-semibold text-red-800 dark:text-red-300">faltam</span>
            </div>
            <p className="text-xs text-red-800 dark:text-red-300 font-bold">Aguardando entrega de dados</p>
          </div>
        </div>

        {/* Global Campaign Targets & Achievements */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Metas & Objetivos de Alcance da Campanha
              </h3>
            </div>
            {totalPessoas >= 5000 && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-bold">
                Meta Geral Cumprida 🎉
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pessoas Goal - Verde Claro */}
            <div className="rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 p-4 border-2 border-emerald-300 dark:border-emerald-700 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-900 dark:text-emerald-200">Pessoas Alcançadas</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                  {totalPessoas.toLocaleString()} / 5.000
                </span>
              </div>
              <div className="w-full h-3 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((totalPessoas / 5000) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                <span>{Math.round((totalPessoas / 5000) * 100)}% concluído</span>
                <span>Faltam {Math.max(0, 5000 - totalPessoas).toLocaleString()}</span>
              </div>
            </div>

            {/* Locais Goal - Azul Vivo */}
            <div className="rounded-xl bg-sky-50/90 dark:bg-sky-950/50 p-4 border-2 border-sky-300 dark:border-sky-700 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-sky-900 dark:text-sky-200">Locais Visitados</span>
                <span className="font-mono font-extrabold text-sky-700 dark:text-sky-300">
                  {totalLocais.toLocaleString()} / 200
                </span>
              </div>
              <div className="w-full h-3 bg-sky-200 dark:bg-sky-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((totalLocais / 200) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-sky-800 dark:text-sky-300 font-bold">
                <span>{Math.round((totalLocais / 200) * 100)}% concluído</span>
                <span>Faltam {Math.max(0, 200 - totalLocais).toLocaleString()}</span>
              </div>
            </div>

            {/* Acceptance Goal - Amarelo / Dourado */}
            <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/50 p-4 border-2 border-amber-300 dark:border-amber-700 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-900 dark:text-amber-200">Meta Taxa Aceitação</span>
                <span className="font-mono font-extrabold text-amber-800 dark:text-amber-300">{acceptanceRate}% / 80%</span>
              </div>
              <div className="w-full h-3 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((acceptanceRate / 80) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-amber-800 dark:text-amber-300 font-bold">
                <span>{acceptanceRate >= 80 ? 'Objetivo Superado! 🎯' : 'Em progresso'}</span>
                <span>Meta: 80%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between text-xs text-slate-900 dark:text-white font-bold">
            <span>Cumprimento da Meta Diária ({targetDate}):</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold">{dailyProgress}% Concluído</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ${dailyProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        {/* Breakdown List of Mobilizadores */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Submetidos - Verde */}
          <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/40 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Fichas Entregues Hoje ({submittedMobilizadores.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {submittedMobilizadores.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-900"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                  {m.nome}
                </span>
              ))}
              {submittedMobilizadores.length === 0 && (
                <span className="text-xs text-emerald-900 italic font-semibold">
                  Nenhuma ficha submetida para a data selecionada.
                </span>
              )}
            </div>
          </div>

          {/* Pendentes - Vermelho */}
          <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50/90 dark:bg-red-950/40 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-red-900 dark:text-red-200">
              <Clock className="h-4 w-4 text-red-600 stroke-[2.5]" />
              <span>Aguardando Ficha de Hoje ({pendingMobilizadores.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {pendingMobilizadores.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 border border-red-300 px-2.5 py-1 text-xs font-bold text-red-950"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  <span>{m.nome}</span>
                  <button
                    onClick={() => sendWhatsAppReminder(m.nome, 'mobilizador', m.telefone, m.coordNome)}
                    className="ml-1 inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition"
                    title="Cobrar via WhatsApp"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              ))}
              {pendingMobilizadores.length === 0 && (
                <span className="text-xs text-emerald-800 font-extrabold italic">
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

      {/* Monitor de Supervisores */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Controlo de Submissão por Supervisor
              </h2>
              <p className="text-xs text-slate-500">
                Verifique se os supervisores entregaram as fichas do dia ({targetDate})
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            {supervisorsList.length} Supervisores Registados
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">Supervisor</th>
                <th className="p-3">Coordenação & Coordenador</th>
                <th className="p-3 text-center">Fichas Submetidas Hoje ({targetDate})</th>
                <th className="p-3 text-center">Estado de Entrega</th>
                <th className="p-3 text-right">Ação / Contacto Directo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {supervisorsList.map((sup) => {
                const supFichas = todayFichas.filter(
                  (f) => f.userId === sup.id || f.coordId === sup.coordId
                );
                const hasSubmitted = supFichas.length > 0;
                const coordInfo = coordenacoes.find((c) => c.id === sup.coordId);
                const coordenador = coordInfo?.coordenador || sup.coordenadorNome || '—';

                return (
                  <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{sup.nome}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{sup.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-blue-600">{sup.coordNome || 'Geral'}</div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        Coordenador: {coordenador}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`font-mono text-xs font-bold ${
                          hasSubmitted ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {supFichas.length} fichas
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {hasSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Entregue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Pendente / Em Atraso
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!hasSubmitted ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              sendWhatsAppReminder(
                                sup.nome,
                                'supervisor',
                                '',
                                sup.coordNome
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition"
                            title="Abrir WhatsApp com mensagem pré-formatada"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => {
                              setReminderNotice(
                                `🔔 Alerta de cobrança registado para o Supervisor ${sup.nome} (${sup.email}) referente ao dia ${targetDate}.`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Notificar</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold font-mono">
                          ✓ Em dia
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {supervisorsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                    Nenhum supervisor registado na plataforma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pessoas Alcançadas - Verde Claro */}
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/60 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Total Pessoas Alcançadas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-emerald-950 dark:text-white">
              {totalPessoas.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Pessoas
            </span>
          </div>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Soma acumulada em todas as fichas
          </p>
        </div>

        {/* Locais Visados - Azul */}
        <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/90 dark:bg-blue-950/60 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
              Locais Visitados
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-400">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-blue-950 dark:text-white">
              {totalLocais.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
              Pontos
            </span>
          </div>
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
            Casas, Igrejas, Mercados, etc.
          </p>
        </div>

        {/* Total Fichas Submetidas - Sky / Cyan */}
        <div className="rounded-2xl border-2 border-sky-300 dark:border-sky-700 bg-sky-50/90 dark:bg-sky-950/60 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sky-950 dark:text-sky-200 uppercase tracking-wider">
              Total Fichas Submetidas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 border border-sky-400">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-sky-950 dark:text-white">
              {visibleFichas.length.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
              Relatórios
            </span>
          </div>
          <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">
            Registo em base de dados
          </p>
        </div>

        {/* Taxa de Aceitação - Amarelo / Dourado */}
        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/60 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
              Taxa de Aceitação
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-amber-950 dark:text-white">
              {acceptanceRate}%
            </span>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              SIM vs NÃO
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {totalSim.toLocaleString()} Aceitações / {totalNao.toLocaleString()} Recusas
          </p>
        </div>
      </div>

      {/* Charts Section Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar Chart - Pessoas por Local de Mobilização */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Distribuição de Pessoas por Tipo de Local
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Comparativo de alcance nos pontos estratégicos de intervenção
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#2563EB',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="Pessoas" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {barData.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs transition hover:border-blue-300 shadow-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="truncate text-xs">{item.name}</span>
                  <span className="text-blue-600 font-mono text-xs">
                    {item.percent}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  {item.Pessoas.toLocaleString()} pessoas
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Aceitação de Visita Vacinal</h2>
            <p className="mt-0.5 text-xs text-slate-500">Respostas das famílias abordadas</p>
          </div>
          <div className="flex h-56 items-center justify-center">
            {totalRespostas > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
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
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
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
    </div>
  );
};
