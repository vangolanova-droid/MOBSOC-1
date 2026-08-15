import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  ShieldCheck,
  UserCheck,
  Eye,
  Building2,
  Phone,
  Lock,
  Mail,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import { Coordination, Mobilizador, User, UserRole } from '../types';
import { useToast } from '../context/ToastContext';
import { isAdmin, isReadOnlyEvaluator } from '../utils/permissions';

interface CadastroHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  users: User[];
  coordenacoes: Coordination[];
  onCreateMobilizador: (mob: Partial<Mobilizador>) => Promise<void>;
  onCreateUser: (usr: Partial<User>) => Promise<void>;
  initialType?: 'mobilizador' | 'supervisor' | 'admin_junior' | 'admin';
}

type CadastroCategory = 'select' | 'mobilizador' | 'supervisor' | 'admin_junior' | 'admin';

export const CadastroHubModal: React.FC<CadastroHubModalProps> = ({
  isOpen,
  onClose,
  user,
  users,
  coordenacoes,
  onCreateMobilizador,
  onCreateUser,
  initialType,
}) => {
  const { showToast } = useToast();
  const userIsAdmin = isAdmin(user);
  const userIsReadOnly = isReadOnlyEvaluator(user);

  // If supervisor, jump directly to mobilizador
  const defaultCategory = !userIsAdmin
    ? 'mobilizador'
    : initialType
    ? initialType
    : 'select';

  const [currentCategory, setCurrentCategory] = useState<CadastroCategory>(defaultCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset category on open
  React.useEffect(() => {
    if (isOpen) {
      if (!userIsAdmin) {
        setCurrentCategory('mobilizador');
      } else if (initialType) {
        setCurrentCategory(initialType);
      } else {
        setCurrentCategory('select');
      }
    }
  }, [isOpen, userIsAdmin, initialType]);

  // Form states for Mobilizador
  const [mobNome, setMobNome] = useState('');
  const [mobMorada, setMobMorada] = useState('');
  const [mobTelefone, setMobTelefone] = useState('');
  const [mobNumeroEquipa, setMobNumeroEquipa] = useState('');
  const [mobCoordId, setMobCoordId] = useState<number>(
    user.coordId || (coordenacoes.length > 0 ? coordenacoes[0].id : 1)
  );
  const [mobSupervisorId, setMobSupervisorId] = useState<number | null>(
    user.tipo === 'supervisor' ? user.id : null
  );
  const [mobRonda, setMobRonda] = useState(user.ronda || '3ª Ronda');

  // Form states for Users (Supervisor / Admin Júnior / Admin)
  const [usrNome, setUsrNome] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrSenha, setUsrSenha] = useState('');
  const [usrTelefone, setUsrTelefone] = useState('');
  const [usrMorada, setUsrMorada] = useState('');
  const [usrCoordId, setUsrCoordId] = useState<number>(
    coordenacoes.length > 0 ? coordenacoes[0].id : 1
  );
  const [usrRonda, setUsrRonda] = useState('3ª Ronda');

  // Available supervisors for assigning to a mobilizador
  const availableSupervisores = users.filter(
    (u) => (u.tipo === 'supervisor' || u.tipo === 'admin') && u.status === 'ativo'
  );

  if (!isOpen) return null;

  // Handle Mobilizador submission
  const handleMobilizadorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobNome.trim()) {
      showToast('Por favor introduza o nome completo do mobilizador.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCoord = coordenacoes.find((c) => c.id === Number(mobCoordId));
      const selectedSup = users.find((u) => u.id === Number(mobSupervisorId));

      await onCreateMobilizador({
        nome: mobNome.trim(),
        morada: mobMorada.trim() || 'Sumbe',
        telefone: mobTelefone.trim() || '—',
        numeroEquipa: mobNumeroEquipa.trim() || 'Equipa 01',
        funcao: 'Mobilizador Comunitário',
        ronda: mobRonda,
        coordId: Number(mobCoordId),
        coordNome: selectedCoord?.nome || 'Coordenação',
        supervisorId: mobSupervisorId ? Number(mobSupervisorId) : user.id,
        supervisorNome: selectedSup?.nome || user.nome,
      });

      showToast(`Mobilizador "${mobNome}" cadastrado com sucesso no RH-MC!`, 'success');
      // Reset form
      setMobNome('');
      setMobMorada('');
      setMobTelefone('');
      setMobNumeroEquipa('');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao cadastrar mobilizador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle User (Supervisor, Admin Junior, Admin) submission
  const handleUserSubmit = async (e: React.FormEvent, roleTarget: UserRole) => {
    e.preventDefault();
    if (!usrNome.trim() || !usrEmail.trim() || !usrSenha.trim()) {
      showToast('Preencha os campos obrigatórios: Nome, Email e Senha de Acesso.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCoord = coordenacoes.find((c) => c.id === Number(usrCoordId));
      const coordName =
        roleTarget === 'admin'
          ? 'Acesso Global'
          : roleTarget === 'admin_junior'
          ? 'Avaliação Global UNICEF'
          : selectedCoord?.nome || 'Coordenação';

      const coordNomeDir =
        roleTarget === 'admin'
          ? 'Gestor do Sistema'
          : roleTarget === 'admin_junior'
          ? 'Avaliador UNICEF Angola'
          : selectedCoord?.coordenador || 'Coordenação Municipal';

      await onCreateUser({
        nome: usrNome.trim(),
        email: usrEmail.trim().toLowerCase(),
        senha: usrSenha.trim(),
        telefone: usrTelefone.trim() || undefined,
        morada: usrMorada.trim() || undefined,
        tipo: roleTarget,
        ronda: roleTarget === 'supervisor' ? usrRonda : undefined,
        coordId: roleTarget === 'supervisor' ? Number(usrCoordId) : null,
        coordNome: coordName,
        coordenadorNome: coordNomeDir,
        status: 'ativo',
      });

      const labelDesc =
        roleTarget === 'admin_junior'
          ? 'Administrador Júnior (Avaliador UNICEF)'
          : roleTarget === 'supervisor'
          ? 'Supervisor de Campo'
          : 'Administrador Geral';

      showToast(`${labelDesc} "${usrNome}" registado com sucesso no sistema!`, 'success');
      // Reset form
      setUsrNome('');
      setUsrEmail('');
      setUsrSenha('');
      setUsrTelefone('');
      setUsrMorada('');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao registar utilizador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      id="modal-central-cadastros"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md font-bold">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Central Única de Cadastros
                </span>
                {userIsReadOnly && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                    Modo Visualizador UNICEF
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                {currentCategory === 'select' && 'O que deseja cadastrar?'}
                {currentCategory === 'mobilizador' && 'Cadastrar Mobilizador Comunitário (RH-MC)'}
                {currentCategory === 'supervisor' && 'Cadastrar Novo Supervisor de Campo'}
                {currentCategory === 'admin_junior' && 'Cadastrar Administrador Júnior (Avaliador UNICEF)'}
                {currentCategory === 'admin' && 'Cadastrar Administrador do Sistema'}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {userIsAdmin
                  ? 'Selecione o perfil pretendido para registar no sistema de forma organizada e segura.'
                  : 'Registo oficial de Mobilizador Comunitário sob sua supervisão de campo.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            title="Fechar"
            id="btn-close-cadastro-hub"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Read-Only Notice for Admin Junior if opened */}
        {userIsReadOnly && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5">
            <Info className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              O seu perfil é de <strong>Administrador Júnior (Avaliador UNICEF)</strong>. O seu acesso está configurado exclusivamente para visualização, análise e avaliação da plataforma para aprovação de expansão municipal. Cadastros e alterações estão bloqueados.
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto bg-white text-slate-900 space-y-6">
          {/* CATEGORY SELECTION HUB (For Admins) */}
          {currentCategory === 'select' && userIsAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Mobilizador */}
                <button
                  type="button"
                  onClick={() => setCurrentCategory('mobilizador')}
                  className="flex flex-col items-start p-4 rounded-2xl border-2 border-purple-200 hover:border-purple-500 bg-purple-50/50 hover:bg-purple-50 text-left transition duration-150 group cursor-pointer shadow-xs"
                  id="opt-cadastrar-mobilizador"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                      RH-MC
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-purple-700">
                    Mobilizador Comunitário
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Cadastrar agentes para recolha porta a porta, mercados, escolas e pontos de vacinação.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-black text-purple-700">
                    <span>Preencher Ficha RH-MC</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </button>

                {/* 2. Supervisor */}
                <button
                  type="button"
                  onClick={() => setCurrentCategory('supervisor')}
                  className="flex flex-col items-start p-4 rounded-2xl border-2 border-sky-200 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 text-left transition duration-150 group cursor-pointer shadow-xs"
                  id="opt-cadastrar-supervisor"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                      Supervisão
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700">
                    Supervisor de Campo
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Cadastrar supervisor com conta de acesso para lançar e validar dados da sua equipa e coordenação.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-black text-sky-700">
                    <span>Criar Conta Supervisor</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </button>

                {/* 3. Administrador Júnior (UNICEF / Avaliador) */}
                <button
                  type="button"
                  onClick={() => setCurrentCategory('admin_junior')}
                  className="flex flex-col items-start p-4 rounded-2xl border-2 border-amber-300 hover:border-amber-500 bg-amber-50/60 hover:bg-amber-50 text-left transition duration-150 group cursor-pointer shadow-xs"
                  id="opt-cadastrar-admin-junior"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                      <Eye className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                      Avaliador UNICEF
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-800 flex items-center gap-1.5">
                    <span>Administrador Júnior</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">Leitura</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Acesso especial para Chefes e Consultores da <strong>UNICEF</strong> avaliarem o sistema sem poder alterar dados.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-black text-amber-800">
                    <span>Configurar Acesso de Demonstração</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </button>

                {/* 4. Administrador do Sistema */}
                <button
                  type="button"
                  onClick={() => setCurrentCategory('admin')}
                  className="flex flex-col items-start p-4 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-left transition duration-150 group cursor-pointer shadow-xs"
                  id="opt-cadastrar-admin-geral"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      Gestão Total
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700">
                    Administrador Geral
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Criar conta com plenos poderes de gestão, criação de utilizadores e configurações globais.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-black text-emerald-700">
                    <span>Criar Conta Admin</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* FORM: MOBILIZADOR (RH-MC) */}
          {currentCategory === 'mobilizador' && (
            <form onSubmit={handleMobilizadorSubmit} className="space-y-4" id="form-hub-mobilizador">
              {userIsAdmin && (
                <button
                  type="button"
                  onClick={() => setCurrentCategory('select')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 cursor-pointer"
                >
                  ← Voltar para seleção de perfil
                </button>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide">
                    Registo de Mobilizador Comunitário (RH-MC)
                  </h4>
                  <p className="text-[11px] text-purple-700 font-medium">
                    Preencha os dados do mobilizador para inclusão no mapa de campo e cálculo de subsídios.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <span>Nome Completo do Mobilizador</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={userIsReadOnly}
                    value={mobNome}
                    onChange={(e) => setMobNome(e.target.value)}
                    placeholder="Ex: Afonso Neto Pereira"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition"
                    id="input-hub-mob-nome"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-purple-600" />
                    <span>Nº de Telefone</span>
                  </label>
                  <input
                    type="tel"
                    disabled={userIsReadOnly}
                    value={mobTelefone}
                    onChange={(e) => setMobTelefone(e.target.value)}
                    placeholder="Ex: 923 456 789"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition"
                    id="input-hub-mob-telefone"
                  />
                </div>

                {/* Nº da Equipa */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-purple-600" />
                    <span>Nº da Equipa</span>
                  </label>
                  <input
                    type="text"
                    disabled={userIsReadOnly}
                    value={mobNumeroEquipa}
                    onChange={(e) => setMobNumeroEquipa(e.target.value)}
                    placeholder="Ex: Equipa 01 ou 02"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition"
                    id="input-hub-mob-equipa"
                  />
                </div>

                {/* Morada */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-purple-600" />
                    <span>Morada / Bairro de Residência</span>
                  </label>
                  <input
                    type="text"
                    disabled={userIsReadOnly}
                    value={mobMorada}
                    onChange={(e) => setMobMorada(e.target.value)}
                    placeholder="Ex: Bairro 15 de Março, Sumbe"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition"
                    id="input-hub-mob-morada"
                  />
                </div>

                {/* Coordenação */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-purple-600" />
                    <span>Coordenação</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <select
                    disabled={userIsReadOnly || (!userIsAdmin && user.coordId != null)}
                    value={mobCoordId}
                    onChange={(e) => setMobCoordId(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition"
                    id="select-hub-mob-coord"
                  >
                    {coordenacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supervisor Responsável */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                    <span>Supervisor Responsável</span>
                  </label>
                  <select
                    disabled={userIsReadOnly || !userIsAdmin}
                    value={mobSupervisorId || user.id}
                    onChange={(e) => setMobSupervisorId(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition"
                    id="select-hub-mob-supervisor"
                  >
                    {!userIsAdmin ? (
                      <option value={user.id}>{user.nome} (Você)</option>
                    ) : (
                      <>
                        <option value="">Atribuir a Mim ({user.nome})</option>
                        {availableSupervisores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} ({s.coordNome || 'Sem Coord'})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-extrabold text-slate-800 transition cursor-pointer"
                  id="btn-cancel-mob-hub"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || userIsReadOnly}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  id="btn-submit-mob-hub"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'A Cadastrar...' : 'Concluir Registo de Mobilizador'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM: SUPERVISOR */}
          {currentCategory === 'supervisor' && userIsAdmin && (
            <form onSubmit={(e) => handleUserSubmit(e, 'supervisor')} className="space-y-4" id="form-hub-supervisor">
              <button
                type="button"
                onClick={() => setCurrentCategory('select')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 cursor-pointer"
              >
                ← Voltar para seleção de perfil
              </button>

              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-sky-900 uppercase tracking-wide">
                    Registo de Novo Supervisor de Campo
                  </h4>
                  <p className="text-[11px] text-sky-700 font-medium">
                    O supervisor terá permissão para cadastrar mobilizadores e lançar dados da sua coordenação.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <span>Nome Completo do Supervisor</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usrNome}
                    onChange={(e) => setUsrNome(e.target.value)}
                    placeholder="Ex: João Baptista Silva"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 outline-hidden transition"
                    id="input-hub-sup-nome"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-sky-600" />
                    <span>Email de Acesso (Login)</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={usrEmail}
                    onChange={(e) => setUsrEmail(e.target.value)}
                    placeholder="Ex: joao.supervisor@sirdm.gov"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 outline-hidden transition"
                    id="input-hub-sup-email"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-sky-600" />
                    <span>Senha Inicial de Acesso</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usrSenha}
                    onChange={(e) => setUsrSenha(e.target.value)}
                    placeholder="Ex: sup2026"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 outline-hidden transition"
                    id="input-hub-sup-senha"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-sky-600" />
                    <span>Telefone</span>
                  </label>
                  <input
                    type="tel"
                    value={usrTelefone}
                    onChange={(e) => setUsrTelefone(e.target.value)}
                    placeholder="Ex: 923 111 222"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 outline-hidden transition"
                    id="input-hub-sup-tel"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-sky-600" />
                    <span>Coordenação Atribuída</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={usrCoordId}
                    onChange={(e) => setUsrCoordId(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 outline-hidden transition"
                    id="select-hub-sup-coord"
                  >
                    {coordenacoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-extrabold text-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-black text-white shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  id="btn-submit-sup-hub"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'A Criar...' : 'Criar Conta de Supervisor'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM: ADMINISTRADOR JÚNIOR (VISUALIZADOR UNICEF) */}
          {currentCategory === 'admin_junior' && userIsAdmin && (
            <form onSubmit={(e) => handleUserSubmit(e, 'admin_junior')} className="space-y-4" id="form-hub-admin-junior">
              <button
                type="button"
                onClick={() => setCurrentCategory('select')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 cursor-pointer"
              >
                ← Voltar para seleção de perfil
              </button>

              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      Administrador Júnior (Avaliador UNICEF / Demonstração)
                    </h4>
                    <p className="text-[11px] text-amber-800 font-semibold">
                      Perfil com <strong>Acesso Total de Visualização</strong> (gráficos, relatórios, fichas, rumoures, PFA, consolidado) mas <strong>sem permissão de alteração ou eliminação</strong> de dados.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-xl border border-amber-200 font-medium">
                  💡 Ideal para enviar aos <strong>Chefes da UNICEF</strong> e tomadores de decisão para avaliarem a plataforma e emitirem o parecer de aprovação para expansão a todos os municípios.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <span>Nome do Chefe / Avaliador UNICEF</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usrNome}
                    onChange={(e) => setUsrNome(e.target.value)}
                    placeholder="Ex: Dr. Representante UNICEF Angola"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-hidden transition"
                    id="input-hub-unicef-nome"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-amber-600" />
                    <span>Email de Acesso</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={usrEmail}
                    onChange={(e) => setUsrEmail(e.target.value)}
                    placeholder="Ex: unicef.chefe@unicef.org"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-hidden transition"
                    id="input-hub-unicef-email"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Senha de Acesso</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usrSenha}
                    onChange={(e) => setUsrSenha(e.target.value)}
                    placeholder="Ex: unicef2026"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-hidden transition"
                    id="input-hub-unicef-senha"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-amber-600" />
                    <span>Telefone / Contacto Institucional</span>
                  </label>
                  <input
                    type="tel"
                    value={usrTelefone}
                    onChange={(e) => setUsrTelefone(e.target.value)}
                    placeholder="Ex: +244 923 000 000"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-hidden transition"
                    id="input-hub-unicef-tel"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-extrabold text-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-black text-slate-950 shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  id="btn-submit-unicef-hub"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'A Criar...' : 'Criar Perfil de Avaliador UNICEF'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM: ADMINISTRADOR GERAL */}
          {currentCategory === 'admin' && userIsAdmin && (
            <form onSubmit={(e) => handleUserSubmit(e, 'admin')} className="space-y-4" id="form-hub-admin-geral">
              <button
                type="button"
                onClick={() => setCurrentCategory('select')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 cursor-pointer"
              >
                ← Voltar para seleção de perfil
              </button>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                    Registo de Administrador Geral
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Acesso pleno a todas as funções, relatórios, configurações e gestão de utilizadores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <span>Nome Completo do Administrador</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usrNome}
                    onChange={(e) => setUsrNome(e.target.value)}
                    placeholder="Ex: Dra. Mariana Costa"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition"
                    id="input-hub-adm-nome"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Email de Acesso</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={usrEmail}
                    onChange={(e) => setUsrEmail(e.target.value)}
                    placeholder="Ex: mariana.admin@sirdm.gov"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition"
                    id="input-hub-adm-email"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Senha de Acesso</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usrSenha}
                    onChange={(e) => setUsrSenha(e.target.value)}
                    placeholder="Ex: adm2026"
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition"
                    id="input-hub-adm-senha"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-extrabold text-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  id="btn-submit-adm-hub"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'A Criar...' : 'Criar Conta de Administrador'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
