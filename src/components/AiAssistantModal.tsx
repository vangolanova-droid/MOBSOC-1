import React, { useState } from 'react';
import { Sparkles, X, Loader2, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { AIInsightResponse, Ficha } from '../types';
import { api } from '../services/api';

interface AiAssistantModalProps {
  fichas: Ficha[];
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  fichas,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<AIInsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAiInsights(fichas);
      setInsight(res);
    } catch (err: any) {
      setError(
        err.message ||
          'Não foi possível gerar a análise por IA. Verifique se a GEMINI_API_KEY está configurada.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-[#0B5CAD] border border-sky-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0B5CAD]">
                Análise Inteligente de Mobilização (Gemini AI)
              </h3>
              <p className="text-xs text-[#333333]">
                Apreciação automatizada das estatísticas de vacinação no terreno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {!insight && !loading && !error && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-[#0B5CAD]">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Clique no botão abaixo para processar com Inteligência Artificial as{' '}
              <span className="font-bold text-[#2E7D32]">{fichas.length} fichas</span> de
              mobilização registadas, identificando zonas de hesitação e gerando recomendações para a equipa.
            </p>
            <button
              onClick={handleGenerate}
              className="rounded-xl bg-[#2E7D32] hover:bg-[#246328] px-6 py-3 text-xs font-bold text-white shadow-md transition"
              id="btn-run-ai-generate"
            >
              🚀 Iniciar Análise IA
            </button>
          </div>
        )}

        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0B5CAD]" />
            <p className="text-xs font-bold text-slate-700">
              A analisar dados de mobilização comunitária com Gemini AI...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Erro de Processamento</span>
            </div>
            <p>{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 rounded-lg bg-red-100 border border-red-300 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-200"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {insight && (
          <div className="space-y-4 text-xs">
            {/* Situational Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <div className="font-bold text-[#0B5CAD] uppercase tracking-wider text-[10px]">
                Resumo Situacional
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">{insight.summary}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <div className="text-lg font-bold font-mono text-[#2E7D32]">
                  {insight.keyStats.totalPessoas.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Habitantes</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <div className="text-lg font-bold font-mono text-[#0B5CAD]">
                  {insight.keyStats.acceptanceRate}%
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Aceitação</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {insight.keyStats.topLocation || 'Casa a Casa'}
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Ponto Principal</div>
              </div>
            </div>

            {/* Recommendations */}
            {insight.recommendations && insight.recommendations.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <div className="font-bold text-[#2E7D32] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Recomendações Estratégicas para os Mobilizadores</span>
                </div>
                <ul className="space-y-1 text-slate-800 list-disc list-inside">
                  {insight.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Official Bulletin Draft */}
            {insight.officialBulletinDraft && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="font-bold text-amber-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Rascunho de Boletim Oficial de Saúde</span>
                </div>
                <p className="text-slate-800 italic font-serif leading-relaxed">
                  "{insight.officialBulletinDraft}"
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
