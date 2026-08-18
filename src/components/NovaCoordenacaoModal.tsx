import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Plus,
  Trash2,
  Building,
  RotateCw,
} from 'lucide-react';
import { Coordination } from '../types';
import { useToast } from '../context/ToastContext';

interface NovaCoordenacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCoordination: (nome: string, coordenador?: string, bairros?: string[]) => Promise<void>;
}

export const NovaCoordenacaoModal: React.FC<NovaCoordenacaoModalProps> = ({
  isOpen,
  onClose,
  onCreateCoordination,
}) => {
  const { showToast } = useToast();
  const [nome, setNome] = useState('');
  const [coordenador, setCoordenador] = useState('');
  const [bairroInput, setBairroInput] = useState('');
  const [bairrosList, setBairrosList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddBairro = () => {
    if (!bairroInput.trim()) return;
    if (bairrosList.some((b) => b.toLowerCase() === bairroInput.trim().toLowerCase())) {
      showToast('Este bairro já foi adicionado à lista.', 'info');
      return;
    }
    setBairrosList([...bairrosList, bairroInput.trim()]);
    setBairroInput('');
  };

  const handleRemoveBairro = (index: number) => {
    setBairrosList(bairrosList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('Por favor, informe o nome da coordenação.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateCoordination(
        nome.trim(),
        coordenador.trim() || undefined,
        bairrosList.length > 0 ? bairrosList : undefined
      );
      showToast(`Coordenação "${nome.trim()}" criada com sucesso!`, 'success');
      
      // Limpar formulário e fechar modal imediatamente
      setNome('');
      setCoordenador('');
      setBairroInput('');
      setBairrosList([]);
      
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar coordenação.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden my-auto"
        id="modal-cadastrar-coordenacao"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-cyan-50/60 dark:from-slate-900 dark:to-cyan-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-500/20">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Criar Nova Coordenação Territorial
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Defina a área geográfica, coordenador responsável e lista de bairros
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (Esc)"
            id="btn-close-modal-coord"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome da Coordenação / Área <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ex: Coordenação Porto Amboim Centro"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-modal-coord-nome"
                />
                <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Coordenador */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Coordenador Responsável
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Dr. António dos Santos"
                  value={coordenador}
                  onChange={(e) => setCoordenador(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-modal-coord-responsavel"
                />
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Bairros Checklist Pré-definidos */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bairros Operacionais da Coordenação
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar bairro (Ex: Bairro Litoral)..."
                  value={bairroInput}
                  onChange={(e) => setBairroInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBairro();
                    }
                  }}
                  className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                  id="input-modal-coord-add-bairro"
                />
                <button
                  type="button"
                  onClick={handleAddBairro}
                  className="h-10 px-3.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar</span>
                </button>
              </div>

              {bairrosList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                  {bairrosList.map((b, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs"
                    >
                      <span>{b}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBairro(idx)}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  Nenhum bairro pré-adicionado. Poderá adicionar mais tarde via Checklist.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              id="btn-submit-nova-coord"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>A Criar Coordenação...</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  <span>Criar Coordenação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
