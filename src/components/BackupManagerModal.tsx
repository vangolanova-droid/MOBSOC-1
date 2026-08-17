import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  FileJson,
  ShieldCheck,
  Calendar,
  X,
  Play,
  Settings,
  Users,
  FileText,
  Radio,
  Activity,
} from 'lucide-react';
import {
  AutoBackupConfig,
  getAutoBackupConfig,
  saveAutoBackupConfig,
  generateFirestoreBackupPayload,
  downloadBackupJSON,
  getCachedBackupSnapshot,
  FirestoreBackupPayload,
} from '../services/backupService';
import { Ficha, Mobilizador, CasoPFA, FichaRumor, Coordination, User, ODKSubmission, AuditLog } from '../types';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichas: Ficha[];
  mobilizadores: Mobilizador[];
  casosPFA?: CasoPFA[];
  rumores?: FichaRumor[];
  coordenacoes?: Coordination[];
  users?: User[];
  odkSubmissions?: ODKSubmission[];
  auditLogs?: AuditLog[];
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  fichas,
  mobilizadores,
  casosPFA = [],
  rumores = [],
  coordenacoes = [],
  users = [],
  odkSubmissions = [],
  auditLogs = [],
}) => {
  const [config, setConfig] = useState<AutoBackupConfig>(getAutoBackupConfig);
  const [isExporting, setIsExporting] = useState(false);
  const [lastPayload, setLastPayload] = useState<FirestoreBackupPayload | null>(getCachedBackupSnapshot);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getAutoBackupConfig());
      setLastPayload(getCachedBackupSnapshot());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoBackup = (enabled: boolean) => {
    const updated = { ...config, enabled };
    setConfig(updated);
    saveAutoBackupConfig(updated);
  };

  const handleIntervalChange = (minutes: number) => {
    const updated = { ...config, intervalMinutes: minutes };
    setConfig(updated);
    saveAutoBackupConfig(updated);
  };

  const handleToggleAutoDownload = (autoDownloadOnSchedule: boolean) => {
    const updated = { ...config, autoDownloadOnSchedule };
    setConfig(updated);
    saveAutoBackupConfig(updated);
  };

  const handleExecuteManualBackup = async (andDownload: boolean = true) => {
    setIsExporting(true);
    setSuccessMessage(null);
    try {
      const payload = await generateFirestoreBackupPayload({
        fichas,
        mobilizadores,
        casosPFA,
        rumores,
        coordenacoes,
        users,
        odkSubmissions,
        auditLogs,
      });

      setLastPayload(payload);

      const totalItems =
        payload.stats.totalFichas +
        payload.stats.totalMobilizadores +
        payload.stats.totalCasosPFA +
        payload.stats.totalRumores +
        payload.stats.totalCoordenacoes;

      const updatedConfig: AutoBackupConfig = {
        ...config,
        lastBackupTime: new Date().toISOString(),
        lastBackupStatus: 'success',
        lastBackupRecordCount: totalItems,
      };

      setConfig(updatedConfig);
      saveAutoBackupConfig(updatedConfig);

      if (andDownload) {
        downloadBackupJSON(payload);
        setSuccessMessage(`Backup descarregado com sucesso! ${totalItems} registos exportados.`);
      } else {
        setSuccessMessage(`Snapshot de backup guardado em memória local com sucesso!`);
      }
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      const updatedConfig: AutoBackupConfig = {
        ...config,
        lastBackupStatus: 'failed',
      };
      setConfig(updatedConfig);
      saveAutoBackupConfig(updatedConfig);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border-2 border-slate-300 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Backup do Firestore & Redundância Local</span>
                <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px] font-black px-2.5 py-0.5">
                  JSON
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Salvaguarda periódica automática e exportação completa dos dados operacionais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Message */}
          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Fichas</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {fichas.length}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span>Mobilizadores</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {mobilizadores.length}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Activity className="h-3.5 w-3.5 text-rose-600" />
                <span>Casos PFA</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {casosPFA.length}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Radio className="h-3.5 w-3.5 text-purple-600" />
                <span>Rumores</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {rumores.length}
              </div>
            </div>
          </div>

          {/* Config Card: Backup Automático */}
          <div className="p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Rotina de Backup Periódico Automático
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gera instantâneos das coleções com redundância de armazenamento local
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.enabled && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Frequência do Backup Automático:
                  </span>
                  <div className="flex gap-1.5">
                    {[
                      { label: '30 min', val: 30 },
                      { label: '1 hora', val: 60 },
                      { label: '3 horas', val: 180 },
                      { label: '6 horas', val: 360 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => handleIntervalChange(opt.val)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                          config.intervalMinutes === opt.val
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Descarregar ficheiro .JSON automaticamente no ciclo:
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoDownloadOnSchedule}
                      onChange={(e) => handleToggleAutoDownload(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Last Backup Info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-slate-400" />
                <span>
                  Último Backup:{' '}
                  {config.lastBackupTime
                    ? new Date(config.lastBackupTime).toLocaleString('pt-PT')
                    : 'Ainda não executado nesta sessão'}
                </span>
              </div>
              {config.lastBackupTime && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{config.lastBackupRecordCount} registos</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-blue-950 dark:text-blue-200">
              <FileJson className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold">Exportação Imediata para Ficheiro JSON</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400">
                  Gera um backup completo e descarrega o ficheiro .json para o seu dispositivo agora.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleExecuteManualBackup(true)}
              disabled={isExporting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>A exportar...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Descarregar JSON Agora</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Dados estruturados com compatibilidade nativa de restauração</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
