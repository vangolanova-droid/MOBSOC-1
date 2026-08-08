import React, { useState } from 'react';
import { Building2, Plus, Trash2, UserCheck, MapPin, X, CheckSquare, ListChecks, Search, Eye, Pencil } from 'lucide-react';
import { Coordination, User } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';

interface CoordenacoesViewProps {
  coordenacoes: Coordination[];
  users: User[];
  onCreateCoordination: (nome: string, coordenador?: string, bairros?: string[]) => Promise<void>;
  onUpdateCoordination?: (id: number, fields: Partial<Coordination>) => Promise<void>;
  onDeleteCoordination: (id: number) => Promise<void>;
}

export const CoordenacoesView: React.FC<CoordenacoesViewProps> = ({
  coordenacoes,
  users,
  onCreateCoordination,
  onUpdateCoordination,
  onDeleteCoordination,
}) => {
  const { showToast } = useToast();
  const [nome, setNome] = useState('');
  const [coordenador, setCoordenador] = useState('');
  const [bairrosInput, setBairrosInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Checklist de Bairros
  const [checklistCoordId, setChecklistCoordId] = useState<number | null>(null);
  const [modalNewBairro, setModalNewBairro] = useState('');
  const [modalSearchBairro, setModalSearchBairro] = useState('');

  // Modal / Quick Assign Coordenador
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);
  const [selectedCoordId, setSelectedCoordId] = useState<number>(
    coordenacoes.length > 0 ? coordenacoes[0].id : 1
  );
  const [modalCoordenadorNome, setModalCoordenadorNome] = useState('');

  // Modal Editar Coordenação
  const [editingCoord, setEditingCoord] = useState<Coordination | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCoordenador, setEditCoordenador] = useState('');
  const [editBairrosInput, setEditBairrosInput] = useState('');

  // Confirm Delete Modal
  const [deletingCoord, setDeletingCoord] = useState<Coordination | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeChecklistCoord = coordenacoes.find((c) => c.id === checklistCoordId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setIsSubmitting(true);
    try {
      const parsedBairros = bairrosInput
        .split(',')
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      await onCreateCoordination(nome.trim(), coordenador.trim(), parsedBairros);
      showToast('Coordenação registada com sucesso!', 'success');
      setNome('');
      setCoordenador('');
      setBairrosInput('');
    } catch (e: any) {
      showToast(e.message || 'Erro ao criar coordenação.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (c: Coordination) => {
    setEditingCoord(c);
    setEditNome(c.nome);
    setEditCoordenador(c.coordenador || '');
    setEditBairrosInput((c.bairros || []).join(', '));
  };

  const handleUpdateCoordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoord || !editNome.trim() || !onUpdateCoordination) return;

    setIsSubmitting(true);
    try {
      const parsedBairros = editBairrosInput
        .split(',')
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      await onUpdateCoordination(editingCoord.id, {
        nome: editNome.trim(),
        coordenador: editCoordenador.trim(),
        bairros: parsedBairros,
      });
      showToast(`Coordenação "${editNome.trim()}" atualizada com sucesso!`, 'success');
      setEditingCoord(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar coordenação.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBairroToCoord = async (coordId: number, nameToAdd: string) => {
    if (!nameToAdd.trim() || !onUpdateCoordination) return;
    const target = coordenacoes.find((c) => c.id === coordId);
    if (!target) return;

    const current = target.bairros || [];
    const bName = nameToAdd.trim();
    if (current.some((b) => b.toLowerCase() === bName.toLowerCase())) {
      showToast('Este bairro já está registado nesta coordenação.', 'error');
      return;
    }

    const updated = [...current, bName];
    try {
      await onUpdateCoordination(coordId, { bairros: updated });
      showToast(`Bairro "${bName}" adicionado à ${target.nome}!`, 'success');
      setModalNewBairro('');
    } catch (e: any) {
      showToast(e.message || 'Erro ao adicionar bairro.', 'error');
    }
  };

  const handleRemoveBairroFromCoord = async (coordId: number, bairroToRemove: string) => {
    if (!onUpdateCoordination) return;
    const target = coordenacoes.find((c) => c.id === coordId);
    if (!target) return;

    const current = target.bairros || [];
    const updated = current.filter((b) => b !== bairroToRemove);

    try {
      await onUpdateCoordination(coordId, { bairros: updated });
      showToast(`Bairro "${bairroToRemove}" removido com sucesso.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao remover bairro.', 'error');
    }
  };

  const handleAssignCoordenadorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCoordenadorNome.trim()) return;
    const targetCoord = coordenacoes.find((c) => c.id === selectedCoordId);
    if (!targetCoord) return;

    setIsSubmitting(true);
    try {
      if (onUpdateCoordination) {
        await onUpdateCoordination(targetCoord.id, {
          coordenador: modalCoordenadorNome.trim(),
        });
      } else {
        await onCreateCoordination(targetCoord.nome, modalCoordenadorNome.trim(), targetCoord.bairros);
      }
      showToast(`Coordenador "${modalCoordenadorNome.trim()}" atribuído com sucesso à ${targetCoord.nome}!`, 'success');
      setModalCoordenadorNome('');
      setIsCoordModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Erro ao registar coordenador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCoord) return;
    setIsDeleting(true);
    try {
      await onDeleteCoordination(deletingCoord.id);
      showToast(`Coordenação "${deletingCoord.nome}" eliminada com sucesso!`, 'success');
      setDeletingCoord(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao eliminar coordenação.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingCoord}
        isAdmin={true}
        title="Eliminar Coordenação"
        message={
          deletingCoord
            ? `Tem a certeza que deseja eliminar a coordenação "${deletingCoord.nome}"?`
            : ''
        }
        confirmText="Eliminar Coordenação"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingCoord(null)}
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Gestão de Coordenações & Bairros
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Estruturação de áreas operacionais, pré-registo de bairros e atribuição de Coordenadores Responsáveis
          </p>
        </div>

        <button
          onClick={() => setIsCoordModalOpen(true)}
          className="flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-[#00B2FF] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#009ee3] transition active:scale-[0.99]"
          id="btn-open-cadastrar-coordenador"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>+ Cadastrar Coordenador</span>
        </button>
      </div>

      {/* Cadastrar Coordenador Modal */}
      {isCoordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>Cadastrar / Atribuir Coordenador</span>
              </div>
              <button
                onClick={() => setIsCoordModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssignCoordenadorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione a Coordenação Operacional
                </label>
                <select
                  value={selectedCoordId}
                  onChange={(e) => setSelectedCoordId(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="select-modal-coord"
                >
                  {coordenacoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.coordenador ? `(Atual: ${c.coordenador})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Coordenador Responsável <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Afonso Vunge"
                  value={modalCoordenadorNome}
                  onChange={(e) => setModalCoordenadorNome(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-modal-coordenador-nome"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCoordModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-[#00B2FF] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#009ee3] disabled:opacity-50"
                  id="btn-submit-cadastrar-coordenador"
                >
                  Gravar Coordenador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Nova Coordenação Operacional & Registo de Bairros</span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Nome da Coordenação <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Coordenação Zona A"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 h-8.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-coord-nome"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Nome do Coordenador Responsável
            </label>
            <input
              type="text"
              placeholder="Ex: Dr. António Manuel"
              value={coordenador}
              onChange={(e) => setCoordenador(e.target.value)}
              className="mt-1 h-8.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-coord-coordenador"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Bairros / Comunidades (separados por vírgula)
            </label>
            <input
              type="text"
              placeholder="Ex: 15 de Março, Chingo, Quissala"
              value={bairrosInput}
              onChange={(e) => setBairrosInput(e.target.value)}
              className="mt-1 h-8.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-coord-bairros"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8.5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00B2FF] hover:bg-[#009ee3] px-3 text-xs font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50"
              id="btn-add-coord"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar Coordenação</span>
            </button>
          </div>
        </form>
      </div>

      {/* List Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-2 sm:p-2.5">#</th>
                <th className="p-2 sm:p-2.5">Nome da Coordenação</th>
                <th className="p-2 sm:p-2.5">Coordenador Responsável</th>
                <th className="p-2 sm:p-2.5">Bairros Pré-Registados</th>
                <th className="p-2 sm:p-2.5 text-center">Supervisores</th>
                <th className="p-2 sm:p-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {coordenacoes.map((c, i) => {
                const countSups = users.filter(
                  (u) => u.coordId === c.id && u.tipo === 'supervisor'
                ).length;
                const bairros = c.bairros || [];

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2 sm:p-2.5 font-mono text-slate-400">{i + 1}</td>
                    <td className="p-2 sm:p-2.5 font-semibold text-slate-900">{c.nome}</td>
                    <td className="p-2 sm:p-2.5 font-semibold text-emerald-800">
                      {c.coordenador || '— Não Atribuído —'}
                    </td>
                    <td className="p-2 sm:p-2.5">
                      {bairros.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setChecklistCoordId(c.id);
                            setModalSearchBairro('');
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                        >
                          <Plus className="h-3 w-3 text-slate-400" />
                          <span>Adicionar Bairros (Checklist)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setChecklistCoordId(c.id);
                              setModalSearchBairro('');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                            title="Clique para abrir e gerir a checklist de bairros"
                          >
                            <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{bairros.length} Bairro{bairros.length > 1 ? 's' : ''} (Checklist)</span>
                          </button>

                          <span className="text-[11px] text-slate-500 max-w-[180px] truncate hidden md:inline font-normal">
                            {bairros.slice(0, 2).join(', ')}{bairros.length > 2 ? `, +${bairros.length - 2}` : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-2 sm:p-2.5 text-center">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-700 border border-blue-200">
                        {countSups} supervisores
                      </span>
                    </td>
                    <td className="p-2 sm:p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Editar Coordenação e Coordenador"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCoord(c)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Apagar Coordenação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Checklist de Bairros */}
      {activeChecklistCoord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Checklist de Bairros
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    {activeChecklistCoord.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChecklistCoordId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add New Bairro Form */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Adicionar Bairro à Checklist
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Bairro Litoral..."
                  value={modalNewBairro}
                  onChange={(e) => setModalNewBairro(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBairroToCoord(activeChecklistCoord.id, modalNewBairro);
                    }
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => handleAddBairroToCoord(activeChecklistCoord.id, modalNewBairro)}
                  className="flex items-center gap-1 shrink-0 rounded-xl bg-emerald-600 px-4 h-10 text-xs font-medium text-white hover:bg-emerald-700 transition shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Search filter if many bairros */}
            {(activeChecklistCoord.bairros?.length || 0) > 4 && (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar bairro na checklist..."
                  value={modalSearchBairro}
                  onChange={(e) => setModalSearchBairro(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                />
              </div>
            )}

            {/* Checklist Items List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {(!activeChecklistCoord.bairros || activeChecklistCoord.bairros.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum bairro cadastrado nesta coordenação. Adicione acima.
                </div>
              ) : (
                activeChecklistCoord.bairros
                  .filter((b) => b.toLowerCase().includes(modalSearchBairro.toLowerCase()))
                  .map((b) => (
                    <div
                      key={b}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 hover:border-emerald-300 transition shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800">{b}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBairroFromCoord(activeChecklistCoord.id, b)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Remover este bairro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Total: <strong>{activeChecklistCoord.bairros?.length || 0}</strong> bairros</span>
              <button
                type="button"
                onClick={() => setChecklistCoordId(null)}
                className="rounded-xl bg-blue-600 px-5 h-9 font-medium text-white hover:bg-blue-700 transition"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Coordenação */}
      {editingCoord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Pencil className="h-5 w-5 text-blue-600" />
                <span>Editar Coordenação & Coordenador</span>
              </div>
              <button
                onClick={() => setEditingCoord(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nome da Coordenação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Coordenação Zona A"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-edit-coord-nome"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nome do Coordenador Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dr. António Manuel"
                  value={editCoordenador}
                  onChange={(e) => setEditCoordenador(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-edit-coord-coordenador"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Bairros / Comunidades (separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bairro 1, Bairro 2..."
                  value={editBairrosInput}
                  onChange={(e) => setEditBairrosInput(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-edit-coord-bairros"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCoord(null)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                  id="btn-submit-edit-coord"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
