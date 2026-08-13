import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Filter,
  FileText,
  Download,
  Pencil,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  UserCheck,
  Clock,
  Check,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Ficha, User, Coordination, Mobilizador, FichaTableData } from '../types';
import { LOCATION_CONFIGS } from '../data/initialData';
import { exportFichaPDF, exportFichasListPDF } from '../utils/pdfExporter';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';
import { RestrictionModal } from './RestrictionModal';
import { ValidacaoSupervisorModal } from './ValidacaoSupervisorModal';
import { isFichaPendingOver48h } from '../utils/fichaUtils';

interface FichasListViewProps {
  user: User;
  users?: User[];
  fichas: Ficha[];
  coordenacoes?: Coordination[];
  mobilizadores?: Mobilizador[];
  initialStatusFilter?: string;
  onDeleteFicha: (id: number) => Promise<void>;
  onUpdateFicha?: (id: number, fields: Partial<Ficha>) => Promise<void>;
  onRefresh: () => void;
  onClearTestData?: () => Promise<void>;
}

export const FichasListView: React.FC<FichasListViewProps> = React.memo(({
  user,
  users = [],
  fichas,
  coordenacoes = [],
  mobilizadores = [],
  initialStatusFilter = '',
  onDeleteFicha,
  onUpdateFicha,
  onRefresh,
  onClearTestData,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';

  const [isValidacaoModalOpen, setIsValidacaoModalOpen] = useState(false);
  const [isClearTestModalOpen, setIsClearTestModalOpen] = useState(false);
  const [isClearingTest, setIsClearingTest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [rondaFilter, setRondaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [selectedFicha, setSelectedFicha] = useState<Ficha | null>(null);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Edit Ficha state (Admin only)
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);
  const [editBairro, setEditBairro] = useState('');
  const [editData, setEditData] = useState('');
  const [editRonda, setEditRonda] = useState('1ª Ronda');
  const [editMobilizador, setEditMobilizador] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editCoordId, setEditCoordId] = useState<number>(1);
  const [editTableData, setEditTableData] = useState<FichaTableData>({});
  const [editSim, setEditSim] = useState(0);
  const [editNao, setEditNao] = useState(0);
  const [editMotivo, setEditMotivo] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deletingFicha, setDeletingFicha] = useState<Ficha | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditRestrictionModal, setShowEditRestrictionModal] = useState(false);

  // Open Edit Modal and prefill form
  const handleStartEdit = (f: Ficha) => {
    if (user.tipo !== 'admin') {
      setShowEditRestrictionModal(true);
      return;
    }
    setEditingFicha(f);
    setEditBairro(f.bairro || '');
    setEditData(f.data || new Date().toISOString().split('T')[0]);
    setEditRonda(f.ronda || '1ª Ronda');
    setEditMobilizador(f.mobilizador || '');
    setEditTelefone(f.telefone || '');
    setEditCoordId(f.coordId || (coordenacoes.length > 0 ? coordenacoes[0].id : 1));
    
    // Copy table data
    const tableCopy: FichaTableData = {};
    LOCATION_CONFIGS.forEach((loc) => {
      const existingPair = f.tableData?.[loc.key] || [0, 0];
      tableCopy[loc.key] = [existingPair[0] || 0, existingPair[1] || 0];
    });
    setEditTableData(tableCopy);
    setEditSim(f.sim || 0);
    setEditNao(f.nao || 0);
    setEditMotivo(f.motivo || '');
  };

  const handleTableInputChange = (key: string, colIndex: 0 | 1, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setEditTableData((prev) => {
      const current = prev[key] || [0, 0];
      const updated: [number, number] = [current[0], current[1]];
      updated[colIndex] = num;
      const nextTable = { ...prev, [key]: updated };

      if (colIndex === 1) {
        let totalP = 0;
        LOCATION_CONFIGS.forEach((loc) => {
          totalP += (nextTable[loc.key]?.[1] || 0);
        });
        setEditSim(totalP);
      }

      return nextTable;
    });
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFicha || !onUpdateFicha) return;
    if (!editBairro.trim()) {
      showToast('O campo Bairro é obrigatório.', 'error');
      return;
    }
    if (!editMobilizador.trim()) {
      showToast('O campo Mobilizador é obrigatório.', 'error');
      return;
    }

    setIsSavingEdit(true);
    try {
      const selectedCoord = coordenacoes.find((c) => c.id === Number(editCoordId));
      const coordNome = selectedCoord ? selectedCoord.nome : editingFicha.coordNome;

      let totLoc = 0;
      let totPess = 0;
      LOCATION_CONFIGS.forEach((loc) => {
        const pair = editTableData[loc.key] || [0, 0];
        totLoc += Number(pair[0]) || 0;
        totPess += Number(pair[1]) || 0;
      });

      await onUpdateFicha(editingFicha.id, {
        bairro: editBairro.trim(),
        data: editData,
        ronda: editRonda,
        mobilizador: editMobilizador.trim(),
        telefone: editTelefone.trim(),
        coordId: Number(editCoordId),
        coordNome,
        tableData: editTableData,
        totalLocais: totLoc,
        totalPessoas: totPess,
        sim: Number(editSim) || 0,
        nao: Number(editNao) || 0,
        motivo: editMotivo.trim(),
      });

      showToast(`Ficha de "${editMobilizador}" atualizada com sucesso!`, 'success');
      setEditingFicha(null);
      if (selectedFicha && selectedFicha.id === editingFicha.id) {
        setSelectedFicha(null);
      }
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar a ficha.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Status update handler
  const handleUpdateStatus = async (fichaId: number, newStatus: 'aprovada' | 'pendente' | 'rejeitada') => {
    if (!onUpdateFicha) return;
    try {
      await onUpdateFicha(fichaId, { status: newStatus });
      const statusLabel = newStatus === 'aprovada' ? 'Aprovada' : newStatus === 'rejeitada' ? 'Rejeitada' : 'Pendente';
      showToast(`Estado da Ficha #${fichaId} alterado para ${statusLabel}!`, 'success');
      if (selectedFicha && selectedFicha.id === fichaId) {
        setSelectedFicha((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar estado da ficha.', 'error');
    }
  };

  // Base list for user scope
  const scopedFichas = user.tipo === 'admin'
    ? fichas
    : fichas.filter((f) => f.coordId === user.coordId);

  // Status counts for quick filters
  const countOver48h = scopedFichas.filter((f) => isFichaPendingOver48h(f)).length;
  const countPendingAll = scopedFichas.filter((f) => !f.status || f.status === 'pendente').length;
  const countApproved = scopedFichas.filter((f) => f.status === 'aprovada').length;

  // Filter fichas according to role, status filter and search parameters
  const visibleFichas = scopedFichas.filter((f) => {
    const term = searchTerm.toLowerCase().trim();

    // Find associated mobilizador for ID code matching
    const matchedMob = mobilizadores.find(
      (m) =>
        (f.mobilizadorId && m.id === f.mobilizadorId) ||
        (f.mobilizador && m.nome.trim().toLowerCase() === f.mobilizador.trim().toLowerCase())
    );
    const mobCodigo = matchedMob?.codigoId || f.mobilizadorCodigoId || '';

    const matchesSearch =
      !term ||
      f.id.toString().includes(term) ||
      f.mobilizador.toLowerCase().includes(term) ||
      (mobCodigo && mobCodigo.toLowerCase().includes(term)) ||
      f.bairro.toLowerCase().includes(term) ||
      f.coordNome.toLowerCase().includes(term) ||
      (f.provincia && f.provincia.toLowerCase().includes(term)) ||
      (f.municipio && f.municipio.toLowerCase().includes(term)) ||
      (f.comuna && f.comuna.toLowerCase().includes(term)) ||
      (f.supervisorNome && f.supervisorNome.toLowerCase().includes(term)) ||
      (f.telefone && f.telefone.includes(term)) ||
      (f.status && f.status.toLowerCase().includes(term));

    const matchesDate = dateFilter ? f.data === dateFilter : true;
    const matchesRonda = rondaFilter ? (f.ronda || '1ª Ronda') === rondaFilter : true;

    let matchesStatus = true;
    if (statusFilter === 'pendente_48h') {
      matchesStatus = isFichaPendingOver48h(f);
    } else if (statusFilter === 'pendente') {
      matchesStatus = !f.status || f.status === 'pendente';
    } else if (statusFilter === 'aprovada') {
      matchesStatus = f.status === 'aprovada';
    } else if (statusFilter === 'rejeitada') {
      matchesStatus = f.status === 'rejeitada';
    }

    return matchesSearch && matchesDate && matchesRonda && matchesStatus;
  });

  const exportExcel = () => {
    const rows: any[] = [];
    visibleFichas.forEach((f) => {
      rows.push({
        Data: f.data,
        Ronda: f.ronda || '1ª Ronda',
        Mobilizador: f.mobilizador,
        Telefone: f.telefone || '—',
        Coordenação: f.coordNome,
        Província: f.provincia,
        Município: f.municipio,
        Comuna: f.comuna,
        Bairro: f.bairro,
        'Locais Visitados': f.totalLocais,
        'Pessoas Alcançadas': f.totalPessoas,
        'Aceitação SIM': f.sim,
        'Recusa NÃO': f.nao,
        'Motivo Recusa': f.motivo || '—',
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mobilizações');
    XLSX.writeFile(
      workbook,
      `SisMob_Fichas_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletingFicha) return;
    if (user.tipo !== 'admin' && deletingFicha.status === 'aprovada') {
      showToast('A ficha foi aprovada e validada pelo Administrador. Supervisores não têm permissão para eliminar fichas aprovadas.', 'error');
      setDeletingFicha(null);
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteFicha(deletingFicha.id);
      showToast(`Ficha de mobilização (${deletingFicha.bairro}) eliminada com sucesso!`, 'success');
      setDeletingFicha(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao eliminar ficha.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearTestData = async () => {
    if (!onClearTestData) return;
    setIsClearingTest(true);
    try {
      await onClearTestData();
      showToast('Dados de teste eliminados com sucesso da base de dados Firebase!', 'success');
      setIsClearTestModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Erro ao eliminar dados de teste.', 'error');
    } finally {
      setIsClearingTest(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Confirm Clear Test Data Modal */}
      <ConfirmModal
        isOpen={isClearTestModalOpen}
        user={user}
        title="Eliminar Dados de Teste da Base de Dados"
        message="Tem a certeza que deseja eliminar permanentemente todos os registos e fichas de teste da base de dados Firebase? Esta ação limpa a base de dados do sistema."
        confirmText="Eliminar Dados de Teste"
        isSubmitting={isClearingTest}
        onConfirm={handleConfirmClearTestData}
        onClose={() => setIsClearTestModalOpen(false)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingFicha}
        user={user}
        title="Eliminar Ficha de Mobilização"
        message={
          deletingFicha
            ? `Tem a certeza que deseja eliminar a ficha registada por "${deletingFicha.mobilizador}" no bairro "${deletingFicha.bairro}" (Data: ${deletingFicha.data})? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Eliminar Ficha"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingFicha(null)}
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Fichas Registadas</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Histórico completo de fichas de mobilização submetidas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => exportFichasListPDF(visibleFichas)}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100 shadow-xs"
            id="btn-export-pdf"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={exportExcel}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 shadow-xs"
            id="btn-export-excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={onRefresh}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 shadow-xs"
            id="btn-refresh-fichas"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Atualizar</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsValidacaoModalOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 text-xs font-bold text-white transition shadow-sm active:scale-95"
              id="btn-validacao-supervisor"
              title="Validação de dados lançados por supervisor"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Validação por Supervisor</span>
            </button>
          )}
          {isAdmin && onClearTestData && (
            <button
              onClick={() => setIsClearTestModalOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-3.5 text-xs font-bold text-white transition shadow-xs"
              id="btn-clear-test-data"
              title="Eliminar dados de teste do Firebase"
            >
              <Trash2 className="h-4 w-4" />
              <span>Eliminar Dados de Teste</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
            statusFilter === ''
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas ({scopedFichas.length})
        </button>

        <button
          onClick={() => setStatusFilter('pendente_48h')}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition border ${
            statusFilter === 'pendente_48h'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
          }`}
          id="btn-filter-pendentes-48h"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Pendentes +48h ({countOver48h})</span>
        </button>

        <button
          onClick={() => setStatusFilter('pendente')}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition border ${
            statusFilter === 'pendente'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Pendentes ({countPendingAll})</span>
        </button>

        <button
          onClick={() => setStatusFilter('aprovada')}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition border ${
            statusFilter === 'aprovada'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Aprovadas ({countApproved})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por mobilizador, ID, bairro, coordenação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition"
            id="input-search-fichas"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          <select
            value={rondaFilter}
            onChange={(e) => setRondaFilter(e.target.value)}
            className="h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition"
            id="select-filter-ronda"
          >
            <option value="">Todas as Rondas</option>
            <option value="1ª Ronda">1ª Ronda</option>
            <option value="2ª Ronda">2ª Ronda</option>
            <option value="3ª Ronda">3ª Ronda</option>
            <option value="4ª Ronda">4ª Ronda</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition"
            id="input-filter-date"
          />
          {(dateFilter || rondaFilter || statusFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setRondaFilter('');
                setStatusFilter('');
              }}
              className="text-xs font-medium text-blue-600 hover:underline px-1.5"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-2 sm:p-2.5">#</th>
                <th className="p-2 sm:p-2.5">Data</th>
                <th className="p-2 sm:p-2.5">Estado</th>
                <th className="p-2 sm:p-2.5">Ronda</th>
                <th className="p-2 sm:p-2.5">Mobilizador</th>
                <th className="p-2 sm:p-2.5">Coordenação</th>
                <th className="p-2 sm:p-2.5">Bairro</th>
                <th className="p-2 sm:p-2.5 text-center">Locais</th>
                <th className="p-2 sm:p-2.5 text-right">Pessoas</th>
                <th className="p-2 sm:p-2.5 text-center">SIM / NÃO</th>
                <th className="p-2 sm:p-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleFichas.map((f, i) => {
                const pending48h = isFichaPendingOver48h(f);
                const isApproved = f.status === 'aprovada';
                const isRejected = f.status === 'rejeitada';

                return (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2 sm:p-2.5 font-mono text-slate-400">{i + 1}</td>
                    <td className="p-2 sm:p-2.5 font-mono text-slate-600">{f.data}</td>
                    <td className="p-2 sm:p-2.5 font-medium">
                      <div className="relative inline-flex items-center">
                        <select
                          value={f.status || 'pendente'}
                          onChange={(e) =>
                            handleUpdateStatus(
                              f.id,
                              e.target.value as 'aprovada' | 'pendente' | 'rejeitada'
                            )
                          }
                          disabled={!onUpdateFicha}
                          className={`appearance-none cursor-pointer rounded-full pl-2.5 pr-6 py-1 text-[11px] font-extrabold border transition-all outline-none focus:ring-2 focus:ring-blue-500/30 ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                              : isRejected
                              ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-700'
                              : pending48h
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                              : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                          }`}
                          title="Clique para alterar o estado desta ficha diretamente"
                          id={`inline-status-select-${f.id}`}
                        >
                          <option value="pendente" className="bg-white text-slate-900 font-bold">
                            ⏳ Pendente {pending48h ? '(+48h)' : ''}
                          </option>
                          <option value="aprovada" className="bg-white text-emerald-800 font-bold">
                            ✅ Aprovada
                          </option>
                          <option value="rejeitada" className="bg-white text-red-800 font-bold">
                            ❌ Rejeitada
                          </option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 opacity-60 text-slate-600 dark:text-slate-300" />
                      </div>
                    </td>
                    <td className="p-2 sm:p-2.5 font-medium">
                      <span className="inline-block rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                        {f.ronda || '3ª Ronda'}
                      </span>
                    </td>
                    <td className="p-2 sm:p-2.5 font-semibold text-slate-900">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-[10px] border border-sky-200 shrink-0">
                            {f.ronda || '3ª Ronda'}
                          </span>
                          <span className="text-slate-900 font-bold">{f.mobilizador}</span>
                        </div>
                        {(() => {
                          const matchedMob = mobilizadores.find(
                            (m) =>
                              (f.mobilizadorId && m.id === f.mobilizadorId) ||
                              (f.mobilizador && m.nome.trim().toLowerCase() === f.mobilizador.trim().toLowerCase())
                          );
                          const mobCod = matchedMob?.codigoId || f.mobilizadorCodigoId;
                          if (mobCod) {
                            return (
                              <span className="inline-block w-fit font-mono text-[9px] bg-blue-50 border border-blue-200 text-blue-800 font-bold px-1 py-0.2 rounded mt-0.5">
                                ID: {mobCod}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="p-2 sm:p-2.5">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                        {f.coordNome}
                      </span>
                    </td>
                    <td className="p-2 sm:p-2.5 font-medium text-slate-700">{f.bairro}</td>
                    <td className="p-2 sm:p-2.5 text-center font-mono font-medium">{f.totalLocais}</td>
                    <td className="p-2 sm:p-2.5 text-right font-mono font-bold text-emerald-700">
                      {f.totalPessoas.toLocaleString()}
                    </td>
                    <td className="p-2 sm:p-2.5 text-center font-mono font-semibold">
                      <span className="text-emerald-700">{f.sim}</span> /{' '}
                      <span className="text-red-600">{f.nao}</span>
                    </td>
                    <td className="p-2 sm:p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && onUpdateFicha && !isApproved && (
                          <button
                            onClick={() => handleUpdateStatus(f.id, 'aprovada')}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition"
                            title="Aprovar Ficha"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => exportFichaPDF(f)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition"
                          title="Baixar PDF Oficial da Ficha"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedFicha(f)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                          title="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(() => {
                          const isFichaLockedForSupervisor = !isAdmin && isApproved;
                          return (
                            <>
                              <button
                                onClick={() => {
                                  if (isFichaLockedForSupervisor) {
                                    showToast('Ficha aprovada pelo Administrador. Supervisores não podem editar fichas validadas.', 'error');
                                    return;
                                  }
                                  handleStartEdit(f);
                                }}
                                disabled={isFichaLockedForSupervisor}
                                className={`rounded-lg p-1.5 transition ${
                                  isFichaLockedForSupervisor
                                    ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-50'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title={
                                  isFichaLockedForSupervisor
                                    ? 'Ficha aprovada pelo Administrador (Edição bloqueada)'
                                    : 'Editar Ficha'
                                }
                                id={`btn-edit-ficha-${f.id}`}
                              >
                                {isFichaLockedForSupervisor ? (
                                  <Lock className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Pencil className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (isFichaLockedForSupervisor) {
                                    showToast('Ficha aprovada pelo Administrador. Supervisores não podem eliminar fichas validadas.', 'error');
                                    return;
                                  }
                                  setDeletingFicha(f);
                                }}
                                disabled={isFichaLockedForSupervisor}
                                className={`rounded-lg p-1.5 transition ${
                                  isFichaLockedForSupervisor
                                    ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-50'
                                    : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                                }`}
                                title={
                                  isFichaLockedForSupervisor
                                    ? 'Ficha aprovada pelo Administrador (Eliminação bloqueada)'
                                    : 'Apagar Ficha'
                                }
                              >
                                {isFichaLockedForSupervisor ? (
                                  <Lock className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleFichas.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500 font-medium">
                    Nenhuma ficha encontrada com os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-[#333333]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#0B5CAD]">Detalhes da Ficha</h3>
                <p className="text-xs text-slate-600 font-semibold">
                  {selectedFicha.mobilizador} — {selectedFicha.bairro} ({selectedFicha.data} • {selectedFicha.ronda || '1ª Ronda'})
                </p>
              </div>
              <button
                onClick={() => setSelectedFicha(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Matrix Display */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
                <div>
                  <span className="text-slate-500 font-bold">Província/Município:</span>{' '}
                  {selectedFicha.provincia} / {selectedFicha.municipio}
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Coordenação:</span>{' '}
                  {selectedFicha.coordNome}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-[#0B5CAD] font-bold uppercase">
                    <tr>
                      <th className="p-2.5">Local</th>
                      <th className="p-2.5 text-center">Locais Visitados</th>
                      <th className="p-2.5 text-center">Pessoas Alcançadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {LOCATION_CONFIGS.map((loc) => {
                      const pair = selectedFicha.tableData[loc.key] || [0, 0];
                      return (
                        <tr key={loc.key}>
                          <td className="p-2 text-slate-800 font-medium">{loc.label}</td>
                          <td className="p-2 text-center font-mono text-slate-600 font-semibold">
                            {pair[0]}
                          </td>
                          <td className="p-2 text-center font-mono font-black text-[#2E7D32]">
                            {pair[1]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                <div className="font-bold text-purple-950">Respostas da Família:</div>
                <div className="mt-1 flex gap-4">
                  <span className="text-[#2E7D32] font-black">SIM: {selectedFicha.sim}</span>
                  <span className="text-red-700 font-black">NÃO: {selectedFicha.nao}</span>
                </div>
                {selectedFicha.motivo && (
                  <div className="mt-2 text-slate-700">
                    <span className="font-bold">Motivo:</span> {selectedFicha.motivo}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedFicha && exportFichaPDF(selectedFicha)}
                  className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-300 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                >
                  <FileText className="h-4 w-4" />
                  <span>Exportar PDF Oficial</span>
                </button>
                {selectedFicha && (
                  <button
                    onClick={() => {
                      const f = selectedFicha;
                      setSelectedFicha(null);
                      handleStartEdit(f);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 border border-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-600 shadow-xs"
                    id="btn-[#0B5CAD]-edit-modal"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Editar Ficha</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedFicha(null)}
                className="rounded-xl bg-[#0B5CAD] px-5 py-2 text-xs font-bold text-white hover:bg-[#084887]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ficha Modal (Admin Only) */}
      {editingFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl space-y-5 text-[#333333]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <Pencil className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0B5CAD]">
                    Modo Edição de Ficha (Administrador)
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    A alterar registo ID #{editingFicha.id} enviado por "{editingFicha.supervisorNome || editingFicha.mobilizador}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingFicha(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-5 text-xs">
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Data do Registo</label>
                  <input
                    type="date"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B5CAD]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ronda</label>
                  <select
                    value={editRonda}
                    onChange={(e) => setEditRonda(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B5CAD]"
                  >
                    <option value="1ª Ronda">1ª Ronda</option>
                    <option value="2ª Ronda">2ª Ronda</option>
                    <option value="3ª Ronda">3ª Ronda</option>
                    <option value="4ª Ronda">4ª Ronda</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Coordenação Territorial</label>
                  <select
                    value={editCoordId}
                    onChange={(e) => setEditCoordId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B5CAD]"
                  >
                    {coordenacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bairro / Comunidade</label>
                  <input
                    type="text"
                    value={editBairro}
                    onChange={(e) => setEditBairro(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B5CAD]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Mobilizador</label>
                  <input
                    type="text"
                    value={editMobilizador}
                    onChange={(e) => setEditMobilizador(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B5CAD]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contacto Telefónico</label>
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B5CAD]"
                  />
                </div>
              </div>

              {/* Matrix Data */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0B5CAD] uppercase text-[11px] tracking-wider">
                    Tabela de Mobilização (Locais Visitados e Pessoas Alcançadas)
                  </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-[#0B5CAD] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Local Visitado</th>
                        <th className="p-2.5 text-center w-36">Nº de Locais</th>
                        <th className="p-2.5 text-center w-36">Nº de Pessoas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {LOCATION_CONFIGS.map((loc) => {
                        const pair = editTableData[loc.key] || [0, 0];
                        return (
                          <tr key={loc.key} className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-800">{loc.label}</td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={pair[0]}
                                onChange={(e) => handleTableInputChange(loc.key, 0, e.target.value)}
                                className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 outline-none focus:border-[#0B5CAD]"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={pair[1]}
                                onChange={(e) => handleTableInputChange(loc.key, 1, e.target.value)}
                                className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-[#2E7D32] outline-none focus:border-[#0B5CAD]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Family Acceptance */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
                <h4 className="font-bold text-purple-900 uppercase text-[11px] tracking-wider">
                  Aceitação das Famílias
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                      Respostas SIM (Aceitação)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editSim}
                      onChange={(e) => setEditSim(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-xs font-black text-[#2E7D32] outline-none focus:border-emerald-600"
                    />
                    <p className="mt-1 text-[10px] text-emerald-700 font-semibold">
                      ✓ Preenchido com base na tabela ({Object.values(editTableData).reduce((acc, pair) => acc + (pair[1] || 0), 0)} pessoas)
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-red-800 mb-1">
                      Respostas NÃO (Recusas)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editNao}
                      onChange={(e) => setEditNao(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-xl border border-red-300 bg-white p-2.5 text-xs font-black text-red-600 outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Motivo Principal da Recusa (se houver)
                    </label>
                    <input
                      type="text"
                      value={editMotivo}
                      onChange={(e) => setEditMotivo(e.target.value)}
                      placeholder="Ex: Falta de informação, ausência de adultos..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#0B5CAD]"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingFicha(null)}
                  className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-[#084887] active:scale-95 transition disabled:opacity-50"
                  id="btn-save-ficha-edit"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingEdit ? 'A guardar...' : 'Guardar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Restriction Modal for Edit */}
      <RestrictionModal
        isOpen={showEditRestrictionModal}
        onClose={() => setShowEditRestrictionModal(false)}
        actionType="edit"
      />

      {/* Validation by Supervisor Modal */}
      <ValidacaoSupervisorModal
        isOpen={isValidacaoModalOpen}
        onClose={() => setIsValidacaoModalOpen(false)}
        currentUser={user}
        users={users}
        fichas={fichas}
        coordenacoes={coordenacoes}
        mobilizadores={mobilizadores}
        onUpdateFicha={onUpdateFicha}
        onRefresh={onRefresh}
      />
    </div>
  );
});
