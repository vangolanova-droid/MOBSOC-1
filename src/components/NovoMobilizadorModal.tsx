import React, { useState } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  MapPin,
  Phone,
  Building2,
  Users,
  RotateCw,
} from 'lucide-react';
import { User, Mobilizador, Coordination } from '../types';
import { useToast } from '../context/ToastContext';

interface NovoMobilizadorModalProps {
  isOpen: boolean;
  user: User;
  users?: User[];
  coordenacoes: Coordination[];
  mobilizadores: Mobilizador[];
  onClose: () => void;
  onCreateMobilizador: (mobPartial: Partial<Mobilizador>) => Promise<void>;
}

export const NovoMobilizadorModal: React.FC<NovoMobilizadorModalProps> = ({
  isOpen,
  user,
  users = [],
  coordenacoes,
  mobilizadores,
  onClose,
  onCreateMobilizador,
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
    return '1ª Ronda';
  });
  const [coordId, setCoordId] = useState<number>(() => {
    if (!isAdmin && user.coordId) return user.coordId;
    return coordenacoes.length > 0 ? coordenacoes[0].id : 1;
  });
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Next Preview ID
  const rawMax = mobilizadores.reduce((max, m) => {
    if (m.codigoId) {
      const match = m.codigoId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
    }
    return m.id > max ? m.id : max;
  }, 0);
  const nextSeq = rawMax + 1;
  const nextPreviewCodigoId = `MT${String(nextSeq).padStart(6, '0')}`;

  // Filter supervisors
  const availableSupervisors = users.filter((u) => {
    if (u.tipo !== 'supervisor') return false;
    if (isAdmin) {
      return u.coordId === coordId;
    }
    return u.coordId === user.coordId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('Por favor insira o nome completo do mobilizador.', 'error');
      return;
    }

    if (!numeroEquipa.trim()) {
      showToast('Por favor indique o número da equipa.', 'error');
      return;
    }

    const assignedCoordId = isAdmin ? coordId : user.coordId || coordId;
    const assignedCoordNome =
      coordenacoes.find((c) => c.id === assignedCoordId)?.nome || user.coordNome || 'Geral';

    let assignedSupervisorId = user.id;
    let assignedSupervisorNome = user.nome;

    if (isAdmin) {
      if (selectedSupervisorId) {
        const foundSup = users.find((u) => u.id === selectedSupervisorId);
        if (foundSup) {
          assignedSupervisorId = foundSup.id;
          assignedSupervisorNome = foundSup.nome;
        }
      } else {
        const coordSupervisors = users.filter(
          (u) => u.tipo === 'supervisor' && u.coordId === assignedCoordId
        );
        if (coordSupervisors.length > 0) {
          assignedSupervisorId = coordSupervisors[0].id;
          assignedSupervisorNome = coordSupervisors[0].nome;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await onCreateMobilizador({
        nome: nome.trim(),
        funcao,
        morada: morada.trim() || undefined,
        telefone: telefone.trim() || undefined,
        numeroEquipa: numeroEquipa.trim(),
        ronda,
        coordId: assignedCoordId,
        coordNome: assignedCoordNome,
        supervisorId: assignedSupervisorId,
        supervisorNome: assignedSupervisorNome,
      });

      showToast(`Mobilizador "${nome.trim()}" registado com sucesso!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao registar mobilizador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden my-auto"
        id="modal-cadastrar-mobilizador"
      >
        {/* Header com estilo elegante azul e verde */}
        <div className="p-4 sm:p-5 border-b border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm backdrop-blur-xs border border-white/30">
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Cadastrar Novo Mobilizador (RH-MC)
                </h3>
                <span className="inline-flex items-center rounded-md bg-white/25 border border-white/30 px-2 py-0.5 text-[10px] font-mono font-black text-white">
                  {nextPreviewCodigoId}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Registo individual de ativista comunitário e atribuição operacional
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
            title="Fechar (Esc)"
            id="btn-close-modal-mob"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo do Mobilizador <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Afonso Pedro Neto"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600/20"
                id="input-mob-modal-nome"
              />
            </div>

            {/* Morada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Morada / Residência
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Bairro 15 de Março, Sumbe"
                  value={morada}
                  onChange={(e) => setMorada(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-mob-modal-morada"
                />
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contacto Telefónico
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="9XX XXX XXX"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-mob-modal-telefone"
                />
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Número da Equipa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número da Equipa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 01, Equipa 4, etc."
                value={numeroEquipa}
                onChange={(e) => setNumeroEquipa(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                id="input-mob-modal-equipa"
              />
            </div>

            {/* Ronda */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ronda Atribuída
              </label>
              <select
                value={ronda}
                onChange={(e) => setRonda(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600 font-semibold"
                id="select-mob-modal-ronda"
              >
                <option value="1ª Ronda">1ª Ronda</option>
                <option value="2ª Ronda">2ª Ronda</option>
                <option value="3ª Ronda">3ª Ronda</option>
                <option value="4ª Ronda">4ª Ronda</option>
              </select>
            </div>

            {/* Coordenação (Admin or readonly for supervisor) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Coordenação Territorial <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={coordId}
                  disabled={!isAdmin}
                  onChange={(e) => {
                    setCoordId(Number(e.target.value));
                    setSelectedSupervisorId(null);
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600 disabled:opacity-75"
                  id="select-mob-modal-coord"
                >
                  {coordenacoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.coordenador || 'Sem Coordenador'})
                    </option>
                  ))}
                </select>
                <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Supervisor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supervisor Responsável
              </label>
              <div className="relative">
                {isAdmin ? (
                  <select
                    value={selectedSupervisorId || ''}
                    onChange={(e) =>
                      setSelectedSupervisorId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600"
                    id="select-mob-modal-supervisor"
                  >
                    <option value="">— Automático (1º da Coordenação) —</option>
                    {availableSupervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} ({s.coordNome || 'Coord. ' + s.coordId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`${user.nome} (Você)`}
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 pl-10 pr-3.5 text-xs text-slate-700 dark:text-slate-300 font-semibold"
                  />
                )}
                <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              id="btn-submit-novo-mob"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>A Guardar...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Registar Mobilizador</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
