import React, { useState, useMemo } from 'react';
import {
  MessageSquareWarning,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Printer,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  FileText,
  X,
  Check,
  AlertTriangle,
  Radio,
  Share2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Pencil,
  Trash2,
  Eye,
  Send,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FichaRumor, Coordination, User } from '../types';
import { useToast } from '../context/ToastContext';

interface GestaoRumoresViewProps {
  user: User;
  rumores: FichaRumor[];
  coordenacoes: Coordination[];
  users?: User[];
  onSaveRumor: (rumor: FichaRumor) => Promise<void>;
  onUpdateRumor: (id: string, fields: Partial<FichaRumor>) => Promise<void>;
  onDeleteRumor?: (id: string) => Promise<void>;
}

export const GestaoRumoresView: React.FC<GestaoRumoresViewProps> = ({
  user,
  rumores = [],
  coordenacoes = [],
  users = [],
  onSaveRumor,
  onUpdateRumor,
  onDeleteRumor,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [riskFilter, setRiskFilter] = useState('todos');
  const [coordFilter, setCoordFilter] = useState('todas');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [selectedRumor, setSelectedRumor] = useState<FichaRumor | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingRumor, setEditingRumor] = useState<FichaRumor | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rumorToDelete, setRumorToDelete] = useState<FichaRumor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const defaultFormData: Partial<FichaRumor> = {
    rumor: '',
    local: '',
    data: new Date().toISOString().split('T')[0],
    fonte: 'Conversas na Comunidade (Boca a Boca)',
    resposta: '',
    responsavel: user.nome || 'Supervisor de Mobilização Social',
    responsavelId: user.id,
    responsavelCargo: user.tipo === 'admin' ? 'Administrador / Coordenação Geral' : 'Supervisor Municipal de Mobilização Social',
    estado: 'Em Investigação',
    nivelRisco: 'Alto',
    categoriaRumor: 'Segurança / Medo de Efeitos Secundários',
    coordId: user.coordId || (coordenacoes[0]?.id ?? 1),
    coordNome: user.coordNome || coordenacoes[0]?.nome || 'Coordenação Geral',
    populacaoAfetada: '',
    observacoes: '',
  };

  const [formData, setFormData] = useState<Partial<FichaRumor>>(defaultFormData);

  // Pre-fill / open new rumor modal
  const handleOpenNewModal = () => {
    setEditingRumor(null);
    setFormData({
      ...defaultFormData,
      responsavel: user.nome || 'Supervisor de Mobilização Social',
      responsavelId: user.id,
      responsavelCargo: user.tipo === 'admin' ? 'Administrador / Coordenação Geral' : 'Supervisor Municipal de Mobilização Social',
      coordId: user.coordId || (coordenacoes[0]?.id ?? 1),
      coordNome: user.coordNome || coordenacoes[0]?.nome || 'Coordenação Geral',
    });
    setIsNewModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (rumor: FichaRumor) => {
    setEditingRumor(rumor);
    setFormData({ ...rumor });
    setIsNewModalOpen(true);
  };

  // Submit Save/Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rumor?.trim()) {
      showToast('O texto descritivo do rumor é obrigatório.', 'error');
      return;
    }
    if (!formData.local?.trim()) {
      showToast('O local / bairro é obrigatório.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRumor) {
        await onUpdateRumor(editingRumor.id, {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        showToast('Ficha de Gestão de Rumor atualizada com sucesso!', 'success');
      } else {
        const newRumor: FichaRumor = {
          id: `rumor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          rumor: formData.rumor.trim(),
          local: formData.local.trim(),
          data: formData.data || new Date().toISOString().split('T')[0],
          fonte: formData.fonte || 'Boca a Boca na Comunidade',
          resposta: formData.resposta?.trim() || 'Em planeamento de intervenção com as equipas de mobilização social.',
          responsavel: formData.responsavel || user.nome,
          responsavelId: user.id,
          responsavelCargo: formData.responsavelCargo || (user.tipo === 'admin' ? 'Administrador' : 'Supervisor de Mobilização Social'),
          estado: formData.estado || 'Em Investigação',
          nivelRisco: formData.nivelRisco || 'Médio',
          categoriaRumor: formData.categoriaRumor || 'Geral',
          coordId: formData.coordId ?? user.coordId ?? 1,
          coordNome: formData.coordNome || user.coordNome || 'Coordenação Geral',
          populacaoAfetada: formData.populacaoAfetada?.trim() || '',
          observacoes: formData.observacoes?.trim() || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await onSaveRumor(newRumor);
        showToast('Novo Rumor registado e integrado à monitoria de risco!', 'success');
      }

      setIsNewModalOpen(false);
      setEditingRumor(null);
    } catch (err) {
      console.error(err);
      showToast('Ocorreu um erro ao guardar o registo de rumor.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick state update
  const handleQuickStatusChange = async (rumor: FichaRumor, newStatus: FichaRumor['estado']) => {
    try {
      await onUpdateRumor(rumor.id, {
        estado: newStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Estado do rumor atualizado para "${newStatus}".`, 'success');
      if (selectedRumor && selectedRumor.id === rumor.id) {
        setSelectedRumor({ ...selectedRumor, estado: newStatus });
      }
    } catch (err) {
      console.error(err);
      showToast('Falha ao atualizar o estado do rumor.', 'error');
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!rumorToDelete || !onDeleteRumor) return;
    try {
      await onDeleteRumor(rumorToDelete.id);
      showToast('Registo de rumor eliminado com sucesso.', 'info');
      setIsDeleteModalOpen(false);
      setRumorToDelete(null);
      if (selectedRumor?.id === rumorToDelete.id) {
        setSelectedRumor(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao eliminar registo de rumor.', 'error');
    }
  };

  // Filtered List
  const filteredRumores = useMemo(() => {
    return rumores.filter((r) => {
      // Permission filter: if not admin, supervisor sees all or by coord if configured, but guidelines say supervisors track all or their areas
      const matchesSearch =
        !searchTerm.trim() ||
        r.rumor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.fonte.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.resposta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.responsavel.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'todos' || r.estado.toLowerCase() === statusFilter.toLowerCase();

      const matchesRisk =
        riskFilter === 'todos' || r.nivelRisco?.toLowerCase() === riskFilter.toLowerCase();

      const matchesCoord =
        coordFilter === 'todas' ||
        String(r.coordId) === coordFilter ||
        r.coordNome === coordFilter;

      const matchesDate = !dateFilter || r.data === dateFilter;

      return matchesSearch && matchesStatus && matchesRisk && matchesCoord && matchesDate;
    });
  }, [rumores, searchTerm, statusFilter, riskFilter, coordFilter, dateFilter]);

  // Statistics calculation
  const totalRumores = rumores.length;
  const ativosEmInvestigacao = rumores.filter(
    (r) => r.estado === 'Ativo' || r.estado === 'Em Investigação' || r.estado === 'Crítico'
  ).length;
  const emResposta = rumores.filter((r) => r.estado === 'Em Resposta').length;
  const mitigados = rumores.filter((r) => r.estado === 'Mitigado').length;
  const taxaMitigacao =
    totalRumores > 0 ? Math.round((mitigados / totalRumores) * 100) : 0;

  // Export to Excel according to official format
  const handleExportExcel = () => {
    if (filteredRumores.length === 0) {
      showToast('Não existem registos de rumores para exportar.', 'info');
      return;
    }

    const excelData = filteredRumores.map((r, index) => ({
      'Nº': index + 1,
      'Rumor': r.rumor,
      'Local': r.local,
      'Data': r.data,
      'Fonte': r.fonte,
      'Resposta': r.resposta,
      'Responsável': r.responsavel,
      'Estado': r.estado,
      'Nível de Risco': r.nivelRisco || 'Não definido',
      'Categoria': r.categoriaRumor || 'Geral',
      'Coordenação': r.coordNome || 'Geral',
      'População Afetada': r.populacaoAfetada || '—',
      'Observações': r.observacoes || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gestão de Rumores');
    XLSX.writeFile(
      wb,
      `SirDm_Ficha_Gestao_Rumores_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Ficha de Gestão de Rumores exportada para Excel com sucesso!', 'success');
  };

  // Print official table
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs uppercase tracking-wider">
              6 - Ficha
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight">
              Ficha de Gestão de Rumores
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Identificação, classificação, priorização e resposta a desinformação sobre a vacinação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 px-3 py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
            id="btn-export-rumores-excel"
            title="Exportar para Excel formato oficial"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
            id="btn-novo-rumor"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Registar Novo Rumor</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total de Rumores
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalRumores}
            </span>
            <MessageSquareWarning className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-[10px] text-slate-400">Registados nas rondas</p>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            Ativos / Investigação
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              {ativosEmInvestigacao}
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Requerem atenção imediata</p>
        </div>

        <div className="rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
            Em Resposta / Ação
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-sky-700 dark:text-sky-400 tracking-tight">
              {emResposta}
            </span>
            <Radio className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-[10px] text-sky-700/80 dark:text-sky-400/80">Equipas no terreno</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            Mitigados / Resolvidos
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
              {mitigados}
            </span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md">
              {taxaMitigacao}%
            </span>
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Eficácia de resposta</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar rumor, bairro, fonte ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              id="input-search-rumores"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none focus:border-blue-600"
              id="select-filter-status-rumor"
            >
              <option value="todos">Todos os Estados</option>
              <option value="Em Investigação">Em Investigação</option>
              <option value="Em Resposta">Em Resposta</option>
              <option value="Mitigado">Mitigado / Resolvido</option>
              <option value="Ativo">Ativo</option>
              <option value="Crítico">Crítico</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none focus:border-blue-600"
              id="select-filter-risk-rumor"
            >
              <option value="todos">Todos os Níveis de Risco</option>
              <option value="Alto">Risco Alto</option>
              <option value="Médio">Risco Médio</option>
              <option value="Baixo">Risco Baixo</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none focus:border-blue-600"
              id="input-filter-date-rumor"
            />
          </div>
        </div>
      </div>

      {/* Official Table Layout (Matching user document structure) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {/* Table Title Header Bar */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-blue-50/60 dark:bg-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
              Ficha de Gestão de Rumores
            </h2>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ({filteredRumores.length} registos)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-extrabold uppercase text-[11px] tracking-wider">
                <th className="p-3 min-w-[220px] border-r border-slate-200/60 dark:border-slate-800">
                  Rumor
                </th>
                <th className="p-3 min-w-[140px] border-r border-slate-200/60 dark:border-slate-800">
                  Local
                </th>
                <th className="p-3 min-w-[100px] border-r border-slate-200/60 dark:border-slate-800">
                  Data
                </th>
                <th className="p-3 min-w-[140px] border-r border-slate-200/60 dark:border-slate-800">
                  Fonte
                </th>
                <th className="p-3 min-w-[240px] border-r border-slate-200/60 dark:border-slate-800">
                  Resposta
                </th>
                <th className="p-3 min-w-[160px] border-r border-slate-200/60 dark:border-slate-800">
                  Responsável
                </th>
                <th className="p-3 min-w-[130px] border-r border-slate-200/60 dark:border-slate-800">
                  Estado
                </th>
                <th className="p-3 text-center min-w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredRumores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 space-y-2">
                    <MessageSquareWarning className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-xs">Nenhum rumor encontrado com os filtros selecionados.</p>
                    <p className="text-[11px] text-slate-400">
                      Clique em "+ Registar Novo Rumor" para adicionar novos boatos ou perceções negativas.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRumores.map((item) => {
                  const isHighRisk = item.nivelRisco === 'Alto' || item.estado === 'Crítico';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition duration-150 ${
                        item.estado === 'Mitigado'
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isHighRisk
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Rumor */}
                      <td className="p-3 font-semibold border-r border-slate-200/60 dark:border-slate-800 align-top">
                        <div className="space-y-1">
                          <p className="text-slate-900 dark:text-white leading-snug font-bold">
                            {item.rumor}
                          </p>
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {item.nivelRisco && (
                              <span
                                className={`rounded-md px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                                  item.nivelRisco === 'Alto'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                                    : item.nivelRisco === 'Médio'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                                }`}
                              >
                                Risco {item.nivelRisco}
                              </span>
                            )}
                            {item.categoriaRumor && (
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                                {item.categoriaRumor}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Local */}
                      <td className="p-3 border-r border-slate-200/60 dark:border-slate-800 align-top">
                        <div className="flex items-start gap-1 font-semibold text-slate-900 dark:text-white">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span>{item.local}</span>
                        </div>
                        {item.coordNome && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                            {item.coordNome}
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="p-3 font-medium border-r border-slate-200/60 dark:border-slate-800 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{item.data}</span>
                        </div>
                      </td>

                      {/* Fonte */}
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200/60 dark:border-slate-800 align-top">
                        <div className="flex items-start gap-1">
                          <Radio className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                          <span>{item.fonte}</span>
                        </div>
                      </td>

                      {/* Resposta */}
                      <td className="p-3 border-r border-slate-200/60 dark:border-slate-800 align-top">
                        <p className="text-slate-700 dark:text-slate-300 leading-snug font-medium line-clamp-3">
                          {item.resposta}
                        </p>
                      </td>

                      {/* Responsável */}
                      <td className="p-3 border-r border-slate-200/60 dark:border-slate-800 align-top">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                            <UserIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{item.responsavel}</span>
                          </div>
                          {item.responsavelCargo && (
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {item.responsavelCargo}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="p-3 border-r border-slate-200/60 dark:border-slate-800 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              item.estado === 'Mitigado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                                : item.estado === 'Em Resposta'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300'
                                : item.estado === 'Crítico'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                            }`}
                          >
                            {item.estado === 'Mitigado' ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : item.estado === 'Em Resposta' ? (
                              <Radio className="h-3 w-3 text-sky-600" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                            )}
                            <span>{item.estado}</span>
                          </span>

                          {/* Quick Status Selector */}
                          <select
                            value={item.estado}
                            onChange={(e) =>
                              handleQuickStatusChange(item, e.target.value as FichaRumor['estado'])
                            }
                            className="w-full h-6 px-1 text-[10px] font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                          >
                            <option value="Em Investigação">Alterar: Investigando</option>
                            <option value="Em Resposta">Alterar: Em Resposta</option>
                            <option value="Mitigado">Alterar: Mitigado</option>
                            <option value="Ativo">Alterar: Ativo</option>
                            <option value="Crítico">Alterar: Crítico</option>
                          </select>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedRumor(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Ver detalhes completos do rumor"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Editar ficha de rumor"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {onDeleteRumor && (
                            <button
                              onClick={() => {
                                setRumorToDelete(item);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Eliminar este registo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registar / Editar Rumor */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                  <MessageSquareWarning className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {editingRumor ? 'Editar Ficha de Gestão de Rumores' : 'Registar Ficha de Gestão de Rumores'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Comunicação de Risco e Engajamento Comunitário (RCCE)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Rumor Description */}
              <div className="space-y-1">
                <label className="block font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  1. Descrição do Rumor / Boato / Desinformação <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Informação a circular de que a vacina oral da Pólio causa esterilidade ou efeitos adversos graves nas crianças..."
                  value={formData.rumor || ''}
                  onChange={(e) => setFormData({ ...formData, rumor: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Local */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    2. Local / Bairro / Ponto de Referência <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bairro 15 de Março, Praça Velha"
                    value={formData.local || ''}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                {/* Data */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    3. Data de Identificação <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data || ''}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fonte */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    4. Fonte do Rumor / Canal de Propagação
                  </label>
                  <select
                    value={formData.fonte || 'Conversas na Comunidade (Boca a Boca)'}
                    onChange={(e) => setFormData({ ...formData, fonte: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-600"
                  >
                    <option value="Conversas na Comunidade (Boca a Boca)">Conversas na Comunidade (Boca a Boca)</option>
                    <option value="Mercados Informais e Praças Comunitárias">Mercados Informais e Praças Comunitárias</option>
                    <option value="Redes Sociais & Grupos de WhatsApp">Redes Sociais & Grupos de WhatsApp</option>
                    <option value="Igrejas, Cultos e Líderes Religiosos">Igrejas, Cultos e Líderes Religiosos</option>
                    <option value="Lideranças Tradicionais / Sobas">Lideranças Tradicionais / Sobas</option>
                    <option value="Escolas, Creches e Centros Educativos">Escolas, Creches e Centros Educativos</option>
                    <option value="Paragens de Táxi / Candongueiros">Paragens de Táxi / Candongueiros</option>
                    <option value="Outro Canal Comunitário">Outro Canal Comunitário</option>
                  </select>
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    5. Categoria do Rumor
                  </label>
                  <select
                    value={formData.categoriaRumor || 'Segurança / Medo de Efeitos Secundários'}
                    onChange={(e) => setFormData({ ...formData, categoriaRumor: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-600"
                  >
                    <option value="Segurança / Medo de Efeitos Secundários">Segurança / Medo de Efeitos Secundários</option>
                    <option value="Eficácia da Vacina & Múltiplas Doses">Eficácia da Vacina & Múltiplas Doses</option>
                    <option value="Crenças Religiosas / Culturais">Crenças Religiosas / Culturais</option>
                    <option value="Origem da Vacina / Desconfiança Institucional">Origem da Vacina / Desconfiança Institucional</option>
                    <option value="Boato de Óbito ou Doença Falsa">Boato de Óbito ou Doença Falsa</option>
                    <option value="Outra Percepção Negativa">Outra Percepção Negativa</option>
                  </select>
                </div>
              </div>

              {/* Resposta / Estratégia de Mitigação */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    6. Resposta / Estratégia de Comunicação de Risco
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Intervenção de mitigação
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Ex: Realização de diálogo com o Soba do bairro, transmissão de mensagens por megafone e distribuição de materiais com factos comprovados..."
                  value={formData.resposta || ''}
                  onChange={(e) => setFormData({ ...formData, resposta: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Responsável */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    7. Responsável
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsavel || ''}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 font-bold"
                  />
                </div>

                {/* Estado */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    8. Estado do Rumor
                  </label>
                  <select
                    value={formData.estado || 'Em Investigação'}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value as FichaRumor['estado'] })
                    }
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-blue-600"
                  >
                    <option value="Em Investigação">Em Investigação</option>
                    <option value="Em Resposta">Em Resposta / Ação</option>
                    <option value="Mitigado">Mitigado / Resolvido</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Crítico">Crítico / Urgente</option>
                  </select>
                </div>

                {/* Nível de Risco */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    9. Nível de Risco
                  </label>
                  <select
                    value={formData.nivelRisco || 'Alto'}
                    onChange={(e) =>
                      setFormData({ ...formData, nivelRisco: e.target.value as FichaRumor['nivelRisco'] })
                    }
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-blue-600"
                  >
                    <option value="Alto">Alto Risco</option>
                    <option value="Médio">Médio Risco</option>
                    <option value="Baixo">Baixo Risco</option>
                  </select>
                </div>
              </div>

              {/* Coordenação & População Afetada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    10. Coordenação Associada
                  </label>
                  <select
                    value={formData.coordId || 1}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const found = coordenacoes.find((c) => c.id === id);
                      setFormData({
                        ...formData,
                        coordId: id,
                        coordNome: found?.nome || 'Coordenação Geral',
                      });
                    }}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:border-blue-600"
                  >
                    {coordenacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    11. População / Grupo Mais Afetado (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mães jovens, fiéis da seita X, vendedoras"
                    value={formData.populacaoAfetada || ''}
                    onChange={(e) => setFormData({ ...formData, populacaoAfetada: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>A guardar...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{editingRumor ? 'Guardar Alterações' : 'Registar Rumor'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalhes do Rumor */}
      {selectedRumor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <MessageSquareWarning className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Detalhes do Rumor Registado
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID: {selectedRumor.id} • Data: {selectedRumor.data}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRumor(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Rumor */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Rumor / Boato Identificado:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {selectedRumor.rumor}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Local / Bairro</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedRumor.local}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Fonte / Canal</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedRumor.fonte}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Estado Atual</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedRumor.estado}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Nível de Risco</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedRumor.nivelRisco || 'Médio'}
                  </p>
                </div>
              </div>

              {/* Resposta */}
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Estratégia de Resposta & Comunicação de Risco:
                </span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedRumor.resposta}
                </p>
              </div>

              {/* Responsável */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Responsável</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedRumor.responsavel}</span>
                  {selectedRumor.responsavelCargo && (
                    <span className="text-[10px] text-slate-400 block">{selectedRumor.responsavelCargo}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Coordenação</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedRumor.coordNome || 'Geral'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const toEdit = selectedRumor;
                  setSelectedRumor(null);
                  handleOpenEditModal(toEdit);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => setSelectedRumor(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && rumorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                Confirmar Eliminação de Rumor
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem a certeza de que deseja eliminar o registo do rumor:
              <br />
              <strong className="text-slate-900 dark:text-white mt-1 block">
                "{rumorToDelete.rumor}"
              </strong>
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setRumorToDelete(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow-md cursor-pointer"
              >
                Eliminar Registo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
