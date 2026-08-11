import React, { useState, useMemo } from 'react';
import {
  Activity,
  ShieldAlert,
  Stethoscope,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Download,
  Printer,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  FileText,
  X,
  PieChart as PieIcon,
  BarChart3,
  Check,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CasoPFA, Coordination, User } from '../types';
import { useToast } from '../context/ToastContext';

interface PFACasesViewProps {
  user: User;
  casosPFA: CasoPFA[];
  coordenacoes: Coordination[];
  onSaveCasoPFA: (caso: CasoPFA) => Promise<void>;
  onUpdateCasoPFA: (id: string, fields: Partial<CasoPFA>) => Promise<void>;
}

export const PFACasesView: React.FC<PFACasesViewProps> = ({
  user,
  casosPFA,
  coordenacoes,
  onSaveCasoPFA,
  onUpdateCasoPFA,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [coordFilter, setCoordFilter] = useState('todas');

  // Modal States
  const [selectedCase, setSelectedCase] = useState<CasoPFA | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);

  // Form State for New Case
  const [newCaseData, setNewCaseData] = useState<Partial<CasoPFA>>({
    nomeCrianca: '',
    idadeCrianca: '',
    sexoCrianca: 'Masculino',
    comQuemVive: 'Pais',
    nomePai: '',
    nomeMae: '',
    nomeEncarregado: '',
    telefoneEncarregado: '',
    provincia: 'CUANZA-SUL',
    municipio: 'SUMBE',
    bairro: '',
    morada: '',
    pontoReferencia: '',
    tempoEstagio: '3 dias',
    membroAfetado: 'Perna Esquerda',
    febreNoInicio: 'Sim',
    sintomasDescricao: '',
    estaAcompanhada: 'Sim',
    tecnicoAcompanhante: '',
    tecnicoTelefone: '',
    dataUltimoAcompanhamento: '',
    mobilizadorNome: user.nome,
    mobilizadorTelefone: user.telefone || '',
    coordId: user.coordId || (coordenacoes.length > 0 ? coordenacoes[0].id : 1),
    coordNome: user.coordNome || (coordenacoes.length > 0 ? coordenacoes[0].nome : 'Coordenação Geral'),
    statusNotificacao: 'Pendente de Investigação',
    centroSaudeReferencia: '',
    observacoesNotificacao: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Status & Técnico update form fields
  const [updateStatus, setUpdateStatus] = useState<CasoPFA['statusNotificacao']>('Notificado à Vigilância');
  const [updateCentro, setUpdateCentro] = useState('');
  const [updateObs, setUpdateObs] = useState('');
  const [updateEstaAcompanhada, setUpdateEstaAcompanhada] = useState<'Sim' | 'Não' | 'Em Processo'>('Sim');
  const [updateTecnico, setUpdateTecnico] = useState('');
  const [updateTecnicoTel, setUpdateTecnicoTel] = useState('');
  const [updateDataAcompanhamento, setUpdateDataAcompanhamento] = useState('');

  // Filtered Cases
  const filteredCases = useMemo(() => {
    return casosPFA.filter((item) => {
      // Role scope filter
      if (!isAdmin && user.coordId && item.coordId !== user.coordId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'todos' && item.statusNotificacao !== statusFilter) {
        return false;
      }

      // Coord filter
      if (coordFilter !== 'todas' && String(item.coordId) !== coordFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchChild = item.nomeCrianca.toLowerCase().includes(query);
        const matchParent = item.nomeEncarregado.toLowerCase().includes(query);
        const matchBairro = item.bairro.toLowerCase().includes(query);
        const matchMob = item.mobilizadorNome.toLowerCase().includes(query);
        return matchChild || matchParent || matchBairro || matchMob;
      }

      return true;
    });
  }, [casosPFA, isAdmin, user, statusFilter, coordFilter, searchTerm]);

  // KPIs
  const totalCasos = filteredCases.length;
  const notificados = filteredCases.filter((c) => c.statusNotificacao === 'Notificado à Vigilância').length;
  const pendentes = filteredCases.filter((c) => c.statusNotificacao === 'Pendente de Investigação').length;
  const emAcompanhamento = filteredCases.filter((c) => c.statusNotificacao === 'Em Acompanhamento').length;

  const taxaNotificacao = totalCasos > 0 ? Math.round((notificados / totalCasos) * 100) : 0;

  // Chart Data: By Coordination
  const chartDataByCoord = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach((c) => {
      const name = c.coordNome ? c.coordNome.replace('Coordenação ', '') : 'Outra';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      casos: counts[key],
    }));
  }, [filteredCases]);

  // Chart Data: By Status
  const chartDataByStatus = useMemo(() => {
    const statusCounts = {
      'Notificado à Vigilância': 0,
      'Pendente de Investigação': 0,
      'Em Acompanhamento': 0,
      Descartado: 0,
    };

    filteredCases.forEach((c) => {
      if (statusCounts[c.statusNotificacao] !== undefined) {
        statusCounts[c.statusNotificacao]++;
      }
    });

    return [
      { name: 'Notificado', value: statusCounts['Notificado à Vigilância'], color: '#10B981' },
      { name: 'Pendente', value: statusCounts['Pendente de Investigação'], color: '#F59E0B' },
      { name: 'Em Acompanhamento', value: statusCounts['Em Acompanhamento'], color: '#3B82F6' },
      { name: 'Descartado', value: statusCounts['Descartado'], color: '#6B7280' },
    ].filter((item) => item.value > 0);
  }, [filteredCases]);

  const handleOpenUpdateModal = (item: CasoPFA) => {
    setSelectedCase(item);
    setUpdateStatus(item.statusNotificacao);
    setUpdateCentro(item.centroSaudeReferencia || '');
    setUpdateObs(item.observacoesNotificacao || '');
    setUpdateEstaAcompanhada(item.estaAcompanhada || 'Sim');
    setUpdateTecnico(item.tecnicoAcompanhante || '');
    setUpdateTecnicoTel(item.tecnicoTelefone || '');
    setUpdateDataAcompanhamento(item.dataUltimoAcompanhamento || '');
    setIsUpdateStatusModalOpen(true);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedCase) return;
    setIsSaving(true);
    try {
      await onUpdateCasoPFA(selectedCase.id, {
        statusNotificacao: updateStatus,
        centroSaudeReferencia: updateCentro.trim(),
        observacoesNotificacao: updateObs.trim(),
        estaAcompanhada: updateEstaAcompanhada,
        tecnicoAcompanhante: updateTecnico.trim(),
        tecnicoTelefone: updateTecnicoTel.trim(),
        dataUltimoAcompanhamento: updateDataAcompanhamento.trim(),
        dataNotificacaoCS:
          updateStatus === 'Notificado à Vigilância' && !selectedCase.dataNotificacaoCS
            ? new Date().toISOString().split('T')[0]
            : selectedCase.dataNotificacaoCS,
      });
      showToast('Estado do caso PFA atualizado com sucesso!', 'success');
      setIsUpdateStatusModalOpen(false);
      setSelectedCase(null);
    } catch (err: any) {
      showToast('Erro ao atualizar estado do caso PFA.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseData.nomeCrianca?.trim()) {
      showToast('Por favor preencha o nome da criança.', 'error');
      return;
    }

    const comQuemVive = newCaseData.comQuemVive || 'Pais';
    let nomeEncarregadoFinal = '';

    if (comQuemVive === 'Pais') {
      if (!newCaseData.nomePai?.trim() && !newCaseData.nomeMae?.trim()) {
        showToast('Por favor preencha o nome do Pai e/ou da Mãe.', 'error');
        return;
      }
      nomeEncarregadoFinal = [newCaseData.nomePai?.trim(), newCaseData.nomeMae?.trim()].filter(Boolean).join(' e ');
    } else {
      if (!newCaseData.nomeEncarregado?.trim()) {
        showToast(`Por favor preencha o nome do encarregado (${comQuemVive}).`, 'error');
        return;
      }
      nomeEncarregadoFinal = newCaseData.nomeEncarregado.trim();
    }

    if (!newCaseData.bairro?.trim()) {
      showToast('Por favor preencha o bairro.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const newId = `pfa_${Date.now()}`;
      const fullCase: CasoPFA = {
        id: newId,
        provincia: newCaseData.provincia || 'CUANZA-SUL',
        municipio: newCaseData.municipio || 'SUMBE',
        comuna: newCaseData.comuna || 'SEDE',
        bairro: newCaseData.bairro.trim(),
        dataDetecao: new Date().toISOString().split('T')[0],

        nomeCrianca: newCaseData.nomeCrianca.trim(),
        idadeCrianca: newCaseData.idadeCrianca?.trim() || 'Desconhecida',
        sexoCrianca: newCaseData.sexoCrianca || 'Masculino',

        comQuemVive,
        nomePai: newCaseData.nomePai?.trim() || '',
        nomeMae: newCaseData.nomeMae?.trim() || '',
        nomeEncarregado: nomeEncarregadoFinal,
        telefoneEncarregado: newCaseData.telefoneEncarregado?.trim() || '',
        morada: newCaseData.morada?.trim() || newCaseData.bairro.trim(),
        pontoReferencia: newCaseData.pontoReferencia?.trim() || '',

        tempoEstagio: newCaseData.tempoEstagio?.trim() || '3 dias',
        membroAfetado: newCaseData.membroAfetado || 'Perna Esquerda',
        febreNoInicio: newCaseData.febreNoInicio || 'Sim',
        sintomasDescricao: newCaseData.sintomasDescricao?.trim() || '',

        estaAcompanhada: newCaseData.estaAcompanhada || 'Sim',
        tecnicoAcompanhante: newCaseData.tecnicoAcompanhante?.trim() || '',
        tecnicoTelefone: newCaseData.tecnicoTelefone?.trim() || '',
        dataUltimoAcompanhamento: newCaseData.dataUltimoAcompanhamento?.trim() || '',

        mobilizadorNome: newCaseData.mobilizadorNome || user.nome,
        mobilizadorTelefone: newCaseData.mobilizadorTelefone || '',
        coordId: Number(newCaseData.coordId) || user.coordId || 1,
        coordNome: newCaseData.coordNome || user.coordNome || 'Coordenação Geral',

        statusNotificacao: newCaseData.statusNotificacao || 'Pendente de Investigação',
        centroSaudeReferencia: newCaseData.centroSaudeReferencia?.trim() || '',
        observacoesNotificacao: newCaseData.observacoesNotificacao?.trim() || '',
        createdAt: new Date().toISOString(),
      };

      await onSaveCasoPFA(fullCase);
      showToast('Novo caso de PFA registado com sucesso!', 'success');
      setIsNewCaseModalOpen(false);
      // Reset form
      setNewCaseData({
        nomeCrianca: '',
        idadeCrianca: '',
        sexoCrianca: 'Masculino',
        comQuemVive: 'Pais',
        nomePai: '',
        nomeMae: '',
        nomeEncarregado: '',
        telefoneEncarregado: '',
        provincia: 'CUANZA-SUL',
        municipio: 'SUMBE',
        bairro: '',
        morada: '',
        pontoReferencia: '',
        tempoEstagio: '3 dias',
        membroAfetado: 'Perna Esquerda',
        febreNoInicio: 'Sim',
        sintomasDescricao: '',
        estaAcompanhada: 'Sim',
        tecnicoAcompanhante: '',
        tecnicoTelefone: '',
        dataUltimoAcompanhamento: '',
        mobilizadorNome: user.nome,
        mobilizadorTelefone: user.telefone || '',
        coordId: user.coordId || (coordenacoes.length > 0 ? coordenacoes[0].id : 1),
        coordNome: user.coordNome || (coordenacoes.length > 0 ? coordenacoes[0].nome : 'Coordenação Geral'),
        statusNotificacao: 'Pendente de Investigação',
      });
    } catch (err: any) {
      showToast('Erro ao gravar o caso de PFA.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500 via-rose-600 to-red-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-100 text-xs font-extrabold uppercase tracking-widest">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              <span>Vigilância Epidemiológica Provincial & UNICEF</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Casos de Paralisia Flácida Aguda (PFA)
            </h1>
            <p className="text-xs text-rose-100 max-w-2xl">
              Sistema ativo de deteção rápida, notificação e rastreio de paralisia flácida em crianças.
              Indicador crítico de erradicação da Pólio em Angola.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-rose-700 shadow-sm hover:bg-rose-50 transition cursor-pointer"
              id="btn-registar-pfa"
            >
              <Plus className="h-4 w-4" />
              <span>Registar Caso PFA</span>
            </button>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 rounded-xl bg-rose-800/60 border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-800 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Casos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total de Casos Detetados</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 font-bold">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalCasos}</span>
            <span className="text-xs font-semibold text-slate-500">casos na ronda</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span>Rastreio de campo por mobilizadores RH-MC</span>
          </div>
        </div>

        {/* Card 2: Notificados à Vigilância */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase">Notificados à Vigilância</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">{notificados}</span>
            <span className="text-xs font-bold text-emerald-700">({taxaNotificacao}% do total)</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            Comunicação direta enviada ao Centro de Saúde
          </div>
        </div>

        {/* Card 3: Pendentes de Investigação */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase">Pendentes de Investigação</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-950">{pendentes}</span>
            <span className="text-xs font-bold text-amber-800">aguardam visita</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-800 font-medium">
            Requer verificação com a equipa médica
          </div>
        </div>

        {/* Card 4: Em Acompanhamento */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">Em Acompanhamento</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white font-bold">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-950">{emAcompanhamento}</span>
            <span className="text-xs font-bold text-blue-800">amostras/colheita</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-800 font-medium">
            Seguimento clínico e laboratorial das fezes
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Cases by Coordination */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <BarChart3 className="h-4 w-4 text-rose-600" />
              <span>Distribuição de Casos por Coordenação</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartDataByCoord.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataByCoord} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="casos" fill="#E11D48" radius={[8, 8, 0, 0]} name="Casos de PFA" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Nenhum dado de PFA disponível para exibição gráfica.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Cases by Notification Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <PieIcon className="h-4 w-4 text-indigo-600" />
              <span>Estado da Notificação Epidemiológica</span>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {chartDataByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={chartDataByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartDataByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Sem registos de PFA.</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome da criança, pais, bairro ou mobilizador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="todos">Todos os Estados</option>
              <option value="Notificado à Vigilância">Notificado à Vigilância</option>
              <option value="Pendente de Investigação">Pendente de Investigação</option>
              <option value="Em Acompanhamento">Em Acompanhamento</option>
              <option value="Descartado">Descartado</option>
            </select>
          </div>

          {/* Coordination Filter */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-semibold text-slate-500">Coordenação:</span>
              <select
                value={coordFilter}
                onChange={(e) => setCoordFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="todas">Todas as Coordenações</option>
                {coordenacoes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
            <Activity className="h-4 w-4 text-rose-600" />
            <span>Lista Oficial de Casos de PFA Registados ({filteredCases.length})</span>
          </div>
        </div>

        {filteredCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-[11px] font-extrabold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Criança (Nome & Idade)</th>
                  <th className="p-3.5">Pais / Encarregado</th>
                  <th className="p-3.5">Localização / Bairro</th>
                  <th className="p-3.5">Estágio & Sintomas</th>
                  <th className="p-3.5">Mobilizador</th>
                  <th className="p-3.5 text-center">Status Vigilância</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((item) => {
                  const statusColors: Record<string, string> = {
                    'Notificado à Vigilância': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    'Pendente de Investigação': 'bg-amber-100 text-amber-800 border-amber-300',
                    'Em Acompanhamento': 'bg-blue-100 text-blue-800 border-blue-300',
                    Descartado: 'bg-slate-100 text-slate-700 border-slate-300',
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Criança */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">{item.nomeCrianca}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{item.idadeCrianca}</span>
                          <span>•</span>
                          <span>{item.sexoCrianca}</span>
                        </div>
                      </td>

                      {/* Encarregado */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{item.nomeEncarregado}</span>
                        </div>
                        {item.telefoneEncarregado && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{item.telefoneEncarregado}</span>
                          </div>
                        )}
                      </td>

                      {/* Localização */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span>{item.bairro}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{item.coordNome}</div>
                      </td>

                      {/* Estágio */}
                      <td className="p-3.5">
                        <div className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                          Estágio: {item.tempoEstagio}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                          {item.membroAfetado || 'Membro não especificado'}
                        </div>
                      </td>

                      {/* Mobilizador */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{item.mobilizadorNome}</div>
                        <div className="text-[10px] text-slate-400">Detetado em: {item.dataDetecao}</div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold border ${
                            statusColors[item.statusNotificacao] || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {item.statusNotificacao === 'Notificado à Vigilância' && <CheckCircle2 className="h-3 w-3" />}
                          {item.statusNotificacao === 'Pendente de Investigação' && <AlertTriangle className="h-3 w-3" />}
                          {item.statusNotificacao === 'Em Acompanhamento' && <Stethoscope className="h-3 w-3" />}
                          {item.statusNotificacao}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => setSelectedCase(item)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                        <button
                          onClick={() => handleOpenUpdateModal(item)}
                          className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 transition cursor-pointer shadow-2xs"
                        >
                          Atualizar Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhum caso de PFA encontrado.</p>
            <p className="text-xs text-slate-400 mt-1">
              Ajuste os filtros de busca ou registe um novo caso detetado em campo.
            </p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL (Ficha Oficial de Notificação PFA) */}
      {selectedCase && !isUpdateStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-rose-600 text-xs font-black uppercase">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Ficha Epidemiológica de Notificação PFA</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Caso #{selectedCase.id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dados da Criança */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-rose-700">
                  1. Identificação da Criança
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Nome Completo:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedCase.nomeCrianca}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Idade:</span>
                    <span className="font-bold text-slate-900">{selectedCase.idadeCrianca}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sexo:</span>
                    <span className="font-bold text-slate-900">{selectedCase.sexoCrianca}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Data de Deteção:</span>
                    <span className="font-bold text-slate-900">{selectedCase.dataDetecao}</span>
                  </div>
                </div>
              </div>

              {/* Dados dos Encarregados & Morada */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-blue-700">
                  2. Encarregado de Educação & Com Quem Vive
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Com Quem Vive a Criança:</span>
                    <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 inline-block mt-0.5">
                      {selectedCase.comQuemVive || 'Pais'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Telefone de Contacto:</span>
                    <span className="font-bold text-slate-900">{selectedCase.telefoneEncarregado || 'Sem telefone'}</span>
                  </div>

                  {selectedCase.comQuemVive === 'Pais' ? (
                    <>
                      <div>
                        <span className="text-slate-500 block">Nome do Pai:</span>
                        <span className="font-bold text-slate-900">{selectedCase.nomePai || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Nome da Mãe:</span>
                        <span className="font-bold text-slate-900">{selectedCase.nomeMae || 'Não informado'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Nome do Encarregado ({selectedCase.comQuemVive || 'Encarregado'}):</span>
                      <span className="font-bold text-slate-900">{selectedCase.nomeEncarregado}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block">Bairro / Comunidade:</span>
                    <span className="font-bold text-slate-900">{selectedCase.bairro} ({selectedCase.provincia})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Morada / Ponto de Referência:</span>
                    <span className="font-bold text-slate-900">{selectedCase.morada}</span>
                  </div>
                </div>
              </div>

              {/* Detalhes Clínicos do Estágio */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-amber-700">
                  3. Quadro Clínico e Estágio da Paralisia
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Tempo de Estágio / Início:</span>
                    <span className="font-bold text-rose-700">{selectedCase.tempoEstagio}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Membro Afetado:</span>
                    <span className="font-bold text-slate-900">{selectedCase.membroAfetado || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Febre no Início da Paralisia:</span>
                    <span className="font-bold text-slate-900">{selectedCase.febreNoInicio || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Descrição dos Sintomas:</span>
                    <p className="mt-1 font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                      {selectedCase.sintomasDescricao || 'Sem descrição clínica registada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vigilância Epidemiológica e Acompanhamento Técnico */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                <div className="font-extrabold uppercase text-[11px] tracking-wider text-rose-800">
                  4. Estado da Notificação & Acompanhamento de Saúde
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Estado Atual de Notificação:</span>
                    <span className="font-extrabold text-rose-900">{selectedCase.statusNotificacao}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Centro de Saúde de Referência:</span>
                    <span className="font-bold text-slate-900">{selectedCase.centroSaudeReferencia || 'Pendente'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Acompanhado por Técnico?</span>
                    <span className={`font-bold inline-block px-2 py-0.5 rounded-md text-xs mt-0.5 ${
                      selectedCase.estaAcompanhada === 'Sim'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : selectedCase.estaAcompanhada === 'Em Processo'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {selectedCase.estaAcompanhada || 'Não'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Técnico Responsável:</span>
                    <span className="font-bold text-slate-900">
                      {selectedCase.tecnicoAcompanhante || 'Nenhum designado'}
                    </span>
                  </div>
                  {selectedCase.tecnicoTelefone && (
                    <div>
                      <span className="text-slate-500 block">Telefone do Técnico:</span>
                      <span className="font-bold text-slate-900">{selectedCase.tecnicoTelefone}</span>
                    </div>
                  )}
                  {selectedCase.dataUltimoAcompanhamento && (
                    <div>
                      <span className="text-slate-500 block">Último Acompanhamento:</span>
                      <span className="font-bold text-slate-900">{selectedCase.dataUltimoAcompanhamento}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Observações da Notificação / Visita Clínica:</span>
                    <p className="mt-1 font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-rose-200">
                      {selectedCase.observacoesNotificacao || 'Nenhuma observação registada.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={() => handleOpenUpdateModal(selectedCase)}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                Atualizar Estado / Técnico Acompanhante
              </button>
              <button
                onClick={() => setSelectedCase(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {isUpdateStatusModalOpen && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Atualizar Notificação - {selectedCase.nomeCrianca}
              </h3>
              <button
                onClick={() => setIsUpdateStatusModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado de Notificação</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as any)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                >
                  <option value="Notificado à Vigilância">Notificado à Vigilância Epidemiológica</option>
                  <option value="Pendente de Investigação">Pendente de Investigação</option>
                  <option value="Em Acompanhamento">Em Acompanhamento (Colheita de Fezes)</option>
                  <option value="Descartado">Descartado</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Centro de Saúde de Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Centro de Saúde do Sumbe / Hospital Geral"
                  value={updateCentro}
                  onChange={(e) => setUpdateCentro(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-medium text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              {/* Acompanhamento por Técnico */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                <div className="font-extrabold text-emerald-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                  Acompanhamento por Técnico de Saúde
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">A criança está a ser acompanhada por um técnico?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Sim', 'Não', 'Em Processo'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setUpdateEstaAcompanhada(opt)}
                        className={`h-9 rounded-xl font-bold transition text-xs border ${
                          updateEstaAcompanhada === opt
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {updateEstaAcompanhada !== 'Não' && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome do Técnico de Saúde *</label>
                      <input
                        type="text"
                        placeholder="Ex: Dr. Manuel Santos (Epidemiologista)"
                        value={updateTecnico}
                        onChange={(e) => setUpdateTecnico(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Telefone do Técnico</label>
                        <input
                          type="text"
                          placeholder="Ex: 923 111 222"
                          value={updateTecnicoTel}
                          onChange={(e) => setUpdateTecnicoTel(e.target.value)}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Data Último Acompanhamento</label>
                        <input
                          type="date"
                          value={updateDataAcompanhamento}
                          onChange={(e) => setUpdateDataAcompanhamento(e.target.value)}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações da Notificação / Colheita</label>
                <textarea
                  rows={3}
                  placeholder="Introduza notas clínicas sobre a visita médica, estado da amostra de fezes, etc..."
                  value={updateObs}
                  onChange={(e) => setUpdateObs(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsUpdateStatusModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveStatusUpdate}
                disabled={isSaving}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isSaving ? 'A guardar...' : 'Guardar Atualização'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PFA CASE MODAL */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 text-rose-600 text-xs font-black uppercase">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Novo Registo de Vigilância PFA</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  Registar Caso Suspeito de Paralisia Flácida Aguda
                </h2>
              </div>
              <button
                onClick={() => setIsNewCaseModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-4 text-xs">
              {/* Criança */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-rose-700">
                  Dados da Criança
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Nome Completo da Criança *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Esperança Mateus"
                      value={newCaseData.nomeCrianca || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, nomeCrianca: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Idade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 3 anos, 18 meses"
                      value={newCaseData.idadeCrianca || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, idadeCrianca: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sexo</label>
                    <select
                      value={newCaseData.sexoCrianca}
                      onChange={(e) => setNewCaseData({ ...newCaseData, sexoCrianca: e.target.value as any })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Encarregado / Com quem vive & Localização */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                    Com quem vive a criança? (Encarregados) *
                  </label>
                  <select
                    value={newCaseData.comQuemVive || 'Pais'}
                    onChange={(e) => setNewCaseData({ ...newCaseData, comQuemVive: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    id="select-pfa-case-com-quem-vive"
                  >
                    <option value="Pais">Com os Pais</option>
                    <option value="Pai">Apenas Pai</option>
                    <option value="Mãe">Apenas Mãe</option>
                    <option value="Tio(a)">Tio(a)</option>
                    <option value="Primo(a)">Primo(a)</option>
                    <option value="Irmão(ã)">Irmão(ã)</option>
                    <option value="Cunhado(a)">Cunhado(a)</option>
                    <option value="Avô(ó)">Avô(ó)</option>
                    <option value="Outro">Outro Encarregado</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {(newCaseData.comQuemVive || 'Pais') === 'Pais' ? (
                    <>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nome do Pai *</label>
                        <input
                          type="text"
                          placeholder="Ex: Mateus Paulo"
                          value={newCaseData.nomePai || ''}
                          onChange={(e) => setNewCaseData({ ...newCaseData, nomePai: e.target.value })}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nome da Mãe *</label>
                        <input
                          type="text"
                          placeholder="Ex: Ana Maria"
                          value={newCaseData.nomeMae || ''}
                          onChange={(e) => setNewCaseData({ ...newCaseData, nomeMae: e.target.value })}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                        />
                      </div>
                    </>
                  ) : (newCaseData.comQuemVive || 'Pais') === 'Pai' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome do Pai *</label>
                      <input
                        type="text"
                        placeholder="Ex: Mateus Paulo"
                        value={newCaseData.nomePai || ''}
                        onChange={(e) => setNewCaseData({ ...newCaseData, nomePai: e.target.value })}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                      />
                    </div>
                  ) : (newCaseData.comQuemVive || 'Pais') === 'Mãe' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome da Mãe *</label>
                      <input
                        type="text"
                        placeholder="Ex: Ana Maria"
                        value={newCaseData.nomeMae || ''}
                        onChange={(e) => setNewCaseData({ ...newCaseData, nomeMae: e.target.value })}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome do Encarregado ({newCaseData.comQuemVive}) *</label>
                      <input
                        type="text"
                        placeholder="Ex: Nome do encarregado responsável"
                        value={newCaseData.nomeEncarregado || ''}
                        onChange={(e) => setNewCaseData({ ...newCaseData, nomeEncarregado: e.target.value })}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefone do Encarregado</label>
                    <input
                      type="text"
                      placeholder="Ex: 923456789"
                      value={newCaseData.telefoneEncarregado || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, telefoneEncarregado: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bairro / Comunidade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 15 de Março"
                      value={newCaseData.bairro || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, bairro: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Morada / Ponto de Referência</label>
                    <input
                      type="text"
                      placeholder="Ex: Próximo ao Chafariz, Casa 42"
                      value={newCaseData.morada || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, morada: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Detalhes do Estágio */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-amber-700">
                  Estágio da Paralisia & Sintomas
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tempo de Evolução / Estágio</label>
                    <input
                      type="text"
                      placeholder="Ex: 4 dias, 2 semanas"
                      value={newCaseData.tempoEstagio || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, tempoEstagio: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Membro Afetado</label>
                    <select
                      value={newCaseData.membroAfetado}
                      onChange={(e) => setNewCaseData({ ...newCaseData, membroAfetado: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    >
                      <option value="Perna Esquerda">Perna Esquerda</option>
                      <option value="Perna Direita">Perna Direita</option>
                      <option value="Ambas as Pernas">Ambas as Pernas</option>
                      <option value="Braço Esquerdo/Direito">Braço Esquerdo/Direito</option>
                      <option value="Todos os Membros">Todos os Membros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Febre no Início?</label>
                    <select
                      value={newCaseData.febreNoInicio}
                      onChange={(e) => setNewCaseData({ ...newCaseData, febreNoInicio: e.target.value as any })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-rose-500"
                    >
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                      <option value="Desconhecido">Desconhecido</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Descrição / Sintomas Detalhados</label>
                    <textarea
                      rows={2}
                      placeholder="Descreva a perda de força muscular flácida, início dos sintomas..."
                      value={newCaseData.sintomasDescricao || ''}
                      onChange={(e) => setNewCaseData({ ...newCaseData, sintomasDescricao: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 font-medium outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCaseModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'A guardar...' : 'Guardar Caso de PFA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
