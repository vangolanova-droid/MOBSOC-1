import React, { useState } from 'react';
import {
  UserCheck,
  KeyRound,
  ShieldCheck,
  Edit2,
  Copy,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Check,
  FileCode,
  Camera,
  Upload,
  Palette,
  Type,
  Moon,
  Sun,
  LayoutGrid,
} from 'lucide-react';
import { Coordination, PendingUpdate, User } from '../types';
import { useToast } from '../context/ToastContext';
import {
  UserThemeConfig,
  AVAILABLE_FONTS,
  THEMES,
  SIDEBAR_COLORS,
  getUserConfig,
  saveUserConfig,
  applyThemeVariables,
} from '../utils/theme';

interface PerfilViewProps {
  user: User;
  users: User[];
  coordenacoes: Coordination[];
  isOnline: boolean;
  themeConfig?: UserThemeConfig;
  onUpdateThemeConfig?: (config: UserThemeConfig) => void;
  onUpdateUser: (id: number, fields: Partial<User>) => Promise<void>;
  onClearTestData?: () => Promise<void>;
}

export const PerfilView: React.FC<PerfilViewProps> = ({
  user,
  users,
  coordenacoes,
  isOnline,
  themeConfig,
  onUpdateThemeConfig,
  onUpdateUser,
  onClearTestData,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';
  const [subTab, setSubTab] = useState<'dados' | 'aparencia' | 'senha' | 'supervisores' | 'sql' | 'database'>('dados');
  const [isClearingTest, setIsClearingTest] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Edit profile state
  const [nome, setNome] = useState(user.nome);
  const [morada, setMorada] = useState(user.morada || '');
  const [telefone, setTelefone] = useState(user.telefone || '');

  // Password state
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConf, setSenhaConf] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Admin edit supervisor state
  const [supEditId, setSupEditId] = useState<number | null>(null);
  const [supEditNome, setSupEditNome] = useState('');
  const [supEditMorada, setSupEditMorada] = useState('');
  const [supEditSenha, setSupEditSenha] = useState('');
  const [supEditConf, setSupEditConf] = useState('');

  // Pending SQL tracking
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [sqlScript, setSqlScript] = useState('');
  const [copied, setCopied] = useState(false);

  // Theme / Font / Dark Mode Handlers
  const currentConfig = themeConfig || getUserConfig();

  const handleSelectFont = (fontId: string) => {
    const updated = { ...currentConfig, fontFamily: fontId };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
    showToast(`Fonte da interface alterada para "${fontId}"!`, 'success');
  };

  const handleToggleDarkMode = () => {
    const updated = { ...currentConfig, darkMode: !currentConfig.darkMode };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
    showToast(updated.darkMode ? 'Modo Escuro Ativado!' : 'Modo Claro Ativado!', 'info');
  };

  const handleSelectThemeId = (themeId: string) => {
    const updated = { ...currentConfig, theme: themeId };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
    showToast('Tema de cores atualizado!', 'success');
  };

  const handleSelectSidebarColor = (colorId: string) => {
    const updated = { ...currentConfig, sidebarColor: colorId };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
    showToast('Cor do menu lateral (sidebar) alterada com sucesso!', 'success');
  };

  const handleSelectRadius = (radius: string) => {
    const updated = { ...currentConfig, borderRadius: radius };
    saveUserConfig(updated);
    applyThemeVariables(updated);
    if (onUpdateThemeConfig) onUpdateThemeConfig(updated);
    showToast('Arredondamento de cantos atualizado!', 'success');
  };
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor escolha um ficheiro de imagem válido.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('A imagem selecionada é muito grande. Escolha uma foto com menos de 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, Math.round(width), Math.round(height));
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          try {
            await onUpdateUser(user.id, { fotoUrl: compressedBase64 });
            showToast('Foto de perfil atualizada e guardada no Firebase com sucesso!', 'success');
          } catch (err: any) {
            showToast(err.message || 'Erro ao guardar foto de perfil no Firebase.', 'error');
          }
        }
      };
      img.onerror = () => {
        showToast('Erro ao processar imagem de perfil.', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Password strength logic
  const checkStrength = (val: string) => {
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  };

  const strengthScore = checkStrength(senhaNova);
  const strengthLabels = ['Múltiplos caracteres', 'Fraca', 'Razoável', 'Boa', 'Muito Forte'];
  const strengthColors = ['bg-slate-700', 'bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

  const handleSaveNome = async () => {
    if (!nome.trim()) return;
    try {
      await onUpdateUser(user.id, {
        nome: nome.trim(),
        morada: morada.trim(),
        telefone: telefone.trim(),
      });
      setPendingUpdates((prev) => [
        ...prev,
        {
          type: 'nome',
          userId: user.id,
          email: user.email,
          nome: nome.trim(),
          timestamp: new Date().toISOString(),
        },
      ]);
      showToast('Dados do perfil atualizados com sucesso!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao atualizar dados do perfil.', 'error');
    }
  };

  const handleSaveSenha = async () => {
    if (!senhaAtual || !senhaNova || !senhaConf) {
      showToast('Preencha todos os campos de senha.', 'error');
      return;
    }
    if (senhaAtual !== user.senha) {
      showToast('A senha atual está incorreta.', 'error');
      return;
    }
    if (senhaNova.length < 4) {
      showToast('A nova senha deve ter pelo menos 4 caracteres.', 'error');
      return;
    }
    if (senhaNova !== senhaConf) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }

    try {
      await onUpdateUser(user.id, { senha: senhaNova });
      setPendingUpdates((prev) => [
        ...prev,
        {
          type: 'senha',
          userId: user.id,
          email: user.email,
          senha: senhaNova,
          timestamp: new Date().toISOString(),
        },
      ]);
      setSenhaAtual('');
      setSenhaNova('');
      setSenhaConf('');
      showToast('Senha alterada com sucesso!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao alterar senha.', 'error');
    }
  };

  const handleOpenSupEdit = (s: User) => {
    setSupEditId(s.id);
    setSupEditNome(s.nome);
    setSupEditMorada(s.morada || '');
    setSupEditSenha('');
    setSupEditConf('');
  };

  const handleSaveSupEdit = async () => {
    if (!supEditId) return;
    if (!supEditNome.trim()) {
      showToast('O nome não pode estar vazio.', 'error');
      return;
    }
    if (supEditSenha && supEditSenha !== supEditConf) {
      showToast('As senhas do supervisor não coincidem.', 'error');
      return;
    }

    const fields: Partial<User> = {
      nome: supEditNome.trim(),
      morada: supEditMorada.trim(),
    };
    if (supEditSenha) fields.senha = supEditSenha;

    try {
      await onUpdateUser(supEditId, fields);
      const targetUser = users.find((u) => u.id === supEditId);
      if (targetUser) {
        setPendingUpdates((prev) => [
          ...prev,
          {
            type: 'nome_supervisor',
            userId: supEditId,
            email: targetUser.email,
            nome: supEditNome.trim(),
            senha: supEditSenha || undefined,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
      setSupEditId(null);
      showToast('Dados do supervisor guardados com sucesso!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao atualizar supervisor.', 'error');
    }
  };

  const generateSql = () => {
    const now = new Date().toLocaleString('pt-PT');
    let sql = `-- ═══════════════════════════════════════════════════════════\n`;
    sql += `-- SirDm — Script de Atualização de Utilizadores (PostgreSQL / Supabase)\n`;
    sql += `-- Gerado em : ${now}\n`;
    sql += `-- Emitido por: ${user.nome} (${user.email})\n`;
    sql += `-- Status     : ${isOnline ? 'SERVIDORES SINCRONIZADOS' : 'MODO OFFLINE — EXECUTAR NO SUPABASE DASHBOARD'}\n`;
    sql += `-- ═══════════════════════════════════════════════════════════\n\n`;

    if (pendingUpdates.length === 0) {
      sql += `-- Nenhuma alteração pendente nesta sessão.\n`;
    } else {
      pendingUpdates.forEach((p, idx) => {
        sql += `-- ── Alteração ${idx + 1}: ${p.type} (${p.email}) ──────────\n`;
        if (p.nome) {
          sql += `UPDATE users SET nome = '${p.nome.replace(/'/g, "''")}' WHERE id = ${p.userId};\n`;
        }
        if (p.senha) {
          sql += `UPDATE users SET senha = '${p.senha.replace(/'/g, "''")}' WHERE id = ${p.userId};\n`;
        }
        sql += `\n`;
      });
    }

    sql += `-- Verificação de tabela\nSELECT id, nome, email, tipo FROM users ORDER BY id;\n`;
    setSqlScript(sql);
  };

  const copySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSql = () => {
    if (!sqlScript) generateSql();
    const blob = new Blob([sqlScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SirDm_Update_Users_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3.5">
      {/* Profile Header Banner */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Roda do Perfil (Interactive Avatar Frame with Photo Uploader) */}
            <div className="relative group shrink-0">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#0B5CAD] text-xl font-black text-white shadow-md border-2 border-white dark:border-slate-800">
                {user.fotoUrl ? (
                  <img src={user.fotoUrl} alt={user.nome} className="h-full w-full object-cover" />
                ) : (
                  <span>{user.nome.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <label
                htmlFor="upload-profile-photo-banner"
                className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#2E7D32] text-white shadow-md hover:bg-[#256729] transition border-2 border-white"
                title="Adicionar ou alterar imagem do perfil"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  id="upload-profile-photo-banner"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#0B5CAD]">{user.nome}</h1>
                <label
                  htmlFor="upload-profile-photo-banner"
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#2E7D32] hover:underline"
                >
                  <Upload className="h-3 w-3" />
                  <span>Alterar Imagem</span>
                </label>
              </div>
              <p className="text-xs text-slate-600">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-[#2E7D32]">
                  {user.tipo === 'admin' ? '🛡️ Administrador Global' : '👤 Supervisor Operacional'}
                </span>
                <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0B5CAD]">
                  {user.coordNome || 'Geral'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600">
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline ? 'bg-[#2E7D32] animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-bold">{isOnline ? 'Servidor Conectado' : 'Modo Offline Ativo'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Details Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Utilizador
          </span>
          <p className="text-sm font-bold text-slate-800">{user.nome}</p>
          <span className="text-[11px] text-slate-500">{user.email}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Função / Perfil
          </span>
          <p className="text-sm font-bold text-[#0B5CAD]">
            {user.tipo === 'admin' ? 'Gestor do Sistema (Admin)' : `Supervisor — ${user.coordNome || 'Geral'}`}
          </p>
          <span className="text-[11px] text-slate-500">Acesso ao Sistema</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 w-fit">
        <button
          onClick={() => setSubTab('dados')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            subTab === 'dados'
              ? 'bg-white dark:bg-slate-800 text-[#0B5CAD] dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          id="tab-sub-dados"
        >
          <UserCheck className="h-4 w-4" />
          <span>Os Meus Dados</span>
        </button>

        <button
          onClick={() => setSubTab('aparencia')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            subTab === 'aparencia'
              ? 'bg-white dark:bg-slate-800 text-[#0B5CAD] dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          id="tab-sub-aparencia"
        >
          <Palette className="h-4 w-4" />
          <span>Aparência & Fontes</span>
        </button>

        {/* Alterar Senha disponível EXCLUSIVAMENTE para o Administrador */}
        {isAdmin && (
          <button
            onClick={() => setSubTab('senha')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              subTab === 'senha'
                ? 'bg-white dark:bg-slate-800 text-[#0B5CAD] dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            id="tab-sub-senha"
          >
            <KeyRound className="h-4 w-4" />
            <span>Alterar Senha</span>
          </button>
        )}

        {isAdmin && (
          <>
            <button
              onClick={() => setSubTab('supervisores')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                subTab === 'supervisores'
                  ? 'bg-white dark:bg-slate-800 text-[#0B5CAD] dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              id="tab-sub-supervisores"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Gerir Supervisores</span>
            </button>

            <button
              onClick={() => {
                setSubTab('sql');
                generateSql();
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                subTab === 'sql'
                  ? 'bg-white dark:bg-slate-800 text-[#0B5CAD] dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              id="tab-sub-sql"
            >
              <FileCode className="h-4 w-4" />
              <span>Exportar SQL</span>
            </button>

            <button
              onClick={() => setSubTab('database')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                subTab === 'database'
                  ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              id="tab-sub-database"
            >
              <Trash2 className="h-4 w-4" />
              <span>Base de Dados & Testes</span>
            </button>
          </>
        )}
      </div>

      {/* SUB-TAB: Os Meus Dados */}
      {subTab === 'dados' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#0B5CAD]">Editar Perfil Pessoal</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                id="input-perfil-nome"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                Morada / Residência
              </label>
              <input
                type="text"
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
                placeholder="Ex: Bairro Mbumba Kupuco, Sumbe"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                id="input-perfil-morada"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                id="input-perfil-telefone"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Email (Não alterável)
              </label>
              <input
                type="email"
                readOnly
                value={user.email}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveNome}
            className="rounded-xl bg-[#2E7D32] hover:bg-[#246328] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition"
            id="btn-save-perfil-nome"
          >
            Guardar Nome
          </button>
        </div>
      )}

      {/* SUB-TAB: Aparência & Fontes da Interface */}
      {subTab === 'aparencia' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Dark Mode Control Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  {currentConfig.darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-500" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Modo Escuro (Dark Mode)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentConfig.darkMode
                      ? 'Interface ajustada para poupar os olhos em ambientes escuros.'
                      : 'Interface clara institucional em alta visibilidade.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleDarkMode}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  currentConfig.darkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                id="btn-toggle-darkmode-perfil"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    currentConfig.darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Interface Font Picker Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Fontes da Interface SirDm ({AVAILABLE_FONTS.length} Opções Disponíveis)
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
                Fonte Atual: {currentConfig.fontFamily}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha a tipografia oficial da sua preferência. A fonte será aplicada em tempo real em todos os botões, tabelas, relatórios e menus do sistema.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {AVAILABLE_FONTS.map((font) => {
                const isSelected = currentConfig.fontFamily === font.id || currentConfig.fontFamily === font.name;
                return (
                  <button
                    key={font.id}
                    onClick={() => handleSelectFont(font.id)}
                    style={{ fontFamily: font.fontFamily }}
                    className={`rounded-2xl border p-3.5 text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-sm truncate">{font.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-1">
                      {font.category}
                    </span>
                    <div className="mt-2 text-xs opacity-75 font-normal tracking-tight line-clamp-1 border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                      Sistema de Mobilização SirDm 2026
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Palette Selector Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tema de Cores da Aplicação</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {THEMES.map((t) => {
                const isSelected = (currentConfig.theme || 'cyan_sismob') === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectThemeId(t.id)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-4 w-4 rounded-full border border-white dark:border-slate-900 shadow-2xs shrink-0"
                        style={{ backgroundColor: t.colors.primary }}
                      />
                      <span className="font-bold text-[11px] truncate">{t.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Color Picker Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cor do Menu Lateral (Sidebar)
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Escolha a cor de fundo do menu lateral do SirDm. É aplicado instantaneamente.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SIDEBAR_COLORS.map((col) => {
                const isSelected = (currentConfig.sidebarColor || 'default') === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => handleSelectSidebarColor(col.id)}
                    className={`rounded-xl border p-3 text-left transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                    style={{
                      backgroundColor: col.bg,
                      color: col.text,
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-4 w-4 rounded-full border shrink-0"
                        style={{ backgroundColor: col.bg, borderColor: col.border }}
                      />
                      <span className="text-xs font-bold truncate">{col.name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Border Radius Control Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Arredondamento de Cantos</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '8', label: 'Suave (8px)' },
                { id: '12', label: 'Padrão (12px)' },
                { id: '16', label: 'Acentuado (16px)' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRadius(r.id)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${
                    currentConfig.borderRadius === r.id
                      ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: Alterar Senha (Apenas Administrador) */}
      {subTab === 'senha' && isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 max-w-lg">
          <h2 className="text-sm font-bold text-[#0B5CAD]">Segurança da Conta</h2>

          <div>
            <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
              Senha Atual
            </label>
            <div className="relative mt-1">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                id="input-perfil-senha-atual"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
              Nova Senha
            </label>
            <div className="relative mt-1">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                id="input-perfil-senha-nova"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {senhaNova && (
              <div className="mt-2 space-y-1">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strengthColors[Math.min(strengthScore, 4)]
                    }`}
                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500">
                  Força da senha:{' '}
                  <span className="font-bold text-slate-700">
                    {strengthLabels[Math.min(strengthScore, 4)]}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={senhaConf}
              onChange={(e) => setSenhaConf(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
              id="input-perfil-senha-conf"
            />
          </div>

          <button
            onClick={handleSaveSenha}
            className="rounded-xl bg-[#2E7D32] hover:bg-[#246328] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition"
            id="btn-save-perfil-senha"
          >
            Alterar Senha
          </button>
        </div>
      )}

      {/* SUB-TAB: Gerir Supervisores (Admin) */}
      {subTab === 'supervisores' && isAdmin && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 text-xs font-bold text-[#0B5CAD]">
              Supervisores Registados no Sistema
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-white text-[11px] font-bold tracking-wider text-[#0B5CAD] uppercase">
                  <tr>
                    <th className="p-3">Nome / Morada</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Coordenação</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users
                    .filter((u) => u.tipo === 'supervisor')
                    .map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-800">
                          <div>{sup.nome}</div>
                          {sup.morada && (
                            <div className="text-[10px] text-sky-700 font-normal mt-0.5">
                              📍 {sup.morada}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{sup.email}</td>
                        <td className="p-3 font-medium text-slate-700">{sup.coordNome || '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleOpenSupEdit(sup)}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-[#0B5CAD] hover:bg-slate-50 ml-auto cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supervisor Edit Panel */}
          {supEditId && (
            <div className="rounded-2xl border border-[#2E7D32]/40 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#2E7D32]">
                A Editar Supervisor: {supEditNome}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={supEditNome}
                    onChange={(e) => setSupEditNome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                    Morada / Residência
                  </label>
                  <input
                    type="text"
                    value={supEditMorada}
                    onChange={(e) => setSupEditMorada(e.target.value)}
                    placeholder="Ex: Bairro Mbumba Kupuco, Sumbe"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase">
                    Repor Senha (Opcional)
                  </label>
                  <input
                    type="password"
                    value={supEditSenha}
                    onChange={(e) => setSupEditSenha(e.target.value)}
                    placeholder="Nova senha (deixe vazio para não alterar)"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0B5CAD]"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSupEdit}
                  className="rounded-xl bg-[#2E7D32] hover:bg-[#246328] px-5 py-2 text-xs font-bold text-white"
                >
                  Guardar Alterações
                </button>
                <button
                  onClick={() => setSupEditId(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: Exportar SQL (Admin) */}
      {subTab === 'sql' && isAdmin && (
        <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-purple-800">
                Gerador de Scripts SQL (PostgreSQL / Supabase)
              </h2>
              <p className="text-xs text-slate-600">
                Gere e exporte instruções SQL para aplicar alterações de utilizadores no banco de dados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copySql}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {copied ? <Check className="h-4 w-4 text-[#2E7D32]" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
              <button
                onClick={downloadSql}
                className="flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 px-3.5 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100"
              >
                <Download className="h-4 w-4" />
                <span>Descarregar .sql</span>
              </button>
            </div>
          </div>

          <pre className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs text-[#2E7D32] leading-relaxed whitespace-pre-wrap">
            {sqlScript || '-- Clique em "Gerar SQL" para visualizar o script.'}
          </pre>
        </div>
      )}

      {/* SUB-TAB: Gestão da Base de Dados & Limpar Testes (Admin) */}
      {subTab === 'database' && isAdmin && (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <span>Gestão da Base de Dados & Limpeza de Testes</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Elimine dados e fichas de teste guardados na base de dados Firebase para preparar o sistema para o ambiente de produção real.
              </p>
            </div>
            <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
              Ação de Administrador
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sincronização & Limpeza Firebase Firestore
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ao executar a eliminação dos dados de teste, todas as fichas de mobilização de teste, registos temporários de mobilizadores e logs de teste serão removidos diretamente do projeto Firebase.
            </p>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="mt-2 flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
              >
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Todos os Dados de Teste da Base de Dados</span>
              </button>
            ) : (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
                <p className="text-xs font-bold text-red-900">
                  ⚠️ Tem a certeza absoluta? Esta ação apaga os dados de teste na base de dados Firebase e não pode ser desfeita.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    disabled={isClearingTest}
                    onClick={async () => {
                      if (!onClearTestData) return;
                      setIsClearingTest(true);
                      try {
                        await onClearTestData();
                        showToast('Dados de teste eliminados com sucesso da base de dados Firebase!', 'success');
                        setShowClearConfirm(false);
                      } catch (err: any) {
                        showToast(err.message || 'Erro ao eliminar dados de teste.', 'error');
                      } finally {
                        setIsClearingTest(false);
                      }
                    }}
                    className="rounded-xl bg-red-700 hover:bg-red-800 px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                  >
                    {isClearingTest ? 'A eliminar do Firebase...' : 'Confirmar e Eliminar do Firebase'}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
