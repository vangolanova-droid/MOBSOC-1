import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  KeyRound,
  Mail,
  UserCheck,
  CheckSquare,
  Square,
  RotateCw,
} from 'lucide-react';
import { User, Coordination, UserRole } from '../types';
import { useToast } from '../context/ToastContext';

interface NovoUtilizadorModalProps {
  isOpen: boolean;
  currentUser: User;
  coordenacoes: Coordination[];
  onClose: () => void;
  onCreateUser: (
    user: Omit<User, 'id'> & { senha?: string; permissoes?: string[] }
  ) => Promise<void>;
}

export const NovoUtilizadorModal: React.FC<NovoUtilizadorModalProps> = ({
  isOpen,
  currentUser,
  coordenacoes,
  onClose,
  onCreateUser,
}) => {
  const { showToast } = useToast();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState<UserRole>('supervisor');
  const [morada, setMorada] = useState('');
  const [ronda, setRonda] = useState('1ª Ronda');
  const [coordId, setCoordId] = useState<number>(
    coordenacoes.length > 0 ? coordenacoes[0].id : 1
  );
  const [selectedCoordIds, setSelectedCoordIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleCoordId = (id: number) => {
    setSelectedCoordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const roleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Administrador';
      case 'coordenador':
        return 'Coordenador Territorial';
      case 'supervisor':
        return 'Supervisor';
      case 'mobilizador':
        return 'Mobilizador';
      default:
        return r;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      showToast('Preencha os campos obrigatórios (Nome, Email e Senha).', 'error');
      return;
    }

    if (tipo === 'coordenador' && selectedCoordIds.length === 0) {
      showToast('Por favor, selecione pelo menos uma coordenação para o Coordenador.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCoord = coordenacoes.find((c) => c.id === coordId);
      const coordNome = selectedCoord ? selectedCoord.nome : undefined;
      const coordenadorNome = selectedCoord ? selectedCoord.coordenador : undefined;

      const newUser: Omit<User, 'id'> & { senha?: string; permissoes?: string[] } = {
        nome: nome.trim(),
        email: email.trim(),
        senha,
        tipo,
        status: 'ativo',
        morada: morada.trim() || undefined,
        ronda: tipo !== 'admin' ? ronda : undefined,
        coordId: tipo !== 'admin' ? (tipo === 'coordenador' ? selectedCoordIds[0] : coordId) : undefined,
        coordNome: tipo !== 'admin' ? coordNome : undefined,
        coordenadorNome: tipo !== 'admin' ? coordenadorNome : undefined,
        coordIds: tipo === 'coordenador' ? selectedCoordIds : undefined,
      };

      await onCreateUser(newUser);
      showToast(`Utilizador "${nome.trim()}" criado com sucesso!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar conta de utilizador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden my-auto"
        id="modal-cadastrar-utilizador"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-orange-50/60 dark:from-slate-900 dark:to-orange-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-500/20">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Criar Nova Conta de Utilizador
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Defina credenciais, tipo de permissão e coordenação atribuída
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (Esc)"
            id="btn-close-modal-user"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Manuel Antunes"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                id="input-modal-user-nome"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email de Acesso <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="utilizador@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-modal-user-email"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Senha Inicial <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-modal-user-senha"
                />
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Tipo de Perfil */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Perfil / Nível de Acesso <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as UserRole)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600"
                  id="select-modal-user-tipo"
                >
                  <option value="supervisor">{roleLabel('supervisor')}</option>
                  <option value="coordenador">{roleLabel('coordenador')}</option>
                  <option value="mobilizador">{roleLabel('mobilizador')}</option>
                  <option value="admin">{roleLabel('admin')}</option>
                </select>
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Ronda */}
            {tipo !== 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ronda Atribuída
                </label>
                <select
                  value={ronda}
                  onChange={(e) => setRonda(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600"
                  id="select-modal-user-ronda"
                >
                  <option value="1ª Ronda">1ª Ronda</option>
                  <option value="2ª Ronda">2ª Ronda</option>
                  <option value="3ª Ronda">3ª Ronda</option>
                  <option value="4ª Ronda">4ª Ronda</option>
                </select>
              </div>
            )}

            {/* Morada */}
            {tipo !== 'admin' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Morada / Residência
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bairro Mbumba Kupuco, Sumbe"
                  value={morada}
                  onChange={(e) => setMorada(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  id="input-modal-user-morada"
                />
              </div>
            )}
          </div>

          {/* Multi-select for Coordenador */}
          {tipo === 'coordenador' && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Coordenações Sob Responsabilidade <span className="text-red-500">* (Selecione pelo menos 1)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 max-h-40 overflow-y-auto">
                {coordenacoes.map((c) => {
                  const isChecked = selectedCoordIds.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleCoordId(c.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition text-left ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{c.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single select for Supervisor & Mobilizador */}
          {(tipo === 'supervisor' || tipo === 'mobilizador') && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Coordenação <span className="text-red-500">*</span>
              </label>
              <select
                value={coordId}
                onChange={(e) => setCoordId(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600"
                id="select-modal-user-coord"
              >
                {coordenacoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              id="btn-submit-novo-user"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>A Criar Conta...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Criar Utilizador</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
