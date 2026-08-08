import React, { useState } from 'react';
import { ShieldCheck, X, Search, FileText, Download, Filter, User, Clock, AlertCircle } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  if (!isOpen) return null;

  const safeLogs = Array.isArray(logs) ? logs : [];

  const filteredLogs = safeLogs.filter((log) => {
    if (!log) return false;
    const matchesSearch =
      (log.usuarioNome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.detalhes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entidade || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.acao === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (acao: string) => {
    switch (acao) {
      case 'Criação':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Edição':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Eliminação':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Login':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('pt-PT');
    } catch {
      return isoString;
    }
  };

  const handleExportLogs = () => {
    let text = `====================================================\n`;
    text += `   RELATÓRIO DE AUDITORIA E HISTÓRICO DE ALTERAÇÕES\n`;
    text += `   Data de Emissão: ${new Date().toLocaleString('pt-PT')}\n`;
    text += `====================================================\n\n`;

    filteredLogs.forEach((log, i) => {
      text += `${i + 1}. [${formatDate(log.timestamp)}] - ${(log.acao || '').toUpperCase()}\n`;
      text += `   Utilizador : ${log.usuarioNome || 'Desconhecido'} (${log.usuarioTipo || '—'})\n`;
      text += `   Entidade   : ${log.entidade || '—'}\n`;
      text += `   Detalhes   : ${log.detalhes || '—'}\n`;
      text += `   -------------------------------------------------\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_SisMob_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-blue-300 bg-white shadow-2xl overflow-hidden text-[#333333]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-200 bg-gradient-to-r from-[#0B5CAD] via-blue-800 to-indigo-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Histórico de Auditoria & Segurança</h2>
              <p className="text-xs text-blue-100">
                Registo chronológico de edições, eliminações e alterações realizadas por utilizadores.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por utilizador, detalhes ou acção..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs font-semibold outline-none focus:border-[#0B5CAD]"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0B5CAD]"
            >
              <option value="all">Todas as Ações</option>
              <option value="Criação">Criação</option>
              <option value="Edição">Edição</option>
              <option value="Eliminação">Eliminação</option>
              <option value="Login">Login</option>
            </select>
          </div>

          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 rounded-xl bg-[#0B5CAD] px-4 py-2 text-xs font-bold text-white hover:bg-[#084887] transition shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Histórico</span>
          </button>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400 space-y-2">
              <AlertCircle className="h-10 w-10 stroke-1" />
              <p className="text-xs font-semibold">Nenhum registo de auditoria encontrado para os filtros.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shrink-0 ${getActionBadge(
                      log.acao
                    )}`}
                  >
                    {log.acao}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">{log.detalhes}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#0B5CAD]" />
                        <strong>{log.usuarioNome}</strong> ({log.usuarioTipo})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Total de registos auditados: <strong>{filteredLogs.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 border border-slate-300 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
