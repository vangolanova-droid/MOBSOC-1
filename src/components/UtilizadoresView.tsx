import React, { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, UserCheck, Lock, Notebook, Clock, Check, X, Phone, UserX } from 'lucide-react';
import { Coordination, User, UserRole } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';

interface UtilizadoresViewProps {
  users: User[];
  coordenacoes: Coordination[];
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser?: (id: number, fields: Partial<User>) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  onOpenNotepad?: () => void;
}

export const UtilizadoresView: React.FC<UtilizadoresViewProps> = ({
  users,
  coordenacoes,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onOpenNotepad,
}) => {
  const { showToast } = useToast();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState<UserRole>('supervisor');
  const [coordId, setCoordId] = useState<number>(
    coordenacoes.length > 0 ? coordenacoes[0].id : 1
  );
  const [ronda, setRonda] = useState('3ª Ronda');
  const [morada, setMorada] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State for Password Reset
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Modal State for Delete Confirmation
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter pending users
  const pendingUsers = users.filter((u) => u.status === 'pendente');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    const selectedCoord = coordenacoes.find((c) => c.id === Number(coordId));
    setIsSubmitting(true);
    try {
      await onCreateUser({
        nome: nome.trim(),
        email: email.trim(),
        senha: senha.trim(),
        tipo,
        morada: morada.trim(),
        ronda: tipo === 'supervisor' ? ronda : '3ª Ronda',
        coordId: tipo === 'admin' ? null : Number(coordId),
        coordNome: tipo === 'admin' ? 'Acesso Global' : selectedCoord?.nome || '—',
        coordenadorNome: tipo === 'admin' ? 'Direção Geral' : selectedCoord?.coordenador || '—',
      });
      showToast('Utilizador criado com sucesso!', 'success');
      setNome('');
      setEmail('');
      setSenha('');
      setMorada('');
    } catch (e: any) {
      showToast(e.message || 'Erro ao criar utilizador.', 'error');
    } finally {
      setIsSubmitting(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Gestão de Utilizadores
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Adicione e gira os acessos de Administradores e Supervisores de equipa
          </p>
        </div>

        {onOpenNotepad && (
          <button
            onClick={onOpenNotepad}
            className="flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-3.5 text-xs font-medium text-white shadow-xs hover:bg-amber-600 transition shrink-0"
            id="btn-utilizadores-notepad"
          >
            <Notebook className="h-4 w-4" />
            <span>Bloco de Notas de Senhas</span>
          </button>
        )}
      </div>

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
                  Os seguintes utilizadores registaram-se no portal e aguardam validação do Administrador para aceder ao SisMob.
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

      {/* Add User Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <UserPlus className="h-4 w-4 text-[#00B2FF]" />
          <span>Novo Utilizador do Sistema</span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Nome Completo
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Manuel Antunes"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-user-nome"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-user-email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Senha Inicial
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-user-senha"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Tipo de Perfil
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as UserRole)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="select-user-tipo"
            >
              <option value="supervisor">Supervisor de Equipa</option>
              <option value="admin">Administrador Global</option>
            </select>
          </div>

          {tipo === 'supervisor' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Morada / Residência <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required={tipo === 'supervisor'}
                placeholder="Ex: Bairro Mbumba Kupuco, Sumbe"
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="input-user-morada"
              />
            </div>
          )}

          {tipo === 'supervisor' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Coordenação
              </label>
              <select
                value={coordId}
                onChange={(e) => setCoordId(Number(e.target.value))}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="select-user-coord"
              >
                {coordenacoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'supervisor' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Ronda Atribuída
              </label>
              <select
                value={ronda}
                onChange={(e) => setRonda(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="select-user-ronda"
              >
                <option value="1ª Ronda">1ª Ronda</option>
                <option value="2ª Ronda">2ª Ronda</option>
                <option value="3ª Ronda">3ª Ronda</option>
                <option value="4ª Ronda">4ª Ronda</option>
              </select>
            </div>
          )}

          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-[#00B2FF] hover:bg-[#009ee3] px-6 text-xs font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50"
              id="btn-add-user"
            >
              + {tipo === 'supervisor' ? 'Adicionar Supervisor' : 'Adicionar Administrador'}
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
              {users.map((u, i) => (
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
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        u.tipo === 'admin'
                          ? 'border-purple-200 bg-purple-50 text-purple-800'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {u.tipo === 'admin' ? '🛡️ Admin' : '👤 Supervisor'}
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
