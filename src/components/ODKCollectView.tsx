import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Trash2,
  Eye,
  Info,
  ShieldCheck,
  Send,
  Building2,
  UserCheck,
  Hash,
  X,
  FileText,
  MapPin,
  Check,
  Calendar,
  Camera,
  Printer,
  Users,
  Award,
} from 'lucide-react';
import { User, Coordination, ODKSubmission } from '../types';

interface ODKCollectViewProps {
  user: User;
  coordenacoes: Coordination[];
  users: User[];
  submissions: ODKSubmission[];
  onCreateSubmission: (sub: Partial<ODKSubmission>) => Promise<void>;
  onUpdateStatus: (
    id: string,
    status: 'confirmado' | 'divergencia' | 'pendente',
    adminNotes?: string
  ) => Promise<void>;
  onDeleteSubmission: (id: string) => Promise<void>;
}

export const ODKCollectView: React.FC<ODKCollectViewProps> = ({
  user,
  coordenacoes,
  users,
  submissions,
  onCreateSubmission,
  onUpdateStatus,
  onDeleteSubmission,
}) => {
  const isAdmin = user.tipo === 'admin';

  // Active Main View Tab: 'list' | 'supervisores' | 'campanha4dias'
  const [activeMainTab, setActiveMainTab] = useState<'list' | 'supervisores' | 'campanha4dias'>('list');

  // State Modals
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [show4DaysReceiptModal, setShow4DaysReceiptModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<ODKSubmission | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'confirmado' | 'divergencia'>('todos');
  const [coordFilter, setCoordFilter] = useState<string>('todas');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('todos');

  // Form State
  const [formNome, setFormNome] = useState('Ficha de Supervisão da Mobilização');
  const [customFormNome, setCustomFormNome] = useState('');
  const [dataEnvio, setDataEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [horaEnvio, setHoraEnvio] = useState(new Date().toTimeString().slice(0, 5));
  const [totalFormularios, setTotalFormularios] = useState<number>(25);
  const [dispositivoAndroid, setDispositivoAndroid] = useState('Samsung Galaxy Tab A7 (Android 11, 4GB RAM)');
  const [codigoRecibo, setCodigoRecibo] = useState(
    `ODK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-X`
  );
  // Default coordId for supervisor is strictly their registered user.coordId
  const userAssignedCoord = coordenacoes.find((c) => c.id === user.coordId) || coordenacoes[0];
  const [coordId, setCoordId] = useState<number | null>(user.coordId || (userAssignedCoord?.id ?? null));
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Pre-defined ODK Forms options with primary default option
  const ODK_FORM_OPTIONS = [
    'Ficha de Supervisão da Mobilização',
    'Registo de Agregados Familiares (ODK Collect)',
    'Inquérito de Mapeamento & Vacinação Polio',
    'Cadastramento de Casas e Famílias em Campo',
    'Ficha Epidemiológica e Vigilância Comunitária',
    'Outro Formulário Personalizado...',
  ];

  const handleGenerateReceiptCode = () => {
    const randomCode = `ODK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(
      65 + Math.floor(Math.random() * 26)
    )}`;
    setCodigoRecibo(randomCode);
  };

  const handleOpenNewSubmissionModal = () => {
    // Lock coordination for supervisor to their assigned coordination
    if (!isAdmin && user.coordId) {
      setCoordId(user.coordId);
    } else if (!coordId && coordenacoes.length > 0) {
      setCoordId(coordenacoes[0].id);
    }
    setFormNome('Ficha de Supervisão da Mobilização');
    handleGenerateReceiptCode();
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // If supervisor, strictly use their assigned coordId and coordNome
      const effectiveCoordId = !isAdmin && user.coordId ? user.coordId : Number(coordId);
      const selectedCoord = coordenacoes.find((c) => c.id === effectiveCoordId);
      const finalCoordNome = selectedCoord ? selectedCoord.nome : user.coordNome || 'Sem Coordenação';

      const finalFormNome =
        formNome === 'Outro Formulário Personalizado...'
          ? customFormNome || 'Formulário Personalizado ODK'
          : formNome;

      await onCreateSubmission({
        formId: finalFormNome.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        formNome: finalFormNome,
        dataEnvio,
        horaEnvio,
        totalFormularios: Number(totalFormularios),
        dispositivoAndroid,
        codigoReciboODK: codigoRecibo,
        coordId: effectiveCoordId,
        coordNome: finalCoordNome,
        observacoes,
      });

      setShowModal(false);
      // Reset form defaults
      setTotalFormularios(25);
      setObservacoes('');
      handleGenerateReceiptCode();
    } catch (err) {
      alert('Erro ao registar confirmação ODK: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatusAction = async (id: string, status: 'confirmado' | 'divergencia' | 'pendente') => {
    try {
      await onUpdateStatus(id, status, adminNoteInput);
      setSelectedSub(null);
      setAdminNoteInput('');
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Filter Logic
  const filteredSubmissions = submissions.filter((sub) => {
    // Supervisors see their own submissions or submissions from their coordination
    if (!isAdmin && sub.supervisorId !== user.id) {
      if (user.coordId && sub.coordId !== user.coordId) {
        return false;
      }
    }

    if (statusFilter !== 'todos' && sub.status !== statusFilter) return false;
    if (coordFilter !== 'todas' && String(sub.coordId) !== coordFilter) return false;
    if (supervisorFilter !== 'todos' && String(sub.supervisorId) !== supervisorFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchRecibo = sub.codigoReciboODK.toLowerCase().includes(term);
      const matchSupervisor = sub.supervisorNome.toLowerCase().includes(term);
      const matchForm = sub.formNome.toLowerCase().includes(term);
      const matchCoord = sub.coordNome.toLowerCase().includes(term);
      if (!matchRecibo && !matchSupervisor && !matchForm && !matchCoord) return false;
    }

    return true;
  });

  // KPI Calculations
  const totalSubmissionsCount = filteredSubmissions.length;
  const totalFormsCount = filteredSubmissions.reduce((acc, curr) => acc + (curr.totalFormularios || 0), 0);
  const confirmedCount = filteredSubmissions.filter((s) => s.status === 'confirmado').length;
  const pendingCount = filteredSubmissions.filter((s) => s.status === 'pendente').length;
  const divergenciaCount = filteredSubmissions.filter((s) => s.status === 'divergencia').length;
  const confirmationRate = totalSubmissionsCount > 0 ? Math.round((confirmedCount / totalSubmissionsCount) * 100) : 0;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Recibo ODK',
      'Supervisor',
      'Coordenação',
      'Formulário',
      'Data Envio',
      'Hora Envio',
      'Formulários Lançados',
      'Dispositivo Android',
      'Status',
      'Confirmado por Admin',
    ];
    const rows = filteredSubmissions.map((s) => [
      s.codigoReciboODK,
      `"${s.supervisorNome}"`,
      `"${s.coordNome}"`,
      `"${s.formNome}"`,
      s.dataEnvio,
      s.horaEnvio,
      s.totalFormularios,
      `"${s.dispositivoAndroid || ''}"`,
      s.status.toUpperCase(),
      s.confirmadoPorAdmin ? 'Sim' : 'Não',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Confirmacoes_ODK_Collect_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const supervisoresList = users.filter((u) => u.tipo === 'supervisor' || u.tipo === 'user' || u.tipo === 'admin');

  // Supervisor Grouped Statistics
  const supervisorStats = supervisoresList.map((sup) => {
    const supSubs = submissions.filter((s) => s.supervisorId === sup.id || s.supervisorNome === sup.nome);
    const totalSubs = supSubs.length;
    const totalForms = supSubs.reduce((acc, curr) => acc + (curr.totalFormularios || 0), 0);
    const confirmados = supSubs.filter((s) => s.status === 'confirmado').length;
    const pendentes = supSubs.filter((s) => s.status === 'pendente').length;
    const ultimosEnvio = supSubs.length > 0 ? supSubs[0].dataEnvio : '—';
    const recibos = supSubs.map((s) => s.codigoReciboODK);

    return {
      supervisor: sup,
      totalSubs,
      totalForms,
      confirmados,
      pendentes,
      ultimosEnvio,
      recibos,
      coordNome: sup.coordNome || 'Coordenação não atribuída',
    };
  });

  // 4 Campaign Days Breakdown (Dia 1, Dia 2, Dia 3, Dia 4)
  // Get distinct dates or map to Day 1 .. Day 4
  const allDates = Array.from(new Set(submissions.map((s) => s.dataEnvio))).sort();
  const campaignDays = [0, 1, 2, 3].map((index) => {
    const dayLabel = `Dia ${index + 1} de Campanha`;
    const date = allDates[index] || `Dia ${index + 1}`;
    const daySubs = submissions.filter((s) => s.dataEnvio === date);
    const totalFormsDay = daySubs.reduce((acc, curr) => acc + (curr.totalFormularios || 0), 0);
    const confirmadosDay = daySubs.filter((s) => s.status === 'confirmado').length;

    return {
      dayIndex: index + 1,
      dayLabel,
      date,
      submissions: daySubs,
      totalFormsDay,
      confirmadosDay,
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Smartphone className="h-3.5 w-3.5" /> ODK Collect Integration
              </span>
              <span className="text-xs text-slate-500 font-medium">| Confirmação de Envios de Campo</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Confirmação & Controlo de Envios ODK
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Acompanhamento e validação administrativa das <strong>Fichas de Supervisão da Mobilização</strong> e relatórios de envio executados pelos supervisores no aplicativo Android <strong>ODK Collect</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowInfoModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Ver especificações e guia do ODK Collect"
            >
              <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Guia do ODK</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Exportar confirmações para Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleOpenNewSubmissionModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-extrabold shadow-sm transition active:scale-95"
              id="btn-novo-envio-odk"
            >
              <Plus className="h-4 w-4" />
              <span>Registar Envio ODK</span>
            </button>
          </div>
        </div>

        {/* Admin Notification Banner */}
        {isAdmin && pendingCount > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-3.5 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-black shadow-xs animate-pulse">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-100">
                  Atenção Administrador: Validações ODK Pendentes ({pendingCount})
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Existem {pendingCount} submissões de formulários ODK enviadas por supervisores a aguardar a sua confirmação e validação administrativa.
                </div>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('pendente')}
              className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition"
            >
              Validar Agora
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Submissões */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Submissões ODK</span>
              <Hash className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {totalSubmissionsCount}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Registos de confirmação</p>
          </div>

          {/* Card 2: Formulários Lançados */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Formulários ODK</span>
              <Smartphone className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {totalFormsCount.toLocaleString('pt-PT')}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Fichas de supervisão submetidas</p>
          </div>

          {/* Card 3: Confirmados pelo Admin */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Confirmados Admin</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{confirmedCount}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">({confirmationRate}%)</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Validados pelo administrador</p>
          </div>

          {/* Card 4: Pendentes de Validação */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pendentes / Alertas</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
              {divergenciaCount > 0 && (
                <span className="text-xs font-bold text-rose-600">({divergenciaCount} div.)</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Aguardam verificação</p>
          </div>
        </div>
      </div>

      {/* Main View Tabs (Lista | Resumo por Supervisor | Relatório 4 Dias) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('list')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeMainTab === 'list'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Lista de Submissões ({filteredSubmissions.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('supervisores')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeMainTab === 'supervisores'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Resumo por Supervisores ({supervisoresList.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('campanha4dias')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeMainTab === 'campanha4dias'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Relatório dos 4 Dias de Campanha</span>
          </button>
        </div>

        {activeMainTab === 'campanha4dias' && (
          <button
            onClick={() => setShow4DaysReceiptModal(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
            id="btn-capturar-4-dias"
          >
            <Camera className="h-4 w-4" />
            <span>Gerar Comprovativo dos 4 Dias (Modo Captura)</span>
          </button>
        )}
      </div>

      {/* TAB 1: LISTA DE SUBMISSÕES */}
      {activeMainTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por recibo, supervisor, coordenação ou formulário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="todos">Todos os Estados</option>
                <option value="pendente">Pendentes</option>
                <option value="confirmado">Confirmados Admin</option>
                <option value="divergencia">Com Divergência</option>
              </select>

              {/* Coordination Filter */}
              {isAdmin && (
                <select
                  value={coordFilter}
                  onChange={(e) => setCoordFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="todas">Todas Coordenações</option>
                  {coordenacoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              )}

              {/* Supervisor Filter */}
              {isAdmin && (
                <select
                  value={supervisorFilter}
                  onChange={(e) => setSupervisorFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="todos">Todos Supervisores</option>
                  {supervisoresList.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <Smartphone className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nenhuma confirmação ODK encontrada
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tente ajustar os filtros de pesquisa ou registe uma nova confirmação de envio do ODK Collect.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Recibo ODK</th>
                      <th className="p-3">Data/Hora Envio</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3">Coordenação</th>
                      <th className="p-3">Formulário ODK</th>
                      <th className="p-3 text-center">Formulários</th>
                      <th className="p-3">Status Admin</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {filteredSubmissions.map((sub) => {
                      const isConf = sub.status === 'confirmado';
                      const isDiv = sub.status === 'divergencia';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {sub.codigoReciboODK}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {sub.dataEnvio} <span className="text-[10px] text-slate-400">({sub.horaEnvio})</span>
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                            {sub.supervisorNome}
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                            <span className="inline-block rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              {sub.coordNome}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {sub.formNome}
                          </td>
                          <td className="p-3 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                            {sub.totalFormularios}
                          </td>
                          <td className="p-3">
                            {isConf ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="h-3 w-3" /> Confirmado
                              </span>
                            ) : isDiv ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <AlertTriangle className="h-3 w-3" /> Divergência
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="h-3 w-3" /> Pendente Admin
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedSub(sub)}
                                className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Ver Detalhes do Recibo ODK"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {isAdmin && (
                                <>
                                  {!isConf && (
                                    <button
                                      onClick={() => handleUpdateStatusAction(sub.id, 'confirmado')}
                                      className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                                      title="Confirmar envio como VÁLIDO"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  <button
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Tem a certeza que deseja eliminar o registo de recibo ${sub.codigoReciboODK}?`
                                        )
                                      ) {
                                        await onDeleteSubmission(sub.id);
                                      }
                                    }}
                                    className="rounded-lg border border-rose-200 dark:border-rose-900/50 p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                    title="Eliminar confirmação ODK"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESUMO POR SUPERVISORES */}
      {activeMainTab === 'supervisores' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 mb-1">
              Desempenho & Formulários ODK por Supervisor
            </h2>
            <p className="text-xs text-slate-500">
              Listagem consolidada mostrando quantas confirmações e formulários ODK cada supervisor enviou durante a campanha.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {supervisorStats.map((st) => (
              <div
                key={st.supervisor.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-sm">
                      {st.supervisor.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {st.supervisor.nome}
                      </h3>
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {st.coordNome}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Submissões</span>
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {st.totalSubs}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                        Formulários
                      </span>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                        {st.totalForms}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <span>Validadas: <strong className="text-emerald-600">{st.confirmados}</strong></span>
                    <span>Pendentes: <strong className="text-amber-600">{st.pendentes}</strong></span>
                  </div>

                  {st.recibos.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Códigos de Recibo:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {st.recibos.slice(0, 3).map((r) => (
                          <span
                            key={r}
                            className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300"
                          >
                            {r}
                          </span>
                        ))}
                        {st.recibos.length > 3 && (
                          <span className="text-[9px] font-bold text-slate-400">
                            +{st.recibos.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>Último envio: {st.ultimosEnvio}</span>
                  <button
                    onClick={() => {
                      setSearchTerm(st.supervisor.nome);
                      setActiveMainTab('list');
                    }}
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    Ver Envios →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RELATÓRIO DOS 4 DIAS DE CAMPANHA */}
      {activeMainTab === 'campanha4dias' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950/80 px-3 py-1 text-xs font-bold text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Award className="h-3.5 w-3.5" /> Registos dos 4 Dias de Trabalho de Campanha
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  Consolidado Diario de Formulários ODK Collect
                </h2>
                <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
                  Visualização estruturada dos 4 dias de campanha marcados com todas as submissões de formulários efetuadas pelos supervisores em campo.
                </p>
              </div>

              <button
                onClick={() => setShow4DaysReceiptModal(true)}
                className="flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 text-xs font-black shadow-md transition active:scale-95"
              >
                <Camera className="h-4 w-4" />
                <span>Capturar / Gerar Comprovativo dos 4 Dias</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {campaignDays.map((day) => (
              <div
                key={day.dayIndex}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm shadow-2xs">
                      D{day.dayIndex}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {day.dayLabel}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500">
                        Data: {day.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-purple-700 dark:text-purple-400">
                      {day.totalFormsDay} <span className="text-xs font-normal text-slate-500">forms</span>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600">
                      {day.confirmadosDay} validados
                    </div>
                  </div>
                </div>

                {day.submissions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Nenhum formulário ODK registado neste dia de trabalho.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-xs border border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {sub.supervisorNome} ({sub.coordNome})
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Recibo: {sub.codigoReciboODK} • {sub.horaEnvio}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {sub.totalFormularios} forms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: REGISTAR NOVO ENVIO ODK COLLECT (HIGH CONTRAST WHITE TEXT) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500 p-2.5 text-slate-950 font-black">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Registar Confirmação Envio ODK Collect
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Informar envio dos formulários recolhidos no Android ODK Collect.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Form Selection */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Nome do Formulário ODK Collect *
                </label>
                <select
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  required
                >
                  {ODK_FORM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-900 text-white font-semibold">
                      {opt}
                    </option>
                  ))}
                </select>
                {formNome === 'Outro Formulário Personalizado...' && (
                  <input
                    type="text"
                    value={customFormNome}
                    onChange={(e) => setCustomFormNome(e.target.value)}
                    placeholder="Digite o nome do formulário..."
                    className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-bold text-white outline-none focus:border-emerald-400"
                    required
                  />
                )}
              </div>

              {/* Data & Hora Envio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Data do Envio *
                  </label>
                  <input
                    type="date"
                    value={dataEnvio}
                    onChange={(e) => setDataEnvio(e.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-bold text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Hora do Envio *
                  </label>
                  <input
                    type="time"
                    value={horaEnvio}
                    onChange={(e) => setHoraEnvio(e.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-bold text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              {/* Total Formulários Lançados & Coordination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Qtd. Formulários Enviados *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={totalFormularios}
                    onChange={(e) => setTotalFormularios(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-sm font-black text-emerald-400 outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Coordenação Operacional
                  </label>
                  {isAdmin ? (
                    <select
                      value={coordId || ''}
                      onChange={(e) => setCoordId(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-bold text-white outline-none focus:border-emerald-400"
                    >
                      {coordenacoes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white font-semibold">
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full rounded-xl border border-emerald-500/50 bg-slate-800/80 p-3 text-xs font-bold text-emerald-300 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-400" />
                      <span>{user.coordNome || userAssignedCoord?.nome || 'Coordenação Atribuída'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recibo Code & Dispositivo Android */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-white">
                    Código de Recibo / Referência ODK *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateReceiptCode}
                    className="text-[10px] font-bold text-emerald-400 hover:underline"
                  >
                    Gerar Novo Código
                  </button>
                </div>
                <input
                  type="text"
                  value={codigoRecibo}
                  onChange={(e) => setCodigoRecibo(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-mono font-bold text-emerald-300 outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Dispositivo Android Utilizado
                </label>
                <input
                  type="text"
                  value={dispositivoAndroid}
                  onChange={(e) => setDispositivoAndroid(e.target.value)}
                  placeholder="Ex: Samsung Galaxy Tab A7 (Android 11, 4GB RAM)"
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-semibold text-white placeholder-slate-400 outline-none focus:border-emerald-400"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Observações de Campo / Notas do Envio
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Indique detalhes de sinal GPS, local de recolha ou intercorrências..."
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-semibold text-white placeholder-slate-400 outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2.5 text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'A Submeter...' : 'Confirmar Envio ODK'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER DETALHES DO RECIBO ODK */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Comprovativo de Envio ODK
                </span>
                <h3 className="text-lg font-black text-white font-mono">
                  {selectedSub.codigoReciboODK}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div>
                  <span className="text-slate-400 font-bold block">Supervisor:</span>
                  <span className="text-white font-black text-sm">{selectedSub.supervisorNome}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Coordenação:</span>
                  <span className="text-emerald-300 font-black text-sm">{selectedSub.coordNome}</span>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <span className="text-slate-400 font-bold block">Nome do Formulário ODK:</span>
                <span className="text-white font-extrabold">{selectedSub.formNome}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div>
                  <span className="text-slate-400 font-bold block">Data & Hora de Envio:</span>
                  <span className="text-white font-semibold">
                    {selectedSub.dataEnvio} às {selectedSub.horaEnvio}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Formulários Submetidos:</span>
                  <span className="text-emerald-400 font-black text-base">
                    {selectedSub.totalFormularios} formulários
                  </span>
                </div>
              </div>

              {selectedSub.dispositivoAndroid && (
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 font-bold block">Dispositivo Android:</span>
                  <span className="text-slate-200 font-medium">{selectedSub.dispositivoAndroid}</span>
                </div>
              )}

              {selectedSub.observacoes && (
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 font-bold block">Observações:</span>
                  <span className="text-slate-200 italic">{selectedSub.observacoes}</span>
                </div>
              )}

              {isAdmin && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-amber-300">
                    Ação Administrativa de Validação:
                  </label>
                  <input
                    type="text"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Adicionar nota administrativa de verificação..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-400 outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatusAction(selectedSub.id, 'confirmado')}
                      className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 p-2.5 text-xs font-black text-slate-950 transition"
                    >
                      Aprovar & Confirmar
                    </button>
                    <button
                      onClick={() => handleUpdateStatusAction(selectedSub.id, 'divergencia')}
                      className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 p-2.5 text-xs font-black text-white transition"
                    >
                      Marcar Divergência
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedSub(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROVATIVO DE 4 DIAS DE TRABALHO (MODO CAPTURA / IMPRESSÃO) */}
      {show4DaysReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border-2 border-purple-500 bg-white p-8 shadow-2xl space-y-6 text-slate-900 print:m-0 print:p-0 print:shadow-none">
            {/* Header Comprovativo */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-900 text-white font-black text-xl shadow-md">
                  ODK
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                    Comprovativo Oficial dos 4 Dias de Trabalho
                  </h2>
                  <p className="text-xs font-bold text-purple-800">
                    Campanha de Mobilização • Formulários ODK Collect Central
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block font-mono text-xs font-black bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-800">
                  REF-ODK-4DIAS-{new Date().getFullYear()}
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  Gerado em: {new Date().toLocaleString('pt-PT')}
                </p>
              </div>
            </div>

            {/* Campaign Metrics Overview */}
            <div className="grid grid-cols-4 gap-3 bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-purple-900">Dias Marcados</span>
                <div className="text-xl font-black text-purple-950">4 Dias</div>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-purple-900">Total Formulários</span>
                <div className="text-xl font-black text-emerald-700">{totalFormsCount}</div>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-purple-900">Submissões</span>
                <div className="text-xl font-black text-slate-900">{totalSubmissionsCount}</div>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-purple-900">Validadas Admin</span>
                <div className="text-xl font-black text-emerald-800">{confirmedCount}</div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 font-black text-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Dia de Campanha</th>
                    <th className="p-2.5">Data Envio</th>
                    <th className="p-2.5">Submissões</th>
                    <th className="p-2.5 text-right">Formulários ODK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {campaignDays.map((d) => (
                    <tr key={d.dayIndex} className="font-semibold">
                      <td className="p-2.5 font-black text-purple-900">{d.dayLabel}</td>
                      <td className="p-2.5 font-mono text-slate-700">{d.date}</td>
                      <td className="p-2.5 text-slate-800">{d.submissions.length} registos</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-800 text-sm">
                        {d.totalFormsDay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature & Verification Seal */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs">
              <div className="border-t border-slate-400 pt-2 text-center">
                <span className="font-bold text-slate-800">Assinatura do Supervisor Responsável</span>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{user.nome} ({user.coordNome || 'Supervisor'})</p>
              </div>
              <div className="border-t border-slate-400 pt-2 text-center">
                <span className="font-bold text-slate-800">Selo de Validação do Administrador</span>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">✔ Autenticado pela Direção Geral</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setShow4DaysReceiptModal(false)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black px-6 py-2.5 text-xs shadow-md transition active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir / Capturar Comprovativo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GUIA DO ODK COLLECT */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Guia Oficial do ODK Collect Central
                </h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-200">
              <p>
                <strong>ODK Collect</strong> é o aplicativo Android padrão para recolha de dados e fichas de supervisão da mobilização em campo.
              </p>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <span className="font-bold text-emerald-300 block">Passo a Passo do Supervisor:</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Abra o ODK Collect no seu tablet ou smartphone Android em campo.</li>
                  <li>Preencha a <strong>Ficha de Supervisão da Mobilização</strong>.</li>
                  <li>Efetue o envio final dos formulários para o servidor central.</li>
                  <li>Aceda a este sistema e clique em <strong>Registar Envio ODK</strong> indicando o recibo e quantidade para validação do Administrador.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-xl bg-emerald-500 text-slate-950 font-black px-5 py-2 text-xs hover:bg-emerald-400"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
