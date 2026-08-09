import React, { useState } from 'react';
import { Layers, MapPin, FileText, TrendingUp, BarChart2, GitCompare } from 'lucide-react';
import { Ficha, User } from '../types';
import { exportConsolidadoPDF } from '../utils/pdfExporter';

interface ConsolidadoViewProps {
  user: User;
  fichas: Ficha[];
}

export const ConsolidadoView: React.FC<ConsolidadoViewProps> = ({ user, fichas }) => {
  const [rondaA, setRondaA] = useState<string>('1ª Ronda');
  const [rondaB, setRondaB] = useState<string>('2ª Ronda');

  const visibleFichas =
    user.tipo === 'admin'
      ? fichas
      : fichas.filter((f) => f.coordId === user.coordId);

  // Group by Ronda
  const rondasDisponiveis = Array.from(
    new Set(fichas.map((f) => f.ronda || '1ª Ronda'))
  ).sort();

  if (!rondasDisponiveis.includes('1ª Ronda')) rondasDisponiveis.push('1ª Ronda');
  if (!rondasDisponiveis.includes('2ª Ronda')) rondasDisponiveis.push('2ª Ronda');

  const getRondaStats = (rondaName: string) => {
    const rFichas = visibleFichas.filter((f) => (f.ronda || '1ª Ronda') === rondaName);
    const countFichas = rFichas.length;
    const pessoas = rFichas.reduce((acc, f) => acc + (f.totalPessoas || 0), 0);
    const locais = rFichas.reduce((acc, f) => acc + (f.totalLocais || 0), 0);
    const sim = rFichas.reduce((acc, f) => acc + (f.sim || 0), 0);
    const nao = rFichas.reduce((acc, f) => acc + (f.nao || 0), 0);
    const totalResp = sim + nao;
    const aceitacao = totalResp > 0 ? Math.round((sim / totalResp) * 100) : 0;
    return { countFichas, pessoas, locais, aceitacao };
  };

  const statsA = getRondaStats(rondaA);
  const statsB = getRondaStats(rondaB);

  // Calculate growth
  const diffPessoas = statsB.pessoas - statsA.pessoas;
  const growthPct = statsA.pessoas > 0 ? Math.round((diffPessoas / statsA.pessoas) * 100) : 0;

  // Map grouping by location key
  const aggMap: Record<
    string,
    {
      provincia: string;
      municipio: string;
      comuna: string;
      bairro: string;
      countFichas: number;
      locais: number;
      pessoas: number;
      sim: number;
      nao: number;
    }
  > = {};

  visibleFichas.forEach((f) => {
    const key = `${f.provincia}|${f.municipio}|${f.comuna || 'SEDE'}|${f.bairro || 'Geral'}`;
    if (!aggMap[key]) {
      aggMap[key] = {
        provincia: f.provincia,
        municipio: f.municipio,
        comuna: f.comuna || 'SEDE',
        bairro: f.bairro || 'Geral',
        countFichas: 0,
        locais: 0,
        pessoas: 0,
        sim: 0,
        nao: 0,
      };
    }
    aggMap[key].countFichas += 1;
    aggMap[key].locais += f.totalLocais || 0;
    aggMap[key].pessoas += f.totalPessoas || 0;
    aggMap[key].sim += f.sim || 0;
    aggMap[key].nao += f.nao || 0;
  });

  const sortedConsolidado = Object.values(aggMap).sort(
    (a, b) => b.pessoas - a.pessoas
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950">
            Consolidado Geográfico & Comparativo de Rondas
          </h1>
          <p className="mt-1 text-xs font-bold text-slate-700">
            Agrupamento por território e comparação de desempenho entre rondas de vacinação/mobilização
          </p>
        </div>

        <button
          onClick={() => exportConsolidadoPDF(sortedConsolidado)}
          className="flex h-10 items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 text-xs font-medium text-red-700 transition hover:bg-red-100 shadow-xs self-start sm:self-auto"
          id="btn-export-consolidado-pdf"
        >
          <FileText className="h-4 w-4" />
          <span>Exportar Consolidado PDF</span>
        </button>
      </div>

      {/* Ronda Comparison Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Análise Comparativa entre Rondas
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">Comparar:</span>
            <select
              value={rondaA}
              onChange={(e) => setRondaA(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800 outline-none focus:border-blue-600"
            >
              {rondasDisponiveis.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="font-semibold text-slate-400">VS</span>
            <select
              value={rondaB}
              onChange={(e) => setRondaB(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800 outline-none focus:border-blue-600"
            >
              {rondasDisponiveis.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Ronda A */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">{rondaA}</span>
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {statsA.countFichas} fichas
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-blue-700">
              {statsA.pessoas.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">pessoas</span>
            </div>
            <div className="text-xs text-slate-600 flex justify-between font-medium">
              <span>Locais: {statsA.locais.toLocaleString()}</span>
              <span>Aceitação: {statsA.aceitacao}%</span>
            </div>
          </div>

          {/* Card Ronda B */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">{rondaB}</span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {statsB.countFichas} fichas
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700">
              {statsB.pessoas.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">pessoas</span>
            </div>
            <div className="text-xs text-slate-600 flex justify-between font-medium">
              <span>Locais: {statsB.locais.toLocaleString()}</span>
              <span>Aceitação: {statsB.aceitacao}%</span>
            </div>
          </div>

          {/* Growth & Impact Card */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-indigo-900 uppercase">Evolução & Cobertura</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold font-mono ${diffPessoas >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {diffPessoas >= 0 ? `+${diffPessoas.toLocaleString()}` : diffPessoas.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-indigo-700">
                  ({growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`})
                </span>
              </div>
            </div>
            <p className="text-xs text-indigo-800 leading-snug">
              {diffPessoas >= 0
                ? `Crescimento positivo de pessoas mobilizadas na ${rondaB} em comparação à ${rondaA}.`
                : `Aumento no esforço necessário para cobrir os focos residuais.`}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Província</th>
                <th className="p-3.5">Município</th>
                <th className="p-3.5">Comuna</th>
                <th className="p-3.5">Bairro / Comunidade</th>
                <th className="p-3.5 text-center">Nº Fichas</th>
                <th className="p-3.5 text-center">Locais Visitados</th>
                <th className="p-3.5 text-right">Pessoas Alcançadas</th>
                <th className="p-3.5 text-center">Taxa Aceitação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedConsolidado.map((row, idx) => {
                const totalResp = row.sim + row.nao;
                const pct = totalResp > 0 ? Math.round((row.sim / totalResp) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900">{row.provincia}</td>
                    <td className="p-3.5 font-medium text-slate-700">{row.municipio}</td>
                    <td className="p-3.5 font-medium text-slate-700">{row.comuna}</td>
                    <td className="p-3.5 font-semibold text-emerald-800">{row.bairro}</td>
                    <td className="p-3.5 text-center font-mono font-medium">{row.countFichas}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-blue-700">
                      {row.locais.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                      {row.pessoas.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedConsolidado.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    Sem dados consolidados disponíveis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
