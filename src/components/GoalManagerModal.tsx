import React, { useState, useEffect } from 'react';
import { Target, X, Save, RefreshCw, CheckCircle, Sliders, AlertTriangle } from 'lucide-react';
import { Coordination, CoordinationGoal } from '../types';
import { useToast } from '../context/ToastContext';

interface GoalManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordenacoes: Coordination[];
  goals: CoordinationGoal[];
  onSaveGoal: (goal: CoordinationGoal) => Promise<void>;
}

export const GoalManagerModal: React.FC<GoalManagerModalProps> = ({
  isOpen,
  onClose,
  coordenacoes,
  goals,
  onSaveGoal,
}) => {
  const { showToast } = useToast();
  const [localGoals, setLocalGoals] = useState<Record<number, CoordinationGoal>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const map: Record<number, CoordinationGoal> = {};
    coordenacoes.forEach((c) => {
      const existing = goals.find((g) => g.coordId === c.id);
      map[c.id] = existing || {
        coordId: c.id,
        targetPessoas: 5000,
        targetLocais: 200,
        targetFichas: 80,
      };
    });
    setLocalGoals(map);
  }, [coordenacoes, goals, isOpen]);

  if (!isOpen) return null;

  const handleChange = (coordId: number, field: keyof CoordinationGoal, val: number) => {
    setLocalGoals((prev) => ({
      ...prev,
      [coordId]: {
        ...prev[coordId],
        [field]: Math.max(0, val),
      },
    }));
  };

  const handleApplyPreset = (multiplier: number) => {
    setLocalGoals((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const id = Number(key);
        updated[id] = {
          ...updated[id],
          targetPessoas: Math.round(5000 * multiplier),
          targetLocais: Math.round(200 * multiplier),
          targetFichas: Math.round(80 * multiplier),
        };
      });
      return updated;
    });
    showToast(`Metas atualizadas com multiplicador ${multiplier}x! Lembre-se de guardar.`, 'info');
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const promises = Object.values(localGoals).map((g) => onSaveGoal(g));
      await Promise.all(promises);
      showToast('Metas da campanha guardadas e sincronizadas com sucesso!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao guardar metas.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const totalSumbeTarget = Object.values(localGoals).reduce((s: number, g: CoordinationGoal) => s + (g.targetPessoas || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-sm">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Gestor de Metas & Indicadores Alvo da Campanha
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste os objetivos de mobilização por Coordenação (Município do Sumbe)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Quick Presets Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                Meta Global Estimada do Sumbe: {totalSumbeTarget.toLocaleString()} pessoas
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-400">
                Calculada pela soma das metas de todas as coordenações
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(1)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-blue-300 bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-slate-700 transition"
              >
                Sumbe Padrão (5k/coord)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(1.5)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-blue-300 bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-slate-700 transition"
              >
                Campanha Alargada (1.5x)
              </button>
            </div>
          </div>

          {/* Coordination Goals Table / Inputs */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Definição de Objetivos por Coordenação
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {coordenacoes.map((c) => {
                const item = localGoals[c.id] || {
                  coordId: c.id,
                  targetPessoas: 5000,
                  targetLocais: 200,
                  targetFichas: 80,
                };

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{c.nome}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {c.coordenador || 'Sem coordenador'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Bairros: {c.bairros && c.bairros.length > 0 ? c.bairros.join(', ') : 'Todos do setor'}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Meta Pessoas
                        </label>
                        <input
                          type="number"
                          value={item.targetPessoas}
                          onChange={(e) => handleChange(c.id, 'targetPessoas', parseInt(e.target.value) || 0)}
                          className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Meta Fichas
                        </label>
                        <input
                          type="number"
                          value={item.targetFichas}
                          onChange={(e) => handleChange(c.id, 'targetFichas', parseInt(e.target.value) || 0)}
                          className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Meta Locais
                        </label>
                        <input
                          type="number"
                          value={item.targetLocais}
                          onChange={(e) => handleChange(c.id, 'targetLocais', parseInt(e.target.value) || 0)}
                          className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar Metas da Campanha</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
