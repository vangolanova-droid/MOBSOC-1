import React, { useState, useMemo } from 'react';
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
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  Percent,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  MapPin,
  Layers,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  UserCheck,
  Building2,
  Activity,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { Coordination, Ficha, Mobilizador, User } from '../types';

interface GraficosViewProps {
  user: User;
  fichas: Ficha[];
  mobilizadores?: Mobilizador[];
  coordenacoes?: Coordination[];
  users?: User[];
}

const COLORS = [
  '#00B2FF',
  '#10B981',
  '#F59E0B',
  '#6366F1',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#3B82F6',
  '#06B6D4',
];

interface MobilizadorStat {
  nome: string;
  codigoId: string;
  coordNome: string;
  totalFichas: number;
  totalPessoas: number;
  sim: number;
  nao: number;
}

export const GraficosView: React.FC<GraficosViewProps> = ({
  user,
  fichas,
  mobilizadores = [],
  coordenacoes = [],
}) => {
  const [selectedCoord, setSelectedCoord] = useState<string>('');
  const [selectedRonda, setSelectedRonda] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'geral' | 'mobilizadores' | 'locais'>('geral');
  const [topLimit, setTopLimit] = useState<number>(10);

  // Filter fichas based on user scope and UI filters
  const visibleFichas = useMemo(() => {
    let list = user.tipo === 'admin'
      ? fichas
      : fichas.filter((f) => f.coordId === user.coordId);

    if (selectedCoord) {
      list = list.filter((f) => String(f.coordId) === selectedCoord || f.coordNome === selectedCoord);
    }
    if (selectedRonda) {
      list = list.filter((f) => (f.ronda || '1ª Ronda') === selectedRonda);
    }
    return list;
  }, [fichas, user, selectedCoord, selectedRonda]);

  // Overall Population Metrics
  const totalPessoasOverall = useMemo(() => {
    return visibleFichas.reduce((s, f) => s + (f.totalPessoas || 0), 0);
  }, [visibleFichas]);

  const totalFichasOverall = visibleFichas.length;

  const totalSimOverall = useMemo(() => {
    return visibleFichas.reduce((s, f) => s + (f.sim || 0), 0);
  }, [visibleFichas]);

  const totalNaoOverall = useMemo(() => {
    return visibleFichas.reduce((s, f) => s + (f.nao || 0), 0);
  }, [visibleFichas]);

  const simPctOverall = useMemo(() => {
    const sum = totalSimOverall + totalNaoOverall;
    if (sum === 0) return 0;
    return Number(((totalSimOverall / sum) * 100).toFixed(1));
  }, [totalSimOverall, totalNaoOverall]);

  // Consolidated list of Mobilizadores
  const allMobilizadoresCombined = useMemo(() => {
    // Collect from DB list + any referenced in fichas
    const map = new Map<string, { nome: string; codigoId: string; coordNome: string }>();

    mobilizadores.forEach((m) => {
      if (m.nome) {
        map.set(m.nome.trim().toLowerCase(), {
          nome: m.nome,
          codigoId: m.codigoId || '',
          coordNome: m.coordNome || '',
        });
      }
    });

    fichas.forEach((f) => {
      if (f.mobilizador) {
        const key = f.mobilizador.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            nome: f.mobilizador,
            codigoId: f.mobilizadorCodigoId || '',
            coordNome: f.coordNome || '',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [mobilizadores, fichas]);

  // Mobilizador-based Aggregations
  const mobilizadorStatsMap = useMemo(() => {
    const stats: Record<string, MobilizadorStat> = {};

    visibleFichas.forEach((f) => {
      const mobName = f.mobilizador || 'Não Identificado';
      if (!stats[mobName]) {
        stats[mobName] = {
          nome: mobName,
          codigoId: f.mobilizadorCodigoId || '',
          coordNome: f.coordNome || '',
          totalFichas: 0,
          totalPessoas: 0,
          sim: 0,
          nao: 0,
        };
      }
      stats[mobName].totalFichas += 1;
      stats[mobName].totalPessoas += f.totalPessoas || 0;
      stats[mobName].sim += f.sim || 0;
      stats[mobName].nao += f.nao || 0;
    });

    return stats;
  }, [visibleFichas]);

  const activeMobilizadoresList = useMemo<MobilizadorStat[]>(() => {
    return (Object.values(mobilizadorStatsMap) as MobilizadorStat[]).sort(
      (a, b) => b.totalPessoas - a.totalPessoas
    );
  }, [mobilizadorStatsMap]);

  const totalRegisteredMobilizadores = Math.max(
    allMobilizadoresCombined.length,
    activeMobilizadoresList.length
  );

  const activeMobilizadoresCount = activeMobilizadoresList.length;

  const mobilizadorActivityPct = totalRegisteredMobilizadores > 0
    ? Number(((activeMobilizadoresCount / totalRegisteredMobilizadores) * 100).toFixed(1))
    : 0;

  const avgPessoasPerActiveMob = activeMobilizadoresCount > 0
    ? Math.round(totalPessoasOverall / activeMobilizadoresCount)
    : 0;

  // Chart 1: Top Mobilizadores with Percentages (% do Total de Pessoas)
  const topMobilizadoresData = useMemo(() => {
    return activeMobilizadoresList.slice(0, topLimit).map((m) => {
      const pctShare = totalPessoasOverall > 0
        ? Number(((m.totalPessoas / totalPessoasOverall) * 100).toFixed(1))
        : 0;
      const totalSimNao = m.sim + m.nao;
      const simPct = totalSimNao > 0 ? Number(((m.sim / totalSimNao) * 100).toFixed(1)) : 0;

      return {
        nome: m.nome.length > 18 ? m.nome.substring(0, 16) + '...' : m.nome,
        nomeCompleto: m.nome,
        codigoId: m.codigoId,
        Pessoas: m.totalPessoas,
        PercentagemTotal: pctShare,
        SimPct: simPct,
        Fichas: m.totalFichas,
      };
    });
  }, [activeMobilizadoresList, totalPessoasOverall, topLimit]);

  // Chart 2: Distribution of Mobilizadores by Coordination (Pie Chart)
  const mobDistributionByCoord = useMemo(() => {
    const counts: Record<string, number> = {};
    allMobilizadoresCombined.forEach((m) => {
      const cName = m.coordNome || 'Sem Coordenação';
      counts[cName] = (counts[cName] || 0) + 1;
    });

    const totalMobs = allMobilizadoresCombined.length || 1;
    return Object.entries(counts).map(([name, val], idx) => ({
      name,
      value: val,
      percentagem: Number(((val / totalMobs) * 100).toFixed(1)),
      color: COLORS[idx % COLORS.length],
    }));
  }, [allMobilizadoresCombined]);

  // Chart 3: Mobilizer Activity Status (Active vs Inactive)
  const mobilizadorActivityStatusData = useMemo(() => {
    const inactiveCount = Math.max(0, totalRegisteredMobilizadores - activeMobilizadoresCount);
    const activePct = totalRegisteredMobilizadores > 0
      ? Number(((activeMobilizadoresCount / totalRegisteredMobilizadores) * 100).toFixed(1))
      : 0;
    const inactivePct = totalRegisteredMobilizadores > 0
      ? Number(((inactiveCount / totalRegisteredMobilizadores) * 100).toFixed(1))
      : 0;

    return [
      {
        name: 'Mobilizadores com Lançamentos',
        value: activeMobilizadoresCount,
        percentagem: activePct,
        color: '#10B981',
      },
      {
        name: 'Sem Lançamentos Registados',
        value: inactiveCount,
        percentagem: inactivePct,
        color: '#F59E0B',
      },
    ];
  }, [totalRegisteredMobilizadores, activeMobilizadoresCount]);

  // Chart 4: Acceptance Ratio Donut (SIM vs NÃO)
  const acceptanceDonutData = useMemo(() => {
    return [
      { name: `SIM - Aceitaram (${simPctOverall}%)`, value: totalSimOverall, color: '#10B981' },
      {
        name: `NÃO - Recusaram (${(100 - simPctOverall).toFixed(1)}%)`,
        value: totalNaoOverall,
        color: '#EF4444',
      },
    ];
  }, [totalSimOverall, totalNaoOverall, simPctOverall]);

  // Chart 5: Reached People per Location Category (% and Absolute)
  const locationsData = useMemo(() => {
    const locAgg: Record<string, number> = {
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
        if (key.startsWith('casa')) locAgg['Casa a Casa'] += pes;
        else if (key === 'igreja') locAgg['Igreja'] += pes;
        else if (key === 'pracas') locAgg['Praças / Mercados'] += pes;
        else if (key === 'paragem') locAgg['Paragem Táxi'] += pes;
        else if (key === 'creche') locAgg['Creche'] += pes;
        else if (key === 'escola') locAgg['Escola'] += pes;
        else if (key === 'agua') locAgg['Ponto Água'] += pes;
        else locAgg['Outros'] += pes;
      });
    });

    const totalLocPessoas = (Object.values(locAgg) as number[]).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(locAgg)
      .map(([name, Pessoas]) => ({
        name,
        Pessoas,
        Percentagem: Number(((Pessoas / totalLocPessoas) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.Pessoas - a.Pessoas);
  }, [visibleFichas]);

  // Chart 6: Ronda Reach Distribution (%)
  const rondaDistributionData = useMemo(() => {
    const rondaMap: Record<string, number> = {};
    visibleFichas.forEach((f) => {
      const rName = f.ronda || '1ª Ronda';
      rondaMap[rName] = (rondaMap[rName] || 0) + (f.totalPessoas || 0);
    });

    const totalRondaPessoas = (Object.values(rondaMap) as number[]).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(rondaMap).map(([name, Pessoas], idx) => ({
      name,
      Pessoas,
      Percentagem: Number(((Pessoas / totalRondaPessoas) * 100).toFixed(1)),
      color: COLORS[idx % COLORS.length],
    }));
  }, [visibleFichas]);

  // Chart 7: Timeline Daily Evolution
  const dailyTimelineData = useMemo(() => {
    const map: Record<string, { Pessoas: number; Fichas: number }> = {};
    visibleFichas.forEach((f) => {
      if (!map[f.data]) {
        map[f.data] = { Pessoas: 0, Fichas: 0 };
      }
      map[f.data].Pessoas += f.totalPessoas || 0;
      map[f.data].Fichas += 1;
    });

    return Object.keys(map)
      .sort()
      .map((data) => ({
        data,
        Pessoas: map[data].Pessoas,
        Fichas: map[data].Fichas,
      }));
  }, [visibleFichas]);

  // Chart 8: Coordination Comparison with Percentage Share
  const coordComparisonData = useMemo(() => {
    const map: Record<string, { Pessoas: number; Fichas: number }> = {};
    visibleFichas.forEach((f) => {
      const cName = f.coordNome || 'Sem Coordenação';
      if (!map[cName]) {
        map[cName] = { Pessoas: 0, Fichas: 0 };
      }
      map[cName].Pessoas += f.totalPessoas || 0;
      map[cName].Fichas += 1;
    });

    const totalP =
      (Object.values(map) as { Pessoas: number; Fichas: number }[]).reduce(
        (a, b) => a + b.Pessoas,
        0
      ) || 1;

    return Object.entries(map).map(([name, val], idx) => ({
      name,
      Pessoas: val.Pessoas,
      Fichas: val.Fichas,
      Percentagem: Number(((val.Pessoas / totalP) * 100).toFixed(1)),
      color: COLORS[idx % COLORS.length],
    }));
  }, [visibleFichas]);

  return (
    <div className="space-y-3">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Gráficos Analíticos & Desempenho por Mobilizador</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Análise quantitativa e distribuição percentual do alcance comunitário dos mobilizadores
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('geral')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'geral'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Visão Geral</span>
          </button>
          <button
            onClick={() => setActiveTab('mobilizadores')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'mobilizadores'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            <span>Por Mobilizadores (%)</span>
          </button>
          <button
            onClick={() => setActiveTab('locais')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'locais'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Locais & Rondas</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-2xs flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          <span>Filtros:</span>
        </div>

        {/* Coordination Filter */}
        <select
          value={selectedCoord}
          onChange={(e) => setSelectedCoord(e.target.value)}
          className="h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition"
        >
          <option value="">Todas as Coordenações</option>
          {coordenacoes.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.nome}
            </option>
          ))}
        </select>

        {/* Ronda Filter */}
        <select
          value={selectedRonda}
          onChange={(e) => setSelectedRonda(e.target.value)}
          className="h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition"
        >
          <option value="">Todas as Rondas</option>
          <option value="1ª Ronda">1ª Ronda</option>
          <option value="2ª Ronda">2ª Ronda</option>
          <option value="3ª Ronda">3ª Ronda</option>
          <option value="4ª Ronda">4ª Ronda</option>
        </select>

        {/* Limit Mobilizadores Selector */}
        {activeTab === 'mobilizadores' && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[11px] font-semibold text-slate-500">Mostrar Top:</span>
            {[5, 10, 15, 20].map((num) => (
              <button
                key={num}
                onClick={() => setTopLimit(num)}
                className={`h-7 px-2 text-xs font-bold rounded-lg border transition ${
                  topLimit === num
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {(selectedCoord || selectedRonda) && (
          <button
            onClick={() => {
              setSelectedCoord('');
              setSelectedRonda('');
            }}
            className="text-xs font-semibold text-blue-600 hover:underline px-2"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* KPI Cards Row (Numbers + Percentages) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Mobilizadores & Activity % */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Mobilizadores Totais
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalRegisteredMobilizadores}</span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-700 border border-emerald-200">
              <Percent className="h-3 w-3" />
              {mobilizadorActivityPct}% Ativos
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {activeMobilizadoresCount} com submissões / {totalRegisteredMobilizadores} registados
          </p>
        </div>

        {/* Card 2: Total Population Reached */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Habitantes Alcançados
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalPessoasOverall.toLocaleString()}</span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-extrabold text-blue-700 border border-blue-200">
              {totalFichasOverall} Fichas
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Média de ~{avgPessoasPerActiveMob} habitantes por mobilizador ativo
          </p>
        </div>

        {/* Card 3: Top Mobilizador Share */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Top Mobilizador (% Share)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 truncate max-w-[140px]">
              {topMobilizadoresData[0]?.nome || 'Sem dados'}
            </span>
            {topMobilizadoresData[0] && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-800 border border-amber-300">
                {topMobilizadoresData[0].PercentagemTotal}%
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {topMobilizadoresData[0]
              ? `${topMobilizadoresData[0].Pessoas.toLocaleString()} pessoas alcançadas`
              : 'Nenhuma ficha registada no período'}
          </p>
        </div>

        {/* Card 4: Global Acceptance Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Aceitação (SIM %)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{simPctOverall}%</span>
            <span className="text-[11px] font-semibold text-slate-500">
              ({totalSimOverall.toLocaleString()} SIM)
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {totalNaoOverall.toLocaleString()} Recusas / Desconfianças (NÃO)
          </p>
        </div>
      </div>

      {/* MAIN VIEW CONTENT ACCORDING TO TAB */}

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'geral' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Top Mobilizadores Ranking Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>Ranking de Mobilizadores (% do Alcance Geral)</span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  Proporção do total de habitantes alcançados por cada mobilizador
                </p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMobilizadoresData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    stroke="#334155"
                    fontSize={10}
                    tickLine={false}
                    width={95}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl border border-slate-700">
                            <p className="font-bold text-blue-400">{data.nomeCompleto}</p>
                            <p className="mt-1">
                              <strong>Pessoas Alcançadas:</strong> {data.Pessoas.toLocaleString()}
                            </p>
                            <p>
                              <strong>Quota do Alcance Total:</strong>{' '}
                              <span className="text-emerald-400 font-bold">{data.PercentagemTotal}%</span>
                            </p>
                            <p>
                              <strong>Fichas Lançadas:</strong> {data.Fichas}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Pessoas" fill="#00B2FF" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Status Donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div>
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>Proporção de Atividade dos Mobilizadores (%)</span>
              </h2>
              <p className="text-[10px] text-slate-500">
                Mobilizadores com fichas submetidas vs sem lançamentos no período
              </p>
            </div>

            <div className="flex h-56 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={mobilizadorActivityStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {mobilizadorActivityStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                            <p className="font-bold">{data.name}</p>
                            <p className="mt-0.5">
                              Quantidade: <strong>{data.value} mobilizadores</strong>
                            </p>
                            <p>
                              Proporção Geral: <strong className="text-emerald-400">{data.percentagem}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#334155' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Timeline Reach Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div>
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Evolução Diária de Habitantes Alcançados</span>
              </h2>
              <p className="text-[10px] text-slate-500">Progresso diário de pessoas notificadas no terreno</p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTimelineData}>
                  <defs>
                    <linearGradient id="colorPessoas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00B2FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00B2FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="data" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#ffffff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Pessoas"
                    stroke="#00B2FF"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorPessoas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Acceptance Ratio Donut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div>
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-600" />
                <span>Proporção de Aceitação da População (SIM vs NÃO)</span>
              </h2>
              <p className="text-[10px] text-slate-500">
                Percentual de concordância na vacinação / adesão comunitária
              </p>
            </div>

            <div className="flex h-52 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={acceptanceDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {acceptanceDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#0f172a',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POR MOBILIZADORES (%) */}
      {activeTab === 'mobilizadores' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Top Mobilizers Share Bar Chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
              <div>
                <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-blue-600" />
                  <span>Percentagem de Contribuição por Mobilizador (% do Total)</span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  Afastamento percentual da média de produção individual
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMobilizadoresData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="nome" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                              <p className="font-bold text-blue-400">{data.nomeCompleto}</p>
                              <p className="mt-1">
                                Share no Alcance Total: <strong className="text-emerald-400">{data.PercentagemTotal}%</strong>
                              </p>
                              <p>Total Pessoas: {data.Pessoas.toLocaleString()}</p>
                              <p>Taxa Aceitação SIM: {data.SimPct}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="PercentagemTotal" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mobilizers Acceptance Efficiency (% SIM) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
              <div>
                <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>Taxa de Aceitação (% SIM) por Mobilizador</span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  Eficiência na mobilização comunitária e persuasão
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMobilizadoresData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="nome" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                              <p className="font-bold text-emerald-400">{data.nomeCompleto}</p>
                              <p className="mt-1">
                                Taxa de Aceitação: <strong className="text-amber-300">{data.SimPct}% SIM</strong>
                              </p>
                              <p>Volume Alcançado: {data.Pessoas.toLocaleString()} habitantes</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="SimPct" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Distribution of Mobilizadores by Coordination */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
              <div>
                <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>Distribuição Percentual de Mobilizadores por Coordenação</span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  Alocação do efetivo de mobilizadores comunitários nos territórios
                </p>
              </div>

              <div className="flex h-56 items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={mobDistributionByCoord}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {mobDistributionByCoord.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                              <p className="font-bold text-indigo-300">{data.name}</p>
                              <p className="mt-1">
                                Mobilizadores: <strong>{data.value}</strong>
                              </p>
                              <p>
                                Quota de Efetivo: <strong className="text-emerald-400">{data.percentagem}%</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', color: '#475569' }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Coordination Reach Percentage */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
              <div>
                <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Quota de Habitantes Alcançados por Coordenação (%)</span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  Contribuição percentual de cada coordenação no total do município
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coordComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                              <p className="font-bold text-blue-400">{data.name}</p>
                              <p className="mt-1">
                                Quota de Alcance: <strong className="text-emerald-400">{data.Percentagem}%</strong>
                              </p>
                              <p>Total Habitantes: {data.Pessoas.toLocaleString()}</p>
                              <p>Fichas Lançadas: {data.Fichas}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Percentagem" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mobilizadores Performance Table with Visual Progress Bars */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tabela Detalhada de Contribuição Percentual por Mobilizador
                </h2>
                <p className="text-[11px] text-slate-500">
                  Listagem completa com código ID, volume de habitantes e percentagem do total geral
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                {activeMobilizadoresList.length} Mobilizadores Ativos
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2 sm:p-2.5 text-center">#</th>
                    <th className="p-2 sm:p-2.5">Mobilizador</th>
                    <th className="p-2 sm:p-2.5">Coordenação</th>
                    <th className="p-2 sm:p-2.5 text-center">Fichas</th>
                    <th className="p-2 sm:p-2.5 text-right">Habitantes</th>
                    <th className="p-2 sm:p-2.5 text-center">% do Total Geral</th>
                    <th className="p-2 sm:p-2.5 text-center">Aceitação (% SIM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeMobilizadoresList.map((m, idx) => {
                    const pctShare = totalPessoasOverall > 0
                      ? Number(((m.totalPessoas / totalPessoasOverall) * 100).toFixed(1))
                      : 0;
                    const totalSimNao = m.sim + m.nao;
                    const simPct = totalSimNao > 0 ? Number(((m.sim / totalSimNao) * 100).toFixed(1)) : 0;

                    return (
                      <tr key={m.nome + idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2 sm:p-2.5 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-2 sm:p-2.5 font-bold text-slate-900">
                          <div className="flex flex-col">
                            <span>{m.nome}</span>
                            {m.codigoId && (
                              <span className="inline-block w-fit font-mono text-[9px] bg-blue-50 border border-blue-200 text-blue-800 font-bold px-1 py-0.2 rounded mt-0.5">
                                ID: {m.codigoId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 sm:p-2.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {m.coordNome || '—'}
                          </span>
                        </td>
                        <td className="p-2 sm:p-2.5 text-center font-mono font-bold text-slate-700">
                          {m.totalFichas}
                        </td>
                        <td className="p-2 sm:p-2.5 text-right font-mono font-extrabold text-emerald-700">
                          {m.totalPessoas.toLocaleString()}
                        </td>
                        <td className="p-2 sm:p-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-extrabold font-mono text-blue-700 text-xs">
                              {pctShare}%
                            </span>
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(pctShare * 3, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-2.5 text-center font-mono font-bold text-emerald-800">
                          {simPct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOCAIS & RONDAS */}
      {activeTab === 'locais' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Reached People per Location Category */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div>
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span>Pessoas Alcançadas por Categoria de Local (% e Absoluto)</span>
              </h2>
              <p className="text-[10px] text-slate-500">
                Percentual de visitas aos diferentes pontos estratégicos de mobilização
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                            <p className="font-bold text-emerald-400">{data.name}</p>
                            <p className="mt-1">
                              Habitantes: <strong>{data.Pessoas.toLocaleString()}</strong>
                            </p>
                            <p>
                              Percentagem das Visitas: <strong className="text-amber-300">{data.Percentagem}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Pessoas" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ronda Distribution Pie */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div>
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <PieIcon className="h-4 w-4 text-purple-600" />
                <span>Distribuição Percentual por Ronda de Mobilização</span>
              </h2>
              <p className="text-[10px] text-slate-500">
                Quota de habitantes notificados na 1ª, 2ª, 3ª e 4ª Ronda
              </p>
            </div>

            <div className="flex h-64 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={rondaDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="Pessoas"
                  >
                    {rondaDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-white shadow-xl">
                            <p className="font-bold text-purple-300">{data.name}</p>
                            <p className="mt-1">
                              Habitantes Alcançados: <strong>{data.Pessoas.toLocaleString()}</strong>
                            </p>
                            <p>
                              Percentagem: <strong className="text-emerald-400">{data.Percentagem}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
