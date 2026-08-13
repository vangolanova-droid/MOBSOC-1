import React, { useState, useEffect } from 'react';
import {
  Notebook,
  X,
  Copy,
  Download,
  Trash2,
  Plus,
  CheckCircle2,
  Lock,
  KeyRound,
  FileText,
  Clock,
} from 'lucide-react';
import { User, Coordination } from '../types';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface BlocoDeNotasModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: User[];
  coordenacoes?: Coordination[];
}

export const BlocoDeNotasModal: React.FC<BlocoDeNotasModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Form for quick adding a supervisor credential
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newCoord, setNewCoord] = useState('');

  // Load notes from Firestore on mount or open
  useEffect(() => {
    if (isOpen) {
      api.getNotepad().then((saved) => {
        if (saved !== null) {
          setNotes(saved);
        } else {
          setNotes('');
        }
        setLastSaved(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }));
      });
    }
  }, [isOpen]);

  // Autosave when notes change
  const handleNotesChange = (text: string) => {
    setNotes(text);
    api.saveNotepad(text);
    setLastSaved(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }));
  };

  // Action: Add quick credential to note
  const handleAddQuickCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim() || !newEmail.trim()) {
      showToast('Preencha pelo menos o Nome e Email do Supervisor.', 'error');
      return;
    }

    const entry = `\n📌 NOVO SUPERVISOR ADICIONADO MANUALMENTE:\n` +
      `   • Nome        : ${newNome.trim()}\n` +
      `   • Email/User  : ${newEmail.trim()}\n` +
      `   • Senha/Passe : ${newSenha.trim() || '123456'}\n` +
      `   • Coordenação : ${newCoord.trim() || 'Geral'}\n` +
      `   • Data Registo: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `   -------------------------------------------------\n`;

    const updatedText = notes + entry;
    handleNotesChange(updatedText);

    setNewNome('');
    setNewEmail('');
    setNewSenha('');
    setNewCoord('');
    showToast(`Credenciais de "${newNome}" adicionadas ao Bloco de Notas!`, 'success');
  };

  // Action: Copy all notes
  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    showToast('Notas copiadas para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  // Action: Download text file
  const handleDownloadNotes = () => {
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bloco_de_Notas_Supervisores_SisMob_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Ficheiro de notas descarregado (.txt)!', 'success');
  };

  // Action: Clear Notepad
  const handleClearNotes = () => {
    if (window.confirm('Tem a certeza que deseja limpar todo o Bloco de Notas?')) {
      handleNotesChange('');
      showToast('Bloco de notas limpo.', 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-300 bg-white shadow-2xl overflow-hidden text-[#333333]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-inner">
              <Notebook className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Bloco de Notas do Administrador</h2>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">
                  Uso Exclusivo Admin
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-medium">
                Guarde nomes, senhas, acessos e apontamentos dos supervisores em segurança.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Fechar Bloco de Notas"
            id="btn-close-notepad"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">
          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Autoguardado às {lastSaved || 'agora'}</span>
              <span className="text-slate-300">•</span>
              <span>{notes.length} caracteres</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyNotes}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                id="btn-copy-notepad"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-600" />
                    <span>Copiar Notas</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadNotes}
                className="flex items-center gap-1.5 rounded-xl bg-[#0B5CAD] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#084887] transition shadow-2xs"
                id="btn-download-notepad"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descarregar .TXT</span>
              </button>

              <button
                onClick={handleClearNotes}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                title="Limpar Bloco de Notas"
                id="btn-clear-notepad"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Add Form Box */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
              <KeyRound className="h-4 w-4 text-amber-700" />
              <span>Adicionar Credencial de Supervisor Manualmente ao Bloco</span>
            </div>

            <form onSubmit={handleAddQuickCredential} className="grid grid-cols-1 gap-2.5 sm:grid-cols-5 text-xs">
              <div>
                <input
                  type="text"
                  placeholder="Nome do Supervisor"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Email / Utilizador"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Senha / Passe (Ex: 123456)"
                  value={newSenha}
                  onChange={(e) => setNewSenha(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs font-mono font-bold text-amber-900 placeholder-slate-400 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Coordenação / Área"
                  value={newCoord}
                  onChange={(e) => setNewCoord(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full h-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                  id="btn-add-quick-credential"
                >
                  <Plus className="h-4 w-4" />
                  <span>Inserir Nota</span>
                </button>
              </div>
            </form>
          </div>

          {/* Main Text Area */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#0B5CAD]" />
              <span>Edição Livre de Notas & Acessos</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Escreva aqui as suas notas, contactos e senhas dos supervisores..."
              rows={16}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 font-mono text-xs text-slate-800 leading-relaxed shadow-inner outline-none focus:border-[#0B5CAD] focus:ring-2 focus:ring-[#0B5CAD]/20 transition resize-y"
              id="textarea-admin-notepad"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-amber-600" />
            <span>As suas notas são armazenadas com segurança no navegador do Administrador.</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#0B5CAD] px-6 py-2 text-xs font-bold text-white hover:bg-[#084887] transition shadow-xs"
            id="btn-close-notepad-footer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
