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

  // State
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<ODKSubmission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'confirmado' | 'divergencia'>('todos');
  const [coordFilter, setCoordFilter] = useState<string>('todas');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('todos');

  // Form State
  const [formNome, setFormNome] = useState('Registo de Agregados Familiares (ODK Collect)');
  const [customFormNome, setCustomFormNome] = useState('');
  const [dataEnvio, setDataEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [horaEnvio, setHoraEnvio] = useState(new Date().toTimeString().slice(0, 5));
  const [totalFormularios, setTotalFormularios] = useState<number>(25);
  const [dispositivoAndroid, setDispositivoAndroid] = useState('Samsung Galaxy Tab A7 (Android 11, 4GB RAM)');
  const [codigoRecibo, setCodigoRecibo] = useState(`ODK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-X`);
  const [coordId, setCoordId] = useState<number | null>(user.coordId || (coordenacoes[0]?.id ?? null));
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Pre-defined ODK Forms options
  const ODK_FORM_OPTIONS = [
    'Registo de Agregados Familiares (ODK Collect)',
    'Inquérito de Mapeamento & Vacinação Polio',
    'Cadastramento de Casas e Famílias em Campo',
    'Ficha Epidemiológica e Vigilância Comunitária',
    'Mapeamento de Pontos de Água e Chafarizes',
    'Outro Formulário Personalizado...',
  ];

  const handleGenerateReceiptCode = () => {
    const randomCode = `ODK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    setCodigoRecibo(randomCode);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedCoord = coordenacoes.find((c) => c.id === Number(coordId));
      const finalFormNome = formNome === 'Outro Formulário Personalizado...' ? customFormNome || 'Formulário Personalizado ODK' : formNome;

      await onCreateSubmission({
        formId: finalFormNome.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        formNome: finalFormNome,
        dataEnvio,
        horaEnvio,
        totalFormularios: Number(totalFormularios),
        dispositivoAndroid,
        codigoReciboODK: codigoRecibo,
        coordId: selectedCoord ? selectedCoord.id : user.coordId,
        coordNome: selectedCoord ? selectedCoord.nome : (user.coordNome || 'Sem Coordenação'),
        observacoes,
      });

      setShowModal(false);
      // Reset form
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
    // Non-admins see their own submissions or submissions from their coordination
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
    const headers = ['Recibo ODK', 'Supervisor', 'Coordenação', 'Formulário', 'Data Envio', 'Hora Envio', 'Formulários Lançados', 'Dispositivo Android', 'Status', 'Confirmado por Admin'];
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Confirmacoes_ODK_Collect_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const supervisoresList = users.filter((u) => u.tipo === 'supervisor' || u.tipo === 'user' || u.tipo === 'admin');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Smartphone className="h-3.5 w-3.5" /> ODK Collect Android Integration
              </span>
              <span className="text-xs text-slate-500 font-medium">| Confirmação de Envios de Campo</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Confirmação & Controlo de Envios ODK
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Acompanhamento e validação administrativa dos relatórios de envio executados pelos supervisores no aplicativo Android <strong>ODK Collect</strong> para a central. Garanta auditoria e integridade dos dados recolhidos em campo.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowInfoModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Ver especificações e guia de utilização do ODK Collect"
            >
              <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Guia do ODK</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Exportar lista de confirmações para CSV/Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-extrabold shadow-sm transition"
              id="btn-novo-envio-odk"
            >
              <Plus className="h-4 w-4" />
              <span>Registar Envio ODK</span>
            </button>
          </div>
        </div>

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
            <p className="mt-1 text-[11px] text-slate-500">Inquéritos/fichas enviados na central</p>
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

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por recibo ODK, supervisor, formulário ou coordenação..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-2 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente de Validação</option>
              <option value="confirmado">Confirmados pelo Admin</option>
              <option value="divergencia">Com Divergência</option>
            </select>

            {/* Coordination Filter */}
            <select
              value={coordFilter}
              onChange={(e) => setCoordFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="todas">Todas as Coordenações</option>
              {coordenacoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            {/* Supervisor Filter */}
            {isAdmin && (
              <select
                value={supervisorFilter}
                onChange={(e) => setSupervisorFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="todos">Todos os Supervisores</option>
                {supervisoresList.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Submissions Table / Cards */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Histórico de Confirmações de Envio ODK Collect
            </h2>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
              {filteredSubmissions.length} registos
            </span>
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <Smartphone className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 animate-pulse" />
            <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhuma confirmação de envio ODK encontrada
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Os supervisores podem registar a confirmação do envio do ODK Collect clicando no botão "Registar Envio ODK".
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-extrabold transition"
            >
              <Plus className="h-4 w-4" /> Registar Envio ODK Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Recibo ODK & Data</th>
                  <th className="px-4 py-3">Supervisor & Coordenação</th>
                  <th className="px-4 py-3">Formulário ODK & Quantidade</th>
                  <th className="px-4 py-3">Dispositivo Android</th>
                  <th className="px-4 py-3">Status de Validação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    {/* Recibo ODK & Data */}
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{sub.codigoReciboODK}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{sub.dataEnvio} às {sub.horaEnvio}</span>
                      </div>
                    </td>

                    {/* Supervisor & Coordenação */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>{sub.supervisorNome}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-[180px]">{sub.coordNome}</span>
                      </div>
                    </td>

                    {/* Formulário ODK & Quantidade */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {sub.formNome}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                        <FileText className="h-3 w-3" />
                        <span>{sub.totalFormularios} formulários enviados</span>
                      </div>
                    </td>

                    {/* Dispositivo Android */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                      <div className="text-[11px] font-medium flex items-center gap-1">
                        <Smartphone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{sub.dispositivoAndroid || 'Android App'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {sub.status === 'confirmado' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>CONFIRMADO ADMIN</span>
                        </span>
                      ) : sub.status === 'divergencia' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/80 px-2.5 py-1 text-[10px] font-extrabold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <AlertTriangle className="h-3 w-3" />
                          <span>DIVERGÊNCIA</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Clock className="h-3 w-3" />
                          <span>PENDENTE ADMIN</span>
                        </span>
                      )}
                      {sub.adminConfirmadorNome && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Validador: {sub.adminConfirmadorNome}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSub(sub);
                            setAdminNoteInput(sub.observacoes || '');
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Ver detalhes da submissão ODK"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {isAdmin && (
                          <>
                            {sub.status !== 'confirmado' && (
                              <button
                                onClick={() => onUpdateStatus(sub.id, 'confirmado', 'Validado pelo Administrador')}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-extrabold transition"
                                title="Confirmar validação do envio ODK"
                              >
                                Validar
                              </button>
                            )}

                            <button
                              onClick={async () => {
                                if (confirm(`Tem a certeza que deseja eliminar o registo de recibo ${sub.codigoReciboODK}?`)) {
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registar Novo Envio ODK Collect */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/80 p-2 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Registar Confirmação Envio ODK Collect
                  </h3>
                  <p className="text-xs text-slate-500">
                    Informar ao Administrador que os formulários recolhidos no Android ODK Collect foram submetidos para a central.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Form Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Formulário ODK Collect *
                </label>
                <select
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
                  required
                >
                  {ODK_FORM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
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
                    className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium outline-none"
                    required
                  />
                )}
              </div>

              {/* Data & Hora Envio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data do Envio *
                  </label>
                  <input
                    type="date"
                    value={dataEnvio}
                    onChange={(e) => setDataEnvio(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hora do Envio *
                  </label>
                  <input
                    type="time"
                    value={horaEnvio}
                    onChange={(e) => setHoraEnvio(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium outline-none"
                    required
                  />
                </div>
              </div>

              {/* Total Formulários Lançados */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qtd. Formulários Enviados *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={totalFormularios}
                    onChange={(e) => setTotalFormularios(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-bold outline-none text-emerald-600 dark:text-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Coordenação Operacional
                  </label>
                  <select
                    value={coordId || ''}
                    onChange={(e) => setCoordId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium outline-none"
                  >
                    {coordenacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recibo Code & Dispositivo Android */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Código de Recibo / Referência ODK *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateReceiptCode}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    Gerar Novo Código
                  </button>
                </div>
                <input
                  type="text"
                  value={codigoRecibo}
                  onChange={(e) => setCodigoRecibo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dispositivo Android Utilizado
                </label>
                <input
                  type="text"
                  value={dispositivoAndroid}
                  onChange={(e) => setDispositivoAndroid(e.target.value)}
                  placeholder="Ex: Samsung Galaxy Tab A7 (Android 11, 4GB RAM)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium outline-none"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações de Campo / Notas do Envio
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Indique detalhes como sinal 4G em campo, capturas GPS ou ocorrências durante a submissão no ODK Collect..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-extrabold shadow-sm transition disabled:opacity-50"
                  id="btn-confirmar-registo-odk"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'A submeter...' : 'Enviar Confirmação para o Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalhes da Submissão */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Detalhes do Envio ODK Collect
                </h3>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1.5 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Recibo ODK:</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">{selectedSub.codigoReciboODK}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Supervisor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSub.supervisorNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Coordenação:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedSub.coordNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Formulário ODK:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedSub.formNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Qtd. Formulários:</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">{selectedSub.totalFormularios} formulários</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Data e Hora:</span>
                  <span>{selectedSub.dataEnvio} às {selectedSub.horaEnvio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Dispositivo Android:</span>
                  <span>{selectedSub.dispositivoAndroid || 'Não especificado'}</span>
                </div>
              </div>

              {selectedSub.observacoes && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Observações do Supervisor</label>
                  <p className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-slate-700 dark:text-slate-300 italic border border-slate-200 dark:border-slate-800">
                    "{selectedSub.observacoes}"
                  </p>
                </div>
              )}

              {/* Admin Validation Section */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ação Administrativa de Validação
                  </label>
                  <textarea
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Adicionar nota de validação administrativa..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs outline-none"
                    rows={2}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateStatusAction(selectedSub.id, 'confirmado')}
                      className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-extrabold transition"
                    >
                      <Check className="h-4 w-4" /> Confirmar Envio ODK
                    </button>
                    <button
                      onClick={() => handleUpdateStatusAction(selectedSub.id, 'divergencia')}
                      className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2 text-xs font-extrabold transition"
                    >
                      <AlertTriangle className="h-4 w-4" /> Sinalizar Divergência
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Guia Informativo ODK Collect */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/80 p-2 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Guia de Especificações ODK Collect
                  </h3>
                  <p className="text-xs text-slate-500">
                    Funcionamento e requisitos para recolha de dados Android em campo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-800/80">
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm mb-1">
                  O que é o ODK Collect?
                </h4>
                <p>
                  O <strong>ODK Collect</strong> é um aplicativo Android para gestão e preenchimento de formulários de campo. Ele descarrega formulários em branco da central e envia formulários preenchidos.
                  É especialmente desenhado para operar totalmente <strong>offline</strong> em zonas remotas sem sinal de rede.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-emerald-600" /> Dispositivos Suportados
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Compatível com qualquer dispositivo Android 5.0 ou superior. Recomendado <strong>Android 10+ com no mínimo 4 GB de RAM</strong> para formulários com lógica complexa, polígonos e listas longas.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Tipos de Dados Suportados
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Localização GPS, polígonos de mapa, áudio, imagens, vídeo, códigos de barras, assinaturas digitais, seleção múltipla e texto livre.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-white dark:bg-slate-900">
                <h5 className="font-bold text-slate-900 dark:text-slate-100">
                  Fluxo de Confirmação no SisMob:
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li>O supervisor recolhe os dados no campo usando o ODK Collect no Android.</li>
                  <li>Assim que obtém ligação 4G/Wi-Fi, envia as fichas preenchidas para o ODK Central.</li>
                  <li>No SisMob, o supervisor clica em <strong>"Registar Envio ODK"</strong>, informando o recibo e quantidade de formulários enviados.</li>
                  <li>O Administrador verifica e clica em <strong>"Validar"</strong> para dar confirmação oficial do recebimento.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-5 py-2 text-xs font-bold"
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
