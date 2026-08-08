import React, { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, UserCheck, Lock, Notebook } from 'lucide-react';
import { Coordination, User, UserRole } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';

interface UtilizadoresViewProps {
  users: User[];
  coordenacoes: Coordination[];
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  onOpenNotepad?: () => void;
}

export const UtilizadoresView: React.FC<UtilizadoresViewProps> = ({
  users,
  coordenacoes,
  onCreateUser,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State for Delete Confirmation
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        coordId: tipo === 'admin' ? null : Number(coordId),
        coordNome: tipo === 'admin' ? 'Acesso Global' : selectedCoord?.nome || '—',
        coordenadorNome: tipo === 'admin' ? 'Direção Geral' : selectedCoord?.coordenador || '—',
      });
      showToast('Utilizador criado com sucesso!', 'success');
      setNome('');
      setEmail('');
      setSenha('');
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

          {tipo === 'supervisor' ? (
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
          ) : (
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#00B2FF] hover:bg-[#009ee3] text-xs font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50"
                id="btn-add-user"
              >
                + Adicionar Utilizador
              </button>
            </div>
          )}

          {tipo === 'supervisor' && (
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-[#00B2FF] hover:bg-[#009ee3] px-6 text-xs font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50"
                id="btn-add-supervisor"
              >
                + Adicionar Supervisor
              </button>
            </div>
          )}
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
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Perfil</th>
                <th className="p-3.5">Coordenação</th>
                <th className="p-3.5">Coordenador Responsável</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-mono text-slate-400">{i + 1}</td>
                  <td className="p-3.5 font-semibold text-slate-900">{u.nome}</td>
                  <td className="p-3.5 font-mono text-slate-600">{u.email}</td>
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
                    {u.id === 1 ? (
                      <span className="text-xs text-slate-400 font-mono">Protegido</span>
                    ) : (
                      <button
                        onClick={() => setDeletingUser(u)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Remover Utilizador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
