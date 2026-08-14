import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import {
  UserPlus,
  Trash2,
  Search,
  MapPin,
  Phone,
  Briefcase,
  Building2,
  UserCheck,
  Pencil,
  X,
  Users,
  Layers,
  List,
  UserCheck2,
  Wallet,
  Coins,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  CheckCheck,
  BellRing,
  Send,
  Loader2,
} from 'lucide-react';
import { Coordination, Ficha, Mobilizador, User } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';
import { RestrictionModal } from './RestrictionModal';
import { exportFinancasPDF } from '../utils/pdfExporter';
import { exportFinancasExcel } from '../utils/excelExporter';

interface MobilizadoresViewProps {
  user: User;
  users?: User[];
  mobilizadores: Mobilizador[];
  coordenacoes: Coordination[];
  fichas?: Ficha[];
  initialFocusRegister?: boolean;
  initialTab?: 'geral' | 'supervisor' | 'coordenacao' | 'financas';
  onCreateMobilizador: (mobPartial: Partial<Mobilizador>) => Promise<void>;
  onUpdateMobilizador?: (id: number, fields: Partial<Mobilizador>) => Promise<void>;
  onDeleteMobilizador: (id: number) => Promise<void>;
}

export const MobilizadoresView: React.FC<MobilizadoresViewProps> = React.memo(({
  user,
  users = [],
  mobilizadores,
  coordenacoes,
  fichas = [],
  initialFocusRegister = false,
  initialTab = 'geral',
  onCreateMobilizador,
  onUpdateMobilizador,
  onDeleteMobilizador,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';

  // Form states
  const [nome, setNome] = useState('');
  const [morada, setMorada] = useState('');
  const [telefone, setTelefone] = useState('');
  const [numeroEquipa, setNumeroEquipa] = useState('');
  const [funcao] = useState('Mobilizador Comunitário');
  const [ronda, setRonda] = useState<string>(() => {
    if (!isAdmin && user.ronda) return user.ronda;
    return '3ª Ronda';
  });
  const [coordId, setCoordId] = useState<number>(() => {
    if (!isAdmin && user.coordId) return user.coordId;
    return coordenacoes.length > 0 ? coordenacoes[0].id : 1;
  });
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'geral' | 'supervisor' | 'coordenacao' | 'financas'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      if (initialTab === 'financas' && !isAdmin) {
        setActiveTab('geral');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, isAdmin]);

  // Auto scroll to form if initialFocusRegister is true
  React.useEffect(() => {
    if (initialFocusRegister) {
      const formEl = document.getElementById('form-cadastrar-mobilizador');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [initialFocusRegister]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial control state (5.000 Kz default per ficha / day worked)
  const [diarioRate, setDiarioRate] = useState<number>(5000);
  const [financasStatusFilter, setFinancasStatusFilter] = useState<'todos' | 'com_fichas' | 'sem_fichas' | 'pendente' | 'pago'>('todos');
  const [paymentStatuses, setPaymentStatuses] = useState<Record<number, 'pendente' | 'pago'>>({});

  useEffect(() => {
    api.getPaymentStatuses().then((statuses) => setPaymentStatuses(statuses));
  }, []);

  const togglePaymentStatus = async (mobId: number) => {
    const current = paymentStatuses[mobId] || 'pendente';
    const next = current === 'pago' ? 'pendente' : 'pago';
    const updated = { ...paymentStatuses, [mobId]: next as 'pendente' | 'pago' };
    setPaymentStatuses(updated);
    await api.savePaymentStatuses(updated);
    showToast(`Estado de pagamento alterado para "${next.toUpperCase()}"`, 'info');
  };

  // Notification modal for pendencies (< 4 fichas)
  const [showNotificarPendenciasModal, setShowNotificarPendenciasModal] = useState(false);
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Auto-validation rule: 4 or more fichas = PAGO, less than 4 fichas = PENDENTE
  const handleValidar4Fichas = async () => {
    let pagoCount = 0;
    let pendenteCount = 0;
    const updated: Record<number, 'pendente' | 'pago'> = { ...paymentStatuses };

    mobilizadores.forEach((mob) => {
      const mobF = fichas.filter(
        (f) =>
          (f.mobilizadorId && f.mobilizadorId === mob.id) ||
          (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
      );
      const count = mobF.length;

      if (count >= 4) {
        updated[mob.id] = 'pago';
        pagoCount++;
      } else {
        updated[mob.id] = 'pendente';
        pendenteCount++;
      }
    });

    setPaymentStatuses(updated);
    await api.savePaymentStatuses(updated);
    showToast(
      `Validação de 4 Fichas executada! ${pagoCount} mobilizadores com 4+ fichas foram marcados como PAGO. ${pendenteCount} ficaram PENDENTES.`,
      'success'
    );
  };

  // Calculate mobilizadores with < 4 fichas
  const pendingMobilizadoresList = useMemo(() => {
    return mobilizadores
      .map((mob) => {
        const mobF = fichas.filter(
          (f) =>
            (f.mobilizadorId && f.mobilizadorId === mob.id) ||
            (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
        );
        return {
          mob,
          count: mobF.length,
        };
      })
      .filter((item) => item.count < 4);
  }, [mobilizadores, fichas]);

  // Group mobilizadores with < 4 fichas by Supervisor
  const pendingBySupervisor = useMemo(() => {
    const groups: Record<
      string,
      {
        supervisorNome: string;
        coordNome: string;
        supervisorId?: number;
        mobilizadores: Array<{ mob: Mobilizador; count: number }>;
      }
    > = {};

    pendingMobilizadoresList.forEach((item) => {
      const supNome = item.mob.supervisorNome || 'Supervisor Geral';
      const coordNome = item.mob.coordNome || 'Sem Coordenação';

      const supUser = users.find(
        (u) => u.tipo === 'supervisor' && u.nome.trim().toLowerCase() === supNome.trim().toLowerCase()
      );

      const key = `${coordNome}_${supNome}`;
      if (!groups[key]) {
        groups[key] = {
          supervisorNome: supNome,
          coordNome,
          supervisorId: supUser ? supUser.id : undefined,
          mobilizadores: [],
        };
      }
      groups[key].mobilizadores.push(item);
    });

    return Object.values(groups);
  }, [pendingMobilizadoresList, users]);

  // Send alert to a specific supervisor
  const handleNotificarSupervisorGroup = async (group: {
    supervisorNome: string;
    coordNome: string;
    supervisorId?: number;
    mobilizadores: Array<{ mob: Mobilizador; count: number }>;
  }) => {
    const mobListStr = group.mobilizadores.map((m) => `${m.mob.nome} (${m.count}/4 fichas)`).join(', ');
    const msgText = `AVISO DE PENDÊNCIA FINANCEIRA: Os seguintes mobilizadores sob sua supervisão (${group.coordNome}) não atingiram as 4 fichas completas e estão PENDENTES: ${mobListStr}. Por favor, regularize o lançamento de fichas.`;

    const newMsg = {
      id: Date.now() + Math.random(),
      supervisorId: group.supervisorId || 0,
      supervisorNome: group.supervisorNome,
      dataAtraso: new Date().toLocaleDateString('pt-PT'),
      mensagem: msgText,
      enviadoEm: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    };

    await api.addAdminMessage(newMsg);
    showToast(`Notificação enviada com sucesso para o supervisor ${group.supervisorNome}!`, 'success');
  };

  // Send alert to all supervisors with pendencies
  const handleNotificarTodosSupervisores = async () => {
    if (pendingBySupervisor.length === 0) {
      showToast('Não existem mobilizadores com pendências (< 4 fichas).', 'info');
      return;
    }

    setIsSendingNotif(true);
    try {
      for (const group of pendingBySupervisor) {
        await handleNotificarSupervisorGroup(group);
      }
      showToast('Notificações enviadas a todos os supervisores com pendências!', 'success');
      setShowNotificarPendenciasModal(false);
    } catch {
      showToast('Erro ao enviar notificações.', 'error');
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Quick single notification for a specific mobilizador's supervisor
  const handleNotifySingleMobSupervisor = async (mob: Mobilizador, count: number) => {
    const supNome = mob.supervisorNome || 'Supervisor Geral';
    const supUser = users.find(
      (u) => u.tipo === 'supervisor' && u.nome.trim().toLowerCase() === supNome.trim().toLowerCase()
    );

    const msgText = `AVISO DE PENDÊNCIA INDIVIDUAL: O mobilizador ${mob.nome} (${mob.coordNome || 'Coordenação'}) apresenta apenas ${count}/4 fichas completas e encontra-se PENDENTE. Por favor complete os lançamentos.`;

    const newMsg = {
      id: Date.now() + Math.random(),
      supervisorId: supUser ? supUser.id : 0,
      supervisorNome: supNome,
      dataAtraso: new Date().toLocaleDateString('pt-PT'),
      mensagem: msgText,
      enviadoEm: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    };

    await api.addAdminMessage(newMsg);
    showToast(`Notificação enviada para ${supNome} referente a ${mob.nome}!`, 'success');
  };

  // Delete modal state
  const [deletingMob, setDeletingMob] = useState<Mobilizador | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit modal state
  const [editingMob, setEditingMob] = useState<Mobilizador | null>(null);
  const [showEditRestrictionModal, setShowEditRestrictionModal] = useState(false);
  const [editCodigoId, setEditCodigoId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editMorada, setEditMorada] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editNumeroEquipa, setEditNumeroEquipa] = useState('');
  const [editFuncao, setEditFuncao] = useState('Mobilizador Comunitário');
  const [editRonda, setEditRonda] = useState('1ª Ronda');
  const [editCoordId, setEditCoordId] = useState<number>(1);

  // Auto-calculated preview ID for new registration
  const nextPreviewCodigoId = useMemo(() => {
    const prefix = 'MT0022';
    let maxNum = 0;
    for (const m of mobilizadores) {
      if (m.codigoId) {
        const match = m.codigoId.match(/MT0022(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : mobilizadores.length + 1;
    return `${prefix}${String(nextNum).padStart(2, '0')}`;
  }, [mobilizadores]);

  const handleOpenEditModal = (mob: Mobilizador) => {
    if (!isAdmin) {
      setShowEditRestrictionModal(true);
      return;
    }
    setEditingMob(mob);
    setEditCodigoId(mob.codigoId || '');
    setEditNome(mob.nome);
    setEditMorada(mob.morada || '');
    setEditTelefone(mob.telefone || '');
    setEditNumeroEquipa(mob.numeroEquipa || '');
    setEditFuncao(mob.funcao || 'Mobilizador Comunitário');
    setEditRonda(mob.ronda || '1ª Ronda');
    setEditCoordId(mob.coordId || (coordenacoes.length > 0 ? coordenacoes[0].id : 1));
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMob || !editNome.trim() || !onUpdateMobilizador) return;

    const selectedCoord = coordenacoes.find((c) => c.id === Number(editCoordId));
    const coordNome = selectedCoord ? selectedCoord.nome : editingMob.coordNome || '—';

    setIsSubmitting(true);
    try {
      await onUpdateMobilizador(editingMob.id, {
        codigoId: editCodigoId.trim() || editingMob.codigoId,
        nome: editNome.trim(),
        morada: editMorada.trim(),
        telefone: editTelefone.trim(),
        numeroEquipa: editNumeroEquipa.trim(),
        funcao: editFuncao.trim() || 'Mobilizador Comunitário',
        ronda: editRonda,
        coordId: Number(editCoordId),
        coordNome,
      });

      showToast(`Dados do mobilizador "${editNome.trim()}" atualizados com sucesso!`, 'success');
      setEditingMob(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar mobilizador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter mobilizadores based on role & search term
  const visibleMobilizadores = mobilizadores.filter((m) => {
    const isRegisteredBySelf = isAdmin
      ? true
      : m.supervisorId
      ? m.supervisorId === user.id
      : m.coordId === user.coordId;

    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      m.nome.toLowerCase().includes(searchLower) ||
      (m.codigoId && m.codigoId.toLowerCase().includes(searchLower)) ||
      m.id.toString().includes(searchLower) ||
      m.morada.toLowerCase().includes(searchLower) ||
      m.telefone.includes(searchLower) ||
      m.funcao.toLowerCase().includes(searchLower) ||
      (m.ronda && m.ronda.toLowerCase().includes(searchLower)) ||
      (m.coordNome && m.coordNome.toLowerCase().includes(searchLower)) ||
      (m.supervisorNome && m.supervisorNome.toLowerCase().includes(searchLower));

    return isRegisteredBySelf && matchesSearch;
  });

  // Sort mobilizadores by Coordination, Supervisor, then Name (Keep members of same coordination/supervisor together)
  const sortedMobilizadores = useMemo(() => {
    return [...visibleMobilizadores].sort((a, b) => {
      const coordA = a.coordNome || '';
      const coordB = b.coordNome || '';
      if (coordA !== coordB) return coordA.localeCompare(coordB);

      const supA = a.supervisorNome || '';
      const supB = b.supervisorNome || '';
      if (supA !== supB) return supA.localeCompare(supB);

      return a.nome.localeCompare(b.nome);
    });
  }, [visibleMobilizadores]);

  // Group by Supervisor
  const supervisorGroups = useMemo(() => {
    const groups: { [key: string]: { supervisorNome: string; coordNome: string; mobs: Mobilizador[] } } = {};
    sortedMobilizadores.forEach((mob) => {
      const supName = mob.supervisorNome || 'Sem Supervisor Atribuído';
      if (!groups[supName]) {
        groups[supName] = {
          supervisorNome: supName,
          coordNome: mob.coordNome || '—',
          mobs: [],
        };
      }
      groups[supName].mobs.push(mob);
    });
    return Object.values(groups);
  }, [sortedMobilizadores]);

  // Group by Coordination
  const coordinationGroups = useMemo(() => {
    const groups: { [key: string]: { coordNome: string; mobs: Mobilizador[] } } = {};
    sortedMobilizadores.forEach((mob) => {
      const coordName = mob.coordNome || 'Sem Coordenação Atribuída';
      if (!groups[coordName]) {
        groups[coordName] = {
          coordNome: coordName,
          mobs: [],
        };
      }
      groups[coordName].mobs.push(mob);
    });
    return Object.values(groups);
  }, [sortedMobilizadores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('Por favor introduza o nome do mobilizador.', 'error');
      return;
    }

    const selectedCoord = coordenacoes.find((c) => c.id === Number(coordId));
    const coordNome = selectedCoord ? selectedCoord.nome : user.coordNome || '—';

    const selectedSup = users.find((u) => u.id === selectedSupervisorId);
    const assignedSupervisorId = isAdmin ? (selectedSup ? selectedSup.id : undefined) : user.id;
    const assignedSupervisorNome = isAdmin ? (selectedSup ? selectedSup.nome : 'Sem Supervisor Atribuído') : user.nome;

    setIsSubmitting(true);
    try {
      await onCreateMobilizador({
        codigoId: nextPreviewCodigoId,
        nome: nome.trim(),
        morada: morada.trim(),
        telefone: telefone.trim(),
        numeroEquipa: numeroEquipa.trim(),
        funcao: 'Mobilizador Comunitário',
        ronda: ronda || '1ª Ronda',
        coordId: Number(coordId),
        coordNome,
        supervisorId: assignedSupervisorId,
        supervisorNome: assignedSupervisorNome,
      });

      showToast(`Mobilizador "${nome.trim()}" (ID: ${nextPreviewCodigoId}) registado com sucesso!`, 'success');

      // Clear form
      setNome('');
      setMorada('');
      setTelefone('');
      setNumeroEquipa('');
      setRonda(!isAdmin && user.ronda ? user.ronda : '1ª Ronda');
      setSelectedSupervisorId(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao registar mobilizador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMob) return;
    setIsDeleting(true);
    try {
      await onDeleteMobilizador(deletingMob.id);
      showToast(`Mobilizador "${deletingMob.nome}" eliminado com sucesso!`, 'success');
      setDeletingMob(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao eliminar mobilizador.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingMob}
        user={user}
        title="Eliminar Mobilizador"
        message={
          deletingMob
            ? `Tem a certeza que deseja eliminar o mobilizador "${deletingMob.nome}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmText="Eliminar Mobilizador"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingMob(null)}
      />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <span>Gestão RH-MC — Mobilizadores Comunitários</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Registo de Recursos Humanos e Mobilizadores Comunitários (RH-MC) da campanha com identificação de Ronda, Morada, Contactos, Supervisor e Coordenação Territorial.
        </p>
      </div>

      {/* Cadastro Form Card (Hidden in Finanças view) */}
      {activeTab !== 'financas' && (
        <div id="form-cadastrar-mobilizador" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Cadastrar Novo Mobilizador</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-xs font-mono font-bold text-blue-700">
              <span>ID a gerar:</span>
              <span className="text-blue-900 font-extrabold">{nextPreviewCodigoId}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Nome do Mobilizador <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Afonso Pedro Neto"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="input-mob-nome"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Morada / Endereço
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  placeholder="Ex: Bairro 15 de Março, Sumbe"
                  value={morada}
                  onChange={(e) => setMorada(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-mob-morada"
                />
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Contacto Telefónico
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  placeholder="9XX XXX XXX"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-mob-telefone"
                />
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Número da Equipa <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  required
                  placeholder="Ex: Equipa 01 (Atribuído pela Direção)"
                  value={numeroEquipa}
                  onChange={(e) => setNumeroEquipa(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-mob-equipa"
                />
                <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Função do Sistema (Específica)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  readOnly
                  value="Mobilizador Comunitário"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3.5 text-xs font-bold text-slate-700 cursor-not-allowed outline-none"
                  id="input-mob-funcao"
                />
                <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Ronda da Campanha <span className="text-red-500">*</span>
              </label>
              <select
                value={ronda}
                onChange={(e) => setRonda(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="select-mob-ronda"
              >
                <option value="1ª Ronda">1ª Ronda</option>
                <option value="2ª Ronda">2ª Ronda</option>
                <option value="3ª Ronda">3ª Ronda</option>
                <option value="4ª Ronda">4ª Ronda</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Coordenação de Pertença
              </label>
              {isAdmin ? (
                <select
                  value={coordId}
                  onChange={(e) => setCoordId(Number(e.target.value))}
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="select-mob-coord"
                >
                  {coordenacoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    readOnly
                    value={
                      coordenacoes.find((c) => c.id === user.coordId)?.nome ||
                      user.coordNome ||
                      '—'
                    }
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3.5 text-xs font-medium text-slate-600 cursor-not-allowed outline-none"
                  />
                  <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              )}
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Supervisor Responsável
                </label>
                <select
                  value={selectedSupervisorId || ''}
                  onChange={(e) => {
                    const supId = e.target.value ? Number(e.target.value) : null;
                    setSelectedSupervisorId(supId);
                    if (supId) {
                      const sup = users.find((u) => u.id === supId);
                      if (sup?.ronda) {
                        setRonda(sup.ronda);
                      }
                    }
                  }}
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="select-mob-supervisor"
                >
                  <option value="">-- Selecionar Supervisor --</option>
                  {users
                    .filter((u) => u.tipo === 'supervisor' && u.status === 'ativo')
                    .map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nome} ({sup.ronda || '1ª Ronda'}) - {sup.coordNome || 'Sem Coord.'}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all duration-200 active:scale-[0.99] ${
                  isSubmitting
                    ? 'bg-blue-700 cursor-wait opacity-95 ring-2 ring-blue-400/50'
                    : 'bg-[#00B2FF] hover:bg-[#009ee3]'
                }`}
                id="btn-salvar-mobilizador"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>A processar ({ronda})...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Registar Mobilizador</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Mobilizadores Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        {/* Top bar with Title, Search and Sub-tabs */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Mobilizadores Registados ({visibleMobilizadores.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? 'Agrupados por coordenação e supervisor com numeração ordinal'
                : `Mobilizadores de ${user.coordNome || 'sua coordenação'}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Selector Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'geral'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Lista Geral ({sortedMobilizadores.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('supervisor')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'supervisor'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <UserCheck2 className="h-3.5 w-3.5" />
                <span>Por Supervisor ({supervisorGroups.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('coordenacao')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'coordenacao'
                    ? 'bg-white text-purple-700 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Por Coordenação ({coordinationGroups.length})</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('financas')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                    activeTab === 'financas'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'hover:text-slate-900 text-emerald-700 bg-emerald-50 border border-emerald-200'
                  }`}
                  id="btn-tab-financas"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Finanças & Subsídios</span>
                </button>
              )}
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome, ID (ex: MT002201)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition"
                id="input-search-mobilizadores"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: LISTA GERAL (# 1 a N) */}
        {activeTab === 'geral' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5">ID Código</th>
                  <th className="p-3.5">Nome do Mobilizador</th>
                  <th className="p-3.5">Ronda</th>
                  <th className="p-3.5">Morada</th>
                  <th className="p-3.5">Telefone</th>
                  <th className="p-3.5">Equipa</th>
                  <th className="p-3.5">Função</th>
                  <th className="p-3.5">Coordenação</th>
                  <th className="p-3.5">Supervisor Responsável</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedMobilizadores.map((mob, index) => (
                  <tr key={mob.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center font-mono font-medium text-slate-400 bg-slate-50/50">
                      {index + 1}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-block font-mono font-bold text-xs bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-lg">
                        {mob.codigoId || `MT0022${String(index + 1).padStart(2, '0')}`}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shrink-0">
                        {mob.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-[10px] border border-sky-200">
                            {mob.ronda || '3ª Ronda'}
                          </span>
                          <span>{mob.nome}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium">
                      <span className="inline-block rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-700 font-bold">
                        {mob.ronda || '3ª Ronda'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">{mob.morada || '—'}</td>
                    <td className="p-3.5 font-mono text-emerald-700 font-semibold">{mob.telefone || '—'}</td>
                    <td className="p-3.5 font-semibold">
                      {mob.numeroEquipa ? (
                        <span className="inline-block rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                          {mob.numeroEquipa}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {mob.funcao}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{mob.coordNome || '—'}</td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {mob.supervisorNome ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                          👤 {mob.supervisorNome}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(mob)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Editar Mobilizador"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingMob(mob)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          title="Eliminar Mobilizador"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {sortedMobilizadores.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                      Nenhum mobilizador registado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: POR SUPERVISOR (NUMERANDO DE 1 A O ÚLTIMO POR SUPERVISOR) */}
        {activeTab === 'supervisor' && (
          <div className="space-y-6">
            {supervisorGroups.map((group) => (
              <div
                key={group.supervisorNome}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-[#2E7D32] font-black text-sm">
                      👤
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Supervisor: {group.supervisorNome}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Coordenação: <span className="font-semibold text-[#0B5CAD]">{group.coordNome}</span>
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#2E7D32]/10 border border-[#2E7D32]/30 px-3 py-1 text-xs font-black text-[#2E7D32]">
                    Total: {group.mobs.length} Mobilizador{group.mobs.length !== 1 ? 'es' : ''} (1 a {group.mobs.length})
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-white text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-12 text-center bg-emerald-50 text-[#2E7D32]">#</th>
                        <th className="p-2.5 bg-emerald-50 text-[#2E7D32]">ID Código</th>
                        <th className="p-2.5">Nome do Mobilizador</th>
                        <th className="p-2.5">Ronda</th>
                        <th className="p-2.5">Morada</th>
                        <th className="p-2.5">Telefone</th>
                        <th className="p-2.5">Equipa</th>
                        <th className="p-2.5">Função</th>
                        <th className="p-2.5">Coordenação</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {group.mobs.map((mob, index) => (
                        <tr key={mob.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 text-center font-mono font-black text-[#2E7D32] bg-emerald-50/50">
                            {index + 1}
                          </td>
                          <td className="p-2.5">
                            <span className="inline-block font-mono font-bold text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md">
                              {mob.codigoId || `MT0022${String(index + 1).padStart(2, '0')}`}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">{mob.nome}</td>
                          <td className="p-2.5 font-bold">
                            <span className="inline-block rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] text-purple-700">
                              {mob.ronda || '1ª Ronda'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{mob.morada || '—'}</td>
                          <td className="p-2.5 font-mono text-[#2E7D32] font-bold">{mob.telefone || '—'}</td>
                          <td className="p-2.5 font-bold">
                            {mob.numeroEquipa ? (
                              <span className="inline-block rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                {mob.numeroEquipa}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600">{mob.funcao}</td>
                          <td className="p-2.5 text-slate-600">{mob.coordNome || '—'}</td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(mob)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-[#0B5CAD]"
                                title="Editar Mobilizador"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingMob(mob)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Eliminar Mobilizador"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {supervisorGroups.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                Nenhum supervisor com mobilizadores registados.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POR COORDENAÇÃO (NUMERANDO DE 1 A O ÚLTIMO POR COORDENAÇÃO) */}
        {activeTab === 'coordenacao' && (
          <div className="space-y-6">
            {coordinationGroups.map((group) => (
              <div
                key={group.coordNome}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#0B5CAD] font-black text-sm">
                      🏛️
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#0B5CAD]">
                        Coordenação: {group.coordNome}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Área Operacional de Terreno
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#0B5CAD]/10 border border-[#0B5CAD]/30 px-3 py-1 text-xs font-black text-[#0B5CAD]">
                    Total: {group.mobs.length} Mobilizador{group.mobs.length !== 1 ? 'es' : ''} (1 a {group.mobs.length})
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-white text-[10px] font-bold text-[#0B5CAD] uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-12 text-center bg-sky-50 text-[#0B5CAD]">#</th>
                        <th className="p-2.5 bg-sky-50 text-[#0B5CAD]">ID Código</th>
                        <th className="p-2.5">Nome do Mobilizador</th>
                        <th className="p-2.5">Ronda</th>
                        <th className="p-2.5">Morada</th>
                        <th className="p-2.5">Telefone</th>
                        <th className="p-2.5">Equipa</th>
                        <th className="p-2.5">Função</th>
                        <th className="p-2.5">Supervisor Responsável</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {group.mobs.map((mob, index) => (
                        <tr key={mob.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 text-center font-mono font-black text-[#0B5CAD] bg-sky-50/50">
                            {index + 1}
                          </td>
                          <td className="p-2.5">
                            <span className="inline-block font-mono font-bold text-[11px] bg-sky-50 border border-sky-200 text-[#0B5CAD] px-2 py-0.5 rounded-md">
                              {mob.codigoId || `MT0022${String(index + 1).padStart(2, '0')}`}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">{mob.nome}</td>
                          <td className="p-2.5 font-bold">
                            <span className="inline-block rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] text-purple-700">
                              {mob.ronda || '1ª Ronda'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{mob.morada || '—'}</td>
                          <td className="p-2.5 font-mono text-[#2E7D32] font-bold">{mob.telefone || '—'}</td>
                          <td className="p-2.5 font-bold">
                            {mob.numeroEquipa ? (
                              <span className="inline-block rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                {mob.numeroEquipa}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600">{mob.funcao}</td>
                          <td className="p-2.5 text-slate-700 font-medium">
                            {mob.supervisorNome ? `👤 ${mob.supervisorNome}` : '—'}
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(mob)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-[#0B5CAD]"
                                title="Editar Mobilizador"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingMob(mob)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Eliminar Mobilizador"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {coordinationGroups.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                Nenhuma coordenação com mobilizadores registados.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINANÇAS & SUBSÍDIOS DOS MOBILIZADORES */}
        {activeTab === 'financas' && (
          <div className="space-y-6">
            {/* Top Info Banner & Rate Config */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-5 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300 backdrop-blur-xs border border-emerald-500/30">
                      <Wallet className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                        <span>Controlo de Subsídios & Pagamento Diário (RH-MC)</span>
                      </h3>
                      <p className="text-xs text-emerald-200">
                        Cálculo automático de subsídios com base nas fichas lançadas no sistema. Cada ficha equivale a 1 dia de trabalho.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rate Configuration & Export Controls */}
                <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-emerald-100 whitespace-nowrap flex items-center gap-1">
                      <Coins className="h-4 w-4 text-amber-300" />
                      <span>Valor Diário / Ficha (Kz):</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={diarioRate}
                      onChange={(e) => setDiarioRate(Math.max(0, Number(e.target.value)))}
                      className="w-28 rounded-lg border border-emerald-400/50 bg-slate-950/80 px-2.5 py-1.5 text-xs font-black text-amber-300 outline-none focus:border-amber-400 text-right"
                      id="input-diario-rate"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-l border-white/20 pl-3">
                    <button
                      type="button"
                      onClick={handleValidar4Fichas}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                      title="Validar estados: 4 ou mais fichas = PAGO, menos de 4 fichas = PENDENTE"
                      id="btn-validar-4-fichas"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-200" />
                      <span>Validar 4 Fichas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowNotificarPendenciasModal(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 relative"
                      title="Notificar supervisores de mobilizadores com menos de 4 fichas"
                      id="btn-notificar-pendencias-sup"
                    >
                      <BellRing className="h-3.5 w-3.5" />
                      <span>Notificar Pendências</span>
                      {pendingMobilizadoresList.length > 0 && (
                        <span className="ml-0.5 rounded-full bg-red-600 text-[10px] font-black px-1.5 py-0.2 text-white">
                          {pendingMobilizadoresList.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => exportFinancasPDF(visibleMobilizadores, fichas, diarioRate, paymentStatuses)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                      title="Exportar Relatório PDF Financeiro"
                      id="btn-export-pdf-financas"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportFinancasExcel(visibleMobilizadores, fichas, diarioRate, paymentStatuses)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                      title="Exportar Folha Excel Financeira"
                      id="btn-export-excel-financas"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/15">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-300 tracking-wider">Mobilizadores</span>
                  <div className="text-lg font-black text-white mt-0.5">{visibleMobilizadores.length}</div>
                  <span className="text-[10px] text-slate-300">Em sistema</span>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] font-extrabold uppercase text-amber-300 tracking-wider">Total Fichas (Dias)</span>
                  <div className="text-lg font-black text-amber-300 mt-0.5">
                    {visibleMobilizadores.reduce((acc, mob) => {
                      const mobF = fichas.filter(
                        (f) =>
                          (f.mobilizadorId && f.mobilizadorId === mob.id) ||
                          (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
                      );
                      return acc + mobF.length;
                    }, 0)}
                  </div>
                  <span className="text-[10px] text-slate-300">Fichas com registo</span>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">Total Valor Calculado</span>
                  <div className="text-lg font-black text-emerald-300 mt-0.5">
                    {(
                      visibleMobilizadores.reduce((acc, mob) => {
                        const mobF = fichas.filter(
                          (f) =>
                            (f.mobilizadorId && f.mobilizadorId === mob.id) ||
                            (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
                        );
                        return acc + mobF.length;
                      }, 0) * diarioRate
                    ).toLocaleString('pt-AO')} <span className="text-xs font-normal text-emerald-200">Kz</span>
                  </div>
                  <span className="text-[10px] text-slate-300">Subsídio global</span>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] font-extrabold uppercase text-sky-300 tracking-wider">Estado Pagamentos</span>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="font-bold text-emerald-300">
                      Pago: {visibleMobilizadores.reduce((acc, mob) => {
                        const mobF = fichas.filter((f) => (f.mobilizadorId && f.mobilizadorId === mob.id) || (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase()));
                        return paymentStatuses[mob.id] === 'pago' ? acc + mobF.length * diarioRate : acc;
                      }, 0).toLocaleString('pt-AO')} Kz
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300">
                    Pendente: {visibleMobilizadores.reduce((acc, mob) => {
                      const mobF = fichas.filter((f) => (f.mobilizadorId && f.mobilizadorId === mob.id) || (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase()));
                      return paymentStatuses[mob.id] !== 'pago' ? acc + mobF.length * diarioRate : acc;
                    }, 0).toLocaleString('pt-AO')} Kz
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="h-4 w-4 text-[#0B5CAD]" />
                <span>Filtrar por estado:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setFinancasStatusFilter('todos')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      financasStatusFilter === 'todos'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({visibleMobilizadores.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinancasStatusFilter('com_fichas')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      financasStatusFilter === 'com_fichas'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Com Fichas / Com Valor ({visibleMobilizadores.filter(mob => fichas.some(f => (f.mobilizadorId && f.mobilizadorId === mob.id) || (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase()))).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinancasStatusFilter('sem_fichas')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      financasStatusFilter === 'sem_fichas'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Sem Fichas (0,00 Kz)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinancasStatusFilter('pendente')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      financasStatusFilter === 'pendente'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    Pendentes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinancasStatusFilter('pago')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      financasStatusFilter === 'pago'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    Pagos
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium italic">
                * Clique no botão de estado para alternar entre <span className="font-bold text-amber-600">PENDENTE</span> e <span className="font-bold text-emerald-600">PAGO</span>.
              </div>
            </div>

            {/* Financial Control Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#0B5CAD] text-white uppercase text-[10px] tracking-wider font-extrabold">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">Nome do Mobilizador</th>
                      <th className="p-3">Coordenação / Supervisor</th>
                      <th className="p-3 text-center">Ronda</th>
                      <th className="p-3 text-center">Fichas Lançadas</th>
                      <th className="p-3 text-center">Dias Trabalhados</th>
                      <th className="p-3 text-right">Valor Diário</th>
                      <th className="p-3 text-right">Total a Receber</th>
                      <th className="p-3 text-center">Estado / Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleMobilizadores
                      .filter((mob) => {
                        const mobF = fichas.filter(
                          (f) =>
                            (f.mobilizadorId && f.mobilizadorId === mob.id) ||
                            (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
                        );
                        const count = mobF.length;
                        const status = paymentStatuses[mob.id] || (count > 0 ? 'pendente' : 'sem_fichas');

                        if (financasStatusFilter === 'com_fichas') return count > 0;
                        if (financasStatusFilter === 'sem_fichas') return count === 0;
                        if (financasStatusFilter === 'pendente') return status === 'pendente' && count > 0;
                        if (financasStatusFilter === 'pago') return status === 'pago';
                        return true;
                      })
                      .map((mob, index) => {
                        const mobFichas = fichas.filter(
                          (f) =>
                            (f.mobilizadorId && f.mobilizadorId === mob.id) ||
                            (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
                        );
                        const fichasCount = mobFichas.length;
                        const diasTrabalhados = fichasCount;
                        const totalKwanzas = fichasCount * diarioRate;
                        const paymentStatus = paymentStatuses[mob.id] || (totalKwanzas > 0 ? 'pendente' : 'sem_fichas');

                        return (
                          <tr
                            key={mob.id}
                            className={`transition hover:bg-sky-50/60 ${
                              fichasCount > 0 ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                            }`}
                          >
                            <td className="p-3 text-center font-mono font-black text-[#0B5CAD]">
                              {index + 1}
                            </td>
                            <td className="p-3 font-bold text-slate-800">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-900 font-extrabold text-xs">{mob.nome}</span>
                                  <span className="font-mono text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                    {mob.codigoId || `MT0022${String(index + 1).padStart(2, '0')}`}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal">{mob.telefone || 'Sem telefone'}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col text-[11px]">
                                <span className="font-bold text-purple-700">{mob.coordNome || '—'}</span>
                                <span className="text-slate-500">{mob.supervisorNome ? `Sup: ${mob.supervisorNome}` : '—'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {mob.ronda || '1ª Ronda'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-mono font-extrabold text-xs ${
                                    fichasCount > 0
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {fichasCount} {fichasCount === 1 ? 'ficha' : 'fichas'}
                                </span>
                                {fichasCount >= 4 ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    ✓ 4/4 Completo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    ⚠️ {fichasCount}/4 Incompleto
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">
                              {diasTrabalhados > 0 ? (
                                <span className="text-emerald-700 font-extrabold">{diasTrabalhados} dia(s)</span>
                              ) : (
                                <span className="text-slate-400 font-normal">0 dias</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600 font-medium">
                              {diarioRate.toLocaleString('pt-AO')},00 Kz
                            </td>
                            <td className="p-3 text-right font-mono font-black text-sm">
                              {totalKwanzas > 0 ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                  {totalKwanzas.toLocaleString('pt-AO')},00 Kz
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">0,00 Kz</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {totalKwanzas > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => togglePaymentStatus(mob.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black shadow-2xs transition active:scale-95 ${
                                      paymentStatus === 'pago'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                    }`}
                                    title="Clique para mudar estado de pagamento"
                                  >
                                    {paymentStatus === 'pago' ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>PAGO</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                                        <span>PENDENTE</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Sem Fichas</span>
                                  </span>
                                )}

                                {fichasCount < 4 && (
                                  <button
                                    type="button"
                                    onClick={() => handleNotifySingleMobSupervisor(mob, fichasCount)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                                    title={`Notificar supervisor (${mob.supervisorNome || 'Supervisão'}) referente à pendência (< 4 fichas)`}
                                  >
                                    <BellRing className="h-3.5 w-3.5" />
                                    <span>Notificar</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {visibleMobilizadores.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  Nenhum mobilizador encontrado para os critérios de pesquisa.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Editar Mobilizador */}
      {editingMob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-[#0B5CAD]">
                <Pencil className="h-5 w-5 text-[#2E7D32]" />
                <span>Editar Dados do Mobilizador</span>
              </div>
              <button
                onClick={() => setEditingMob(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  ID Código do Mobilizador
                </label>
                <input
                  type="text"
                  placeholder="Ex: MT002201"
                  value={editCodigoId}
                  onChange={(e) => setEditCodigoId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-blue-700 px-3.5 py-2.5 text-xs outline-none focus:border-[#0B5CAD]"
                  id="input-edit-mob-codigo"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Nome do Mobilizador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Afonso Pedro Neto"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#0B5CAD]"
                  id="input-edit-mob-nome"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Morada / Endereço
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bairro 15 de Março, Sumbe"
                  value={editMorada}
                  onChange={(e) => setEditMorada(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#0B5CAD]"
                  id="input-edit-mob-morada"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Contacto Telefónico
                </label>
                <input
                  type="text"
                  placeholder="9XX XXX XXX"
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#0B5CAD]"
                  id="input-edit-mob-telefone"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Número da Equipa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Equipa 01"
                  value={editNumeroEquipa}
                  onChange={(e) => setEditNumeroEquipa(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-indigo-900 placeholder-slate-400 outline-none transition focus:border-[#0B5CAD]"
                  id="input-edit-mob-equipa"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Função
                </label>
                <input
                  type="text"
                  value={editFuncao}
                  onChange={(e) => setEditFuncao(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#2E7D32] outline-none focus:border-[#0B5CAD]"
                  id="input-edit-mob-funcao"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Ronda da Campanha
                </label>
                <select
                  value={editRonda}
                  onChange={(e) => setEditRonda(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-purple-700 outline-none transition focus:border-[#0B5CAD]"
                  id="select-edit-mob-ronda"
                >
                  <option value="1ª Ronda">1ª Ronda</option>
                  <option value="2ª Ronda">2ª Ronda</option>
                  <option value="3ª Ronda">3ª Ronda</option>
                  <option value="4ª Ronda">4ª Ronda</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                  Coordenação de Pertença
                </label>
                {isAdmin ? (
                  <select
                    value={editCoordId}
                    onChange={(e) => setEditCoordId(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                    id="select-edit-mob-coord"
                  >
                    {coordenacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={
                      coordenacoes.find((c) => c.id === editCoordId)?.nome ||
                      editingMob.coordNome ||
                      '—'
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 cursor-not-allowed outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMob(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    isSubmitting
                      ? 'bg-emerald-800 cursor-wait opacity-95 ring-2 ring-emerald-400/50'
                      : 'bg-[#2E7D32] hover:bg-[#246328]'
                  }`}
                  id="btn-submit-edit-mob"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>A guardar ({editRonda})...</span>
                    </>
                  ) : (
                    <span>Guardar Alterações</span>
                  )}
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

      {/* Modal: Notificar Supervisores com Pendência (< 4 Fichas) */}
      {showNotificarPendenciasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Notificar Supervisores com Pendência
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mobilizadores com menos de 4 fichas lançadas ({pendingMobilizadoresList.length} no total)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificarPendenciasModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 overflow-y-auto space-y-4 pr-1 flex-1">
              {pendingBySupervisor.length === 0 ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800 text-sm">
                    Excelente! Não existem mobilizadores com pendência (&lt; 4 fichas).
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Todos os mobilizadores atingiram o requisito mínimo de 4 fichas completas.
                  </p>
                </div>
              ) : (
                pendingBySupervisor.map((group, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                      <div>
                        <div className="text-xs font-black text-slate-800">
                          Supervisor: <span className="text-amber-900 font-extrabold">{group.supervisorNome}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Coordenação: {group.coordNome}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificarSupervisorGroup(group)}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition active:scale-95"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Notificar Supervisor</span>
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Mobilizadores PENDENTES ({group.mobilizadores.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.mobilizadores.map((item) => (
                          <div
                            key={item.mob.id}
                            className="flex items-center justify-between rounded-lg bg-white p-2 border border-amber-200 text-xs"
                          >
                            <span className="font-bold text-slate-800 truncate mr-2">
                              {item.mob.nome}
                            </span>
                            <span className="font-mono text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap">
                              {item.count}/4 fichas
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
              <button
                type="button"
                onClick={() => setShowNotificarPendenciasModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
              {pendingBySupervisor.length > 0 && (
                <button
                  type="button"
                  onClick={handleNotificarTodosSupervisores}
                  disabled={isSendingNotif}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50 active:scale-95"
                >
                  <BellRing className="h-4 w-4" />
                  <span>
                    {isSendingNotif ? 'A Enviar...' : 'Notificar Todos os Supervisores'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
