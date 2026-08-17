import React, { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, UserCheck, Lock, Notebook, Clock, Check, X, Phone, UserX, CheckSquare, Square, Search, Filter, Users } from 'lucide-react';
import { Coordination, User, UserRole } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';
import { NovoUtilizadorModal } from './NovoUtilizadorModal';
import { roleLabel, isAdmin as checkIsAdmin } from '../utils/permissions';

interface UtilizadoresViewProps {
  users: User[];
  coordenacoes: Coordination[];
  currentUser?: User;
  initialFocusRegister?: boolean;
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser?: (id: number, fields: Partial<User>) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  onOpenNotepad?: () => void;
}

export const UtilizadoresView: React.FC<UtilizadoresViewProps> = ({
  users,
  coordenacoes,
  currentUser,
  initialFocusRegister = false,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onOpenNotepad,
}) => {
  const { showToast } = useToast();
  const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(initialFocusRegister);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'todos' | UserRole>('todos');

  React.useEffect(() => {
    if (initialFocusRegister) {
      setIsCadastroModalOpen(true);
    }
  }, [initialFocusRegister]);

  // Modal State for Password Reset
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Modal State for Delete Confirmation
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter pending users
  const pendingUsers = users.filter((u) => u.status === 'pendente');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'todos' && u.tipo !== roleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.coordNome && u.coordNome.toLowerCase().includes(q)) ||
        (u.morada && u.morada.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleApproveUser = async (u: User) => {
    try {
      if (onUpdateUser) {
        await onUpdateUser(u.id, { status: 'ativo' });
        showToast(`Registo de ${u.nome} aprovado com sucesso! Acesso concedido.`, 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao aprovar utilizador.', 'error');
    }
  };

  const handleRejectUser = async (u: User) => {
    try {
      await onDeleteUser(u.id);
      showToast(`Registo de ${u.nome} recusado e removido.`, 'info');
    } catch (e: any) {
      showToast(e.message || 'Erro ao recusar utilizador.', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (!newPassword.trim()) {
      showToast('Por favor introduza a nova senha.', 'error');
      return;
    }
    setIsResetting(true);
    try {
      if (onUpdateUser) {
        await onUpdateUser(resetUser.id, { senha: newPassword.trim() });
        showToast(`Senha do utilizador "${resetUser.nome}" atualizada com sucesso!`, 'success');
        setResetUser(null);
        setNewPassword('');
      } else {
        showToast('Atualização não suportada.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao alterar a senha.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await onDeleteUser(deletingUser.id);
      showToast(`Utilizador "${deletingUser.nome}" eliminado com sucesso!`, 'success');
      setDeletingUser(null);
    } catch (e: any) {
      showToast(e.message || 'Erro ao eliminar utilizador.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingUser}
        isAdmin={true}
        title="Eliminar Utilizador"
        message={
          deletingUser
            ? `Tem a certeza que deseja eliminar o utilizador "${deletingUser.nome}" (${deletingUser.email})? Esta ação é irreversível.`
            : ''
        }
        confirmText="Eliminar Utilizador"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingUser(null)}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            <span>Gestão de Utilizadores</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Adicione e gira os acessos de Administradores, Coordenadores e Supervisores de equipa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenNotepad && (
            <button
              onClick={onOpenNotepad}
              className="flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition shrink-0 cursor-pointer"
              id="btn-utilizadores-notepad"
            >
              <Notebook className="h-4 w-4" />
              <span>Bloco de Notas</span>
            </button>
          )}

          <button
            onClick={() => setIsCadastroModalOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition active:scale-95 shrink-0 cursor-pointer"
            id="btn-abrir-modal-cadastrar-user"
          >
            <UserPlus className="h-4 w-4" />
            <span>Criar Novo Utilizador</span>
          </button>
        </div>
      </div>

      {/* Novo Utilizador Modal */}
      <NovoUtilizadorModal
        isOpen={isCadastroModalOpen}
        currentUser={currentUser || (users.find((u) => u.tipo === 'admin') as User)}
        coordenacoes={coordenacoes}
        onClose={() => setIsCadastroModalOpen(false)}
        onCreateUser={onCreateUser as any}
      />

      {/* PENDING APPROVALS SECTION */}
      {pendingUsers.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">
                  Solicitações Pendentes de Registo de Supervisor ({pendingUsers.length})
                </h2>
                <p className="text-xs text-amber-800 font-medium">
                  Os seguintes utilizadores registaram-se no portal e aguardam validação do Administrador para aceder ao SirDm.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-xs">
              {pendingUsers.length} {pendingUsers.length === 1 ? 'Pendente' : 'Pendentes'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map((pu) => (
              <div
                key={pu.id}
                className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{pu.nome}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                      Supervisor Pendente
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-600">{pu.email}</div>

                  {pu.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-amber-600" />
                      <span>Contacto: {pu.telefone}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-slate-500">Coordenação: </span>
                    <span className="font-bold text-blue-900">{pu.coordNome || 'Não especificada'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleRejectUser(pu)}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Recusar</span>
                  </button>

                  <button
                    onClick={() => handleApproveUser(pu)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Aprovar Acesso</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5 space-y-4">
        {/* Table Toolbar / Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Utilizadores Registados ({filteredUsers.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Acessos de Administradores, Coordenadores Territoriais e Supervisores de equipa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Pesquisar utilizador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Role Filter */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setRoleFilter('todos')}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  roleFilter === 'todos' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('supervisor')}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  roleFilter === 'supervisor' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Supervisores
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('coordenador')}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  roleFilter === 'coordenador' ? 'bg-white font-bold text-indigo-700 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Coordenadores
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  roleFilter === 'admin' ? 'bg-white font-bold text-purple-700 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                Admins
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Nome</th>
                <th className="p-3.5">Email / Contacto</th>
                <th className="p-3.5">Perfil</th>
                <th className="p-3.5">Ronda</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Coordenação</th>
                <th className="p-3.5">Coordenador Responsável</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-mono text-slate-400">{i + 1}</td>
                  <td className="p-3.5 font-semibold text-slate-900">
                    <div>{u.nome}</div>
                    {u.morada && (
                      <div className="text-[10px] text-sky-700 font-normal flex items-center gap-1 mt-0.5">
                        <span>📍</span>
                        <span>{u.morada}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 font-mono text-slate-600">
                    <div>{u.email}</div>
                    {u.telefone && <div className="text-[10px] text-slate-500">Tel: {u.telefone}</div>}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        u.tipo === 'admin'
                          ? 'border-purple-200 bg-purple-50 text-purple-800'
                          : u.tipo === 'coordenador'
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                          : u.tipo === 'mobilizador'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {u.tipo === 'admin'
                        ? '🛡️ ' + roleLabel('admin')
                        : u.tipo === 'coordenador'
                        ? '🏛️ ' + roleLabel('coordenador')
                        : u.tipo === 'mobilizador'
                        ? '📢 ' + roleLabel('mobilizador')
                        : '👤 ' + roleLabel('supervisor')}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                      {u.ronda || '1ª Ronda'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {u.status === 'pendente' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        <Clock className="h-3 w-3 text-amber-600" />
                        Pendente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        <Check className="h-3 w-3 text-emerald-600" />
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-medium text-slate-700">{u.coordNome || '—'}</td>
                  <td className="p-3.5 font-semibold text-emerald-800">
                    {u.tipo === 'admin'
                      ? 'Gestor do Sistema'
                      : coordenacoes.find((c) => c.id === u.coordId)?.coordenador ||
                        (u.coordenadorNome && u.coordenadorNome !== 'Direção Geral de Saúde'
                          ? u.coordenadorNome
                          : 'Gestor do Sistema')}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Password Reset/Recovery Button for Admin & Supervisors */}
                      <button
                        onClick={() => {
                          setResetUser(u);
                          setNewPassword('');
                        }}
                        className="rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800 transition flex items-center gap-1"
                        title="Restaurar / Recuperar Senha"
                      >
                        <Lock className="h-3 w-3 text-amber-600" />
                        <span>Reset Senha</span>
                      </button>

                      {u.status === 'pendente' && (
                        <button
                          onClick={() => handleApproveUser(u)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white transition shadow-2xs"
                          title="Aprovar Registo"
                        >
                          Aprovar
                        </button>
                      )}

                      {u.id !== 1 && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remover Utilizador"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RESET/RESTAURAR SENHA */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600 font-extrabold text-sm">
                <Lock className="h-4 w-4" />
                <span>Restaurar / Alterar Senha</span>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Defina a nova senha de acesso para o utilizador{' '}
              <strong className="text-slate-900">{resetUser.nome}</strong> ({resetUser.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nova Senha de Acesso
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite a nova senha..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-mono outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="h-10 px-4 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="h-10 px-5 text-xs font-bold text-white rounded-xl bg-amber-600 hover:bg-amber-700 shadow-xs transition disabled:opacity-50"
                >
                  {isResetting ? 'A guardar...' : 'Confirmar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
