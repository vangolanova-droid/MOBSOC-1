import React, { useState, useMemo } from 'react';
import {
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  FileText,
  Check,
  Search,
  Building2,
  Users,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { Ficha, User, Coordination, Mobilizador } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ValidacaoSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  fichas: Ficha[];
  coordenacoes: Coordination[];
  mobilizadores: Mobilizador[];
  onUpdateFicha?: (id: number, fields: Partial<Ficha>) => Promise<void>;
  onRefresh?: () => void;
}

export const ValidacaoSupervisorModal: React.FC<ValidacaoSupervisorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  fichas,
  coordenacoes,
  mobilizadores,
  onUpdateFicha,
  onRefresh,
}) => {
  const { showToast } = useToast();

  const [filterCoordId, setFilterCoordId] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedSupId, setExpandedSupId] = useState<number | null>(null);

  // Message modal state
  const [messagingSup, setMessagingSup] = useState<User | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [isSendingMsg, setIsSendingMsg] = useState<boolean>(false);

  // Detail view for a single ficha inside validation modal
  const [selectedFichaModal, setSelectedFichaModal] = useState<Ficha | null>(null);

  // Filter supervisors
  const supervisorsList = useMemo(() => {
    return users.filter((u) => u.tipo === 'supervisor' || u.tipo === 'user' || u.tipo === 'admin');
  }, [users]);

  // Compute supervisor statistics & validation status
  const supervisorValidationData = useMemo(() => {
    return supervisorsList
      .map((sup) => {
        // Filter mobilizadores for this supervisor or coord
        const supMobs = mobilizadores.filter(
          (m) =>
            m.supervisorId === sup.id ||
            m.supervisorNome?.toLowerCase() === sup.nome.toLowerCase() ||
            (m.coordId === sup.coordId && sup.coordId !== null)
        );

        // Fallback: If no explicit supervisor-mobilizador link, count mobilizadores in the same coord
        const totalMobsCount = supMobs.length > 0
          ? supMobs.length
          : mobilizadores.filter((m) => m.coordId === sup.coordId && sup.coordId !== null).length;

        // Filter fichas submitted by this supervisor or their mobilizadores
        const supFichas = fichas.filter((f) => {
          const matchesSup =
            f.userId === sup.id ||
            f.supervisorNome?.toLowerCase() === sup.nome.toLowerCase() ||
            (f.coordId === sup.coordId && sup.coordId !== null);

          const matchesDate = filterDate ? f.data === filterDate : true;
          const matchesCoord = filterCoordId ? String(f.coordId) === filterCoordId : true;

          return matchesSup && matchesDate && matchesCoord;
        });

        // Filtered mobilizadores names who have submitted at least 1 ficha
        const mobNamesWithFicha = new Set(supFichas.map((f) => f.mobilizador.trim().toLowerCase()));

        // Count unique active mobilizadores with fichas
        const activeMobsWithFicha = supMobs.filter((m) =>
          mobNamesWithFicha.has(m.nome.trim().toLowerCase())
        ).length;

        const totalFichasCount = supFichas.length;
        const pendingFichas = supFichas.filter((f) => f.status !== 'aprovada' && f.status !== 'rejeitada');
        const approvedFichas = supFichas.filter((f) => f.status === 'aprovada');
        const rejectedFichas = supFichas.filter((f) => f.status === 'rejeitada');

        // Target comparison: compares total expected mobilizadores vs fichas/mobilizadores submitted
        const isConcluido = totalMobsCount > 0
          ? totalFichasCount >= totalMobsCount || (activeMobsWithFicha >= totalMobsCount && pendingFichas.length === 0)
          : totalFichasCount > 0 && pendingFichas.length === 0;

        const percent = totalMobsCount > 0
          ? Math.min(100, Math.round((totalFichasCount / totalMobsCount) * 100))
          : totalFichasCount > 0 ? 100 : 0;

        return {
          supervisor: sup,
          coordNome: sup.coordNome || coordenacoes.find((c) => c.id === sup.coordId)?.nome || 'Direção Geral',
          totalMobilizadores: totalMobsCount,
          activeMobilizadores: activeMobsWithFicha,
          totalFichas: totalFichasCount,
          pendingFichasCount: pendingFichas.length,
          approvedFichasCount: approvedFichas.length,
          rejectedFichasCount: rejectedFichas.length,
          isConcluido,
          percent,
          fichas: supFichas,
          mobilizadores: supMobs,
        };
      })
      .filter((item) => {
        if (filterCoordId && String(item.supervisor.coordId) !== filterCoordId) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            item.supervisor.nome.toLowerCase().includes(term) ||
            item.supervisor.email.toLowerCase().includes(term) ||
            item.coordNome.toLowerCase().includes(term)
          );
        }
        return true;
      });
  }, [supervisorsList, mobilizadores, fichas, filterDate, filterCoordId, searchTerm, coordenacoes]);

  // Overall statistics summary
  const totalSupervisores = supervisorValidationData.length;
  const concluidosCount = supervisorValidationData.filter((s) => s.isConcluido).length;
  const pendentesCount = supervisorValidationData.filter((s) => !s.isConcluido).length;

  // Open Message Modal prefilled
  const handleOpenMessageModal = (sup: User, coordNome: string, totalMobs: number, totalFichas: number) => {
    setMessagingSup(sup);
    setMessageText(
      `AVISO DE VALIDAÇÃO DE DADOS: A sua coordenação "${coordNome}" possui ${totalMobs} mobilizador(es) alocado(s), mas apenas ${totalFichas} ficha(s) foram registada(s)${filterDate ? ` para o dia ${filterDate}` : ''}. Por favor verifique os lançamentos em falta e conclua o registo de todas as fichas.`
    );
  };

  // Send Admin Warning Message
  const handleSendMessage = async () => {
    if (!messagingSup || !messageText.trim()) return;
    setIsSendingMsg(true);
    try {
      const newMsg = {
        id: Date.now(),
        supervisorId: messagingSup.id,
        supervisorNome: messagingSup.nome,
        dataAtraso: filterDate || new Date().toISOString().split('T')[0],
        mensagem: messageText.trim(),
        enviadoEm: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      };

      await api.addAdminMessage(newMsg);
      showToast(`Mensagem de aviso enviada com sucesso para o supervisor ${messagingSup.nome}!`, 'success');
      setMessagingSup(null);
      setMessageText('');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar mensagem para o supervisor.', 'error');
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Approve all pending fichas for a supervisor
  const handleApproveAllForSupervisor = async (supFichas: Ficha[], supName: string) => {
    if (!onUpdateFicha) return;
    const pending = supFichas.filter((f) => f.status !== 'aprovada');
    if (pending.length === 0) {
      showToast('Não existem fichas pendentes para este supervisor.', 'info');
      return;
    }

    try {
      for (const ficha of pending) {
        await onUpdateFicha(ficha.id, { status: 'aprovada' });
      }
      showToast(`Todas as ${pending.length} ficha(s) do supervisor ${supName} foram aprovadas com sucesso!`, 'success');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao aprovar fichas.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Validação de Dados por Supervisor</span>
                <span className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 border border-blue-200 dark:border-blue-800">
                  Geral
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare o número de mobilizadores alocados vs. fichas lançadas por cada supervisor, analise o estado de conclusão e envie avisos diretos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters & KPI Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          
          {/* Top Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisores Avaliados</p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white">{totalSupervisores}</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Lançamentos Concluídos</p>
                <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{concluidosCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Incompletos / Pendentes</p>
                <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">{pendentesCount}</p>
              </div>
            </div>
          </div>

          {/* Filters Inputs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome do supervisor ou coordenação..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[180px]">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={filterCoordId}
                onChange={(e) => setFilterCoordId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">Todas as Coordenações</option>
                {coordenacoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 min-w-[150px]">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {(filterCoordId || filterDate || searchTerm) && (
              <button
                onClick={() => {
                  setFilterCoordId('');
                  setFilterDate('');
                  setSearchTerm('');
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Body Content - List of Supervisors */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {supervisorValidationData.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
              <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum supervisor encontrado com os filtros aplicados
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tente ajustar os critérios de pesquisa ou limpar os filtros.
              </p>
            </div>
          ) : (
            supervisorValidationData.map((item) => {
              const isExpanded = expandedSupId === item.supervisor.id;

              return (
                <div
                  key={item.supervisor.id}
                  className={`rounded-2xl border transition shadow-xs ${
                    item.isConcluido
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900'
                      : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                  }`}
                >
                  {/* Supervisor Card Header */}
                  <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* Left Info */}
                    <div className="flex items-center gap-3.5 min-w-[260px]">
                      <div className="relative">
                        {item.supervisor.fotoUrl ? (
                          <img
                            src={item.supervisor.fotoUrl}
                            alt={item.supervisor.nome}
                            className="h-11 w-11 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold text-sm border border-blue-200 dark:border-blue-800">
                            {item.supervisor.nome.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            item.isConcluido ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {item.supervisor.nome}
                          </h3>
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {item.coordNome}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.supervisor.email}
                        </p>
                      </div>
                    </div>

                    {/* Middle Metrics Comparison */}
                    <div className="flex-1 w-full md:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                      
                      {/* Mobilizadores count */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Mobilizadores</span>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          {item.totalMobilizadores}{' '}
                          <span className="text-[10px] font-medium text-slate-500">alocado(s)</span>
                        </p>
                      </div>

                      {/* Fichas Lançadas */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Fichas Lançadas</span>
                        <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                          {item.totalFichas}{' '}
                          <span className="text-[10px] font-medium text-slate-500">registada(s)</span>
                        </p>
                      </div>

                      {/* Fichas Pendentes */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Aprovação</span>
                        <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                          {item.pendingFichasCount}{' '}
                          <span className="text-[10px] font-medium text-slate-500">pendente(s)</span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Estado Conclusão</span>
                        <div className="mt-0.5">
                          {item.isConcluido ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Concluído
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="h-3 w-3" />
                              Incompleto
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-3 md:pt-0">
                      {!item.isConcluido && (
                        <button
                          onClick={() =>
                            handleOpenMessageModal(
                              item.supervisor,
                              item.coordNome,
                              item.totalMobilizadores,
                              item.totalFichas
                            )
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-bold text-white transition shadow-2xs"
                          title="Mandar mensagem de aviso ao supervisor"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Notificar</span>
                        </button>
                      )}

                      {item.pendingFichasCount > 0 && onUpdateFicha && (
                        <button
                          onClick={() => handleApproveAllForSupervisor(item.fichas, item.supervisor.nome)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition shadow-2xs"
                          title="Aprovar todas as fichas deste supervisor"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Aprovar Todas ({item.pendingFichasCount})</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedSupId(isExpanded ? null : item.supervisor.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>{isExpanded ? 'Ocultar Fichas' : `Ver Fichas (${item.totalFichas})`}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                  </div>

                  {/* Expanded Section - List of Fichas submitted by this supervisor */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-b-2xl space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span>Fichas Registadas pelo Supervisor e Mobilizadores ({item.totalFichas})</span>
                        </h4>
                        <span className="text-xs text-slate-500">
                          Aprovadas: {item.approvedFichasCount} | Rejeitadas: {item.rejectedFichasCount} | Pendentes: {item.pendingFichasCount}
                        </span>
                      </div>

                      {item.fichas.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                          <p className="text-xs font-bold text-slate-500">
                            Nenhuma ficha registada para este supervisor no período selecionado.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                              <tr>
                                <th className="p-3">ID / Data</th>
                                <th className="p-3">Mobilizador</th>
                                <th className="p-3">Bairro / Ronda</th>
                                <th className="p-3 text-center">Locais</th>
                                <th className="p-3 text-center">Pessoas</th>
                                <th className="p-3 text-center">Vacinação (Sim / Não)</th>
                                <th className="p-3 text-center">Estado</th>
                                <th className="p-3 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                              {item.fichas.map((f) => (
                                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                  <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                                    #{f.id}
                                    <div className="text-[10px] font-medium text-slate-400">{f.data}</div>
                                  </td>
                                  <td className="p-3 font-semibold">
                                    {f.mobilizador}
                                    {f.mobilizadorCodigoId && (
                                      <div className="text-[10px] text-blue-600 font-bold">{f.mobilizadorCodigoId}</div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {f.bairro}
                                    <div className="text-[10px] text-slate-400">{f.ronda || '1ª Ronda'}</div>
                                  </td>
                                  <td className="p-3 text-center font-bold">{f.totalLocais}</td>
                                  <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{f.totalPessoas}</td>
                                  <td className="p-3 text-center">
                                    <span className="text-emerald-600 font-bold">{f.sim} Sim</span> /{' '}
                                    <span className="text-red-500 font-bold">{f.nao} Não</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {f.status === 'aprovada' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                                        <CheckCircle2 className="h-3 w-3" /> Aprovada
                                      </span>
                                    ) : f.status === 'rejeitada' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                                        <X className="h-3 w-3" /> Rejeitada
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                        <Clock className="h-3 w-3" /> Pendente
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {onUpdateFicha && f.status !== 'aprovada' && (
                                        <button
                                          onClick={async () => {
                                            await onUpdateFicha(f.id, { status: 'aprovada' });
                                            showToast(`Ficha #${f.id} aprovada!`, 'success');
                                            if (onRefresh) onRefresh();
                                          }}
                                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white transition shadow-2xs"
                                        >
                                          Aprovar
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setSelectedFichaModal(f)}
                                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                                      >
                                        Detalhes
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900">
          <p className="text-xs text-slate-500">
            A validação por supervisor garante que todas as fichas lançadas correspondem exatamente ao número de mobilizadores de campo.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-2xs"
          >
            Fechar Validação
          </button>
        </div>

      </div>

      {/* Direct Message Modal to Supervisor */}
      {messagingSup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <span>Notificar Supervisor: {messagingSup.nome}</span>
              </h3>
              <button
                onClick={() => setMessagingSup(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mensagem de Aviso de Lançamento Incompleto:
              </label>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMessagingSup(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                disabled={isSendingMsg || !messageText.trim()}
                onClick={handleSendMessage}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition shadow-2xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingMsg ? 'A Enviar...' : 'Enviar Notificação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ficha Details Sub-Modal */}
      {selectedFichaModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Detalhes da Ficha #{selectedFichaModal.id}</span>
              </h3>
              <button
                onClick={() => setSelectedFichaModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-500">Mobilizador:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{selectedFichaModal.mobilizador}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Coordenação:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{selectedFichaModal.coordNome}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Bairro:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{selectedFichaModal.bairro}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Data:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{selectedFichaModal.data}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Total Locais:</span>{' '}
                <span className="font-extrabold text-slate-900 dark:text-white">{selectedFichaModal.totalLocais}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Total Pessoas:</span>{' '}
                <span className="font-extrabold text-blue-600 dark:text-blue-400">{selectedFichaModal.totalPessoas}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedFichaModal(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
