import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  BookOpen,
  Calendar,
  Filter,
  FileText,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Coordination, CoordinationGoal, Ficha, Mobilizador, User } from '../types';
import {
  exportRelatorioOficialPDF,
  exportSupervisoresReportPDF,
  exportBoletimProvincialPDF,
} from '../utils/pdfExporter';
import {
  buildSupervisorAggregates,
  exportRelatorioSupervisoresExcel,
  SupervisorAggregate,
} from '../utils/excelExporter';

interface RelatoriosViewProps {
  user: User;
  fichas: Ficha[];
  coordenacoes: Coordination[];
  users?: User[];
  mobilizadores?: Mobilizador[];
  goals?: CoordinationGoal[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  user,
  fichas,
  coordenacoes,
  users = [],
  mobilizadores = [],
  goals = [],
}) => {
  const [reportTab, setReportTab] = useState<'geral' | 'diario' | 'supervisores' | 'dps' | 'export'>('geral');
  const [supervisorSubMode, setSupervisorSubMode] = useState<'diario' | 'geral'>('diario');
  const [selectedCoord, setSelectedCoord] = useState<string>('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [municipioFilter, setMunicipioFilter] = useState<string>('');
  const [expandedSupId, setExpandedSupId] = useState<string | number | null>(null);

  const visibleFichas =
    user.tipo === 'admin'
      ? fichas
      : fichas.filter((f) => f.coordId === user.coordId);

  // Filter logic for general/daily/export
  const getFilteredFichas = () => {
    return visibleFichas.filter((f) => {
      const matchCoord = selectedCoord ? String(f.coordId) === selectedCoord : true;
      const matchMun = municipioFilter
        ? f.municipio.toLowerCase().includes(municipioFilter.toLowerCase())
        : true;
      const matchDate =
        reportTab === 'diario' || (reportTab === 'supervisores' && supervisorSubMode === 'diario')
          ? f.data === selectedDate
          : true;
      return matchCoord && matchMun && matchDate;
    });
  };

  const filtered = getFilteredFichas();

  // Supervisor Aggregates
  const allSupervisorAggregates = buildSupervisorAggregates(
    filtered,
    users,
    mobilizadores,
    coordenacoes
  );

  const supervisorAggregates = selectedSupervisor
    ? allSupervisorAggregates.filter((a) => String(a.supervisorId) === selectedSupervisor)
    : allSupervisorAggregates;

  const totalPessoas = filtered.reduce((s, f) => s + (f.totalPessoas || 0), 0);
  const totalLocais = filtered.reduce((s, f) => s + (f.totalLocais || 0), 0);
  const totalSim = filtered.reduce((s, f) => s + (f.sim || 0), 0);
  const totalNao = filtered.reduce((s, f) => s + (f.nao || 0), 0);
  const totalResp = totalSim + totalNao;
  const acceptancePct = totalResp > 0 ? Math.round((totalSim / totalResp) * 100) : 0;

  const selectedCoordObj = coordenacoes.find((c) => String(c.id) === selectedCoord);
  const coordNameLabel = selectedCoordObj ? selectedCoordObj.nome : 'Todas as Coordenações';

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (reportTab === 'supervisores') {
      exportRelatorioSupervisoresExcel(
        supervisorSubMode,
        selectedDate,
        supervisorAggregates,
        filtered,
        user,
        coordNameLabel
      );
      return;
    }

    // Standard Ficha Excel Export
    const rows: any[] = [];
    filtered.forEach((f) => {
      rows.push({
        Data: f.data,
        Mobilizador: f.mobilizador,
        Coordenação: f.coordNome,
        Província: f.provincia,
        Município: f.municipio,
        Comuna: f.comuna,
        Bairro: f.bairro,
        'Locais Visitados': f.totalLocais,
        'Pessoas Alcançadas': f.totalPessoas,
        SIM: f.sim,
        NÃO: f.nao,
        Motivo: f.motivo || '—',
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(
      workbook,
      `SirDm_Relatorio_${reportTab}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportPDF = () => {
    if (reportTab === 'dps') {
      exportBoletimProvincialPDF(filtered, coordenacoes, goals, {
        provincia: 'Cuanza Sul',
        municipio: municipioFilter || 'Sumbe',
      });
      return;
    }

    if (reportTab === 'supervisores') {
      exportSupervisoresReportPDF(
        supervisorSubMode,
        supervisorAggregates,
        selectedDate,
        coordNameLabel
      );
      return;
    }

    exportRelatorioOficialPDF(reportTab === 'export' ? 'geral' : reportTab, filtered, {
      coordName: coordNameLabel,
      date: reportTab === 'diario' ? selectedDate : undefined,
      municipio: municipioFilter || 'Todos',
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Relatórios Oficiais</h1>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Geração, pré-visualização, relatórios por supervisores e exportação de dados
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
        <button
          onClick={() => setReportTab('geral')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            reportTab === 'geral'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-rel-geral"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Relatório Geral</span>
        </button>

        <button
          onClick={() => setReportTab('diario')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            reportTab === 'diario'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-rel-diario"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Relatório Diário</span>
        </button>

        <button
          onClick={() => setReportTab('supervisores')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            reportTab === 'supervisores'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-rel-supervisores"
        >
          <Users className="h-3.5 w-3.5 text-emerald-600" />
          <span>Relatório por Supervisores</span>
        </button>

        <button
          onClick={() => setReportTab('dps')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            reportTab === 'dps'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-rel-dps"
        >
          <Building2 className="h-3.5 w-3.5 text-blue-600" />
          <span>Boletim Municipal (DMS Sumbe)</span>
        </button>

        <button
          onClick={() => setReportTab('export')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            reportTab === 'export'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-rel-export"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Exportar & Imprimir</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filtros do Relatório</span>
          </div>

          {reportTab === 'supervisores' && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setSupervisorSubMode('diario')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  supervisorSubMode === 'diario'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Modo Diário
              </button>
              <button
                type="button"
                onClick={() => setSupervisorSubMode('geral')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  supervisorSubMode === 'geral'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Modo Geral (Cumulativo)
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {(reportTab === 'diario' || (reportTab === 'supervisores' && supervisorSubMode === 'diario')) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Data do Relatório
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="rel-filter-date"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Coordenação
            </label>
            <select
              value={selectedCoord}
              onChange={(e) => setSelectedCoord(e.target.value)}
              className="mt-1 w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="rel-filter-coord"
            >
              <option value="">Todas as Coordenações</option>
              {coordenacoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {reportTab === 'supervisores' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Supervisor
              </label>
              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="mt-1 w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="">Todos os Supervisores</option>
                {users
                  .filter((u) => u.tipo === 'supervisor' || u.tipo === 'admin')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.coordNome || 'Sem Coord.'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Município
            </label>
            <input
              type="text"
              placeholder="Ex: Sumbe"
              value={municipioFilter}
              onChange={(e) => setMunicipioFilter(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="rel-filter-mun"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={handleExportPDF}
            className="flex h-10 items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 text-xs font-medium text-red-700 hover:bg-red-100 transition shadow-xs"
            id="btn-rel-pdf"
          >
            <FileText className="h-4 w-4" />
            <span>Exportar PDF Oficial (.pdf)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition shadow-xs"
            id="btn-rel-excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Descarregar Excel Formatado (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-200 transition shadow-xs"
            id="btn-rel-print"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Imprimir Navegador</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {reportTab === 'supervisores' ? supervisorAggregates.length : filtered.length}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            {reportTab === 'supervisores' ? 'Supervisores no Relatório' : 'Fichas Filtradas'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-blue-700">
            {totalPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">Pessoas Alcançadas</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-amber-700">
            {totalLocais.toLocaleString()}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">Locais Visitados</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-purple-700">
            {acceptancePct}%
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">Taxa de Aceitação</div>
        </div>
      </div>

      {/* REPORT VIEW MODES */}
      {reportTab === 'supervisores' ? (
        /* SUPERVISOR MODE VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 print:border-none print:bg-white print:text-black">
          <div className="border-b border-slate-200 pb-4 text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 print:text-black">
              Relatório de Coordenações por Supervisores
            </h2>
            <p className="text-xs font-medium text-slate-500 print:text-slate-600 mt-0.5">
              {supervisorSubMode === 'diario'
                ? `Relatório Diário — Data: ${selectedDate}`
                : 'Relatório Geral Cumulativo'}
            </p>
            <div className="mt-2 text-xs font-mono font-medium text-emerald-800 print:text-slate-800">
              Coordenação: {coordNameLabel} | Emitido por: {user.nome} | {new Date().toLocaleDateString('pt-AO')}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-800 print:text-black">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider print:bg-slate-100 print:text-slate-800">
                <tr>
                  <th className="p-3.5">Coordenação</th>
                  <th className="p-3.5">Supervisor Responsável</th>
                  <th className="p-3.5 text-center">Mobilizadores</th>
                  <th className="p-3.5 text-center">Fichas</th>
                  <th className="p-3.5 text-center">Locais</th>
                  <th className="p-3.5 text-right">Pessoas</th>
                  <th className="p-3.5 text-center">SIM</th>
                  <th className="p-3.5 text-center">NÃO</th>
                  <th className="p-3.5 text-center">Taxa Aceitação</th>
                  <th className="p-3.5 text-center print:hidden">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-300">
                {supervisorAggregates.map((agg) => {
                  const isExpanded = expandedSupId === agg.supervisorId;
                  return (
                    <React.Fragment key={String(agg.supervisorId)}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-semibold text-blue-700">{agg.coordNome}</td>
                        <td className="p-3.5 font-semibold text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-emerald-700" />
                          <span>{agg.supervisorNome}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-medium">
                          {agg.countMobilizadores}
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-700">
                          {agg.countFichas}
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-amber-700">
                          {agg.locais.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                          {agg.pessoas.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-emerald-700">
                          {agg.sim}
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-red-600">
                          {agg.nao}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                            {agg.taxaAceitacao}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSupId(isExpanded ? null : agg.supervisorId)
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Ocultar
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Ver Equipas
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 print:hidden">
                          <td colSpan={10} className="p-4 border-l-4 border-blue-600">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                                Mobilizadores Integrados ao Supervisor ({agg.mobilizadoresList.length}):
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {agg.mobilizadoresList.length > 0 ? (
                                  agg.mobilizadoresList.map((m) => (
                                    <span
                                      key={m}
                                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 shadow-xs"
                                    >
                                      👤 {m}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400 italic">
                                    Nenhum mobilizador específico associado.
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {supervisorAggregates.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                      Nenhum supervisor localizado para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className="border-t-2 border-slate-300 bg-slate-900 font-bold text-white print:bg-slate-100 print:text-black">
                <tr>
                  <td colSpan={3} className="p-3.5">
                    TOTAL GERAL DAS COORDENAÇÕES / SUPERVISORES
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {filtered.length} fichas
                  </td>
                  <td className="p-3.5 text-center font-mono">{totalLocais}</td>
                  <td className="p-3.5 text-right font-mono text-white print:text-black">
                    {totalPessoas.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-center font-mono text-white print:text-black">
                    {totalSim}
                  </td>
                  <td className="p-3.5 text-center font-mono text-white print:text-black">
                    {totalNao}
                  </td>
                  <td className="p-3.5 text-center font-mono text-white print:text-black">
                    {acceptancePct}%
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : reportTab !== 'dps' ? (
        /* STANDARD FICHA REPORT TABLE */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 print:border-none print:bg-white print:text-black">
          <div className="border-b border-slate-200 pb-4 text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 print:text-black">
              SirDm — Sistema de Registo de Dados de Mobilização
            </h2>
            <p className="text-xs font-medium text-slate-500 print:text-slate-600 mt-0.5">
              Relatório de Atividades Comunitárias de Saúde
            </p>
            <div className="mt-2 text-xs font-mono font-medium text-emerald-800 print:text-slate-800">
              Gerado em: {new Date().toLocaleDateString('pt-AO')} | Emitido por:{' '}
              {user.nome}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-800 print:text-black">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider print:bg-slate-100 print:text-slate-800">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Mobilizador</th>
                  <th className="p-3.5">Coordenação</th>
                  <th className="p-3.5">Bairro</th>
                  <th className="p-3.5 text-center">Locais</th>
                  <th className="p-3.5 text-right">Pessoas</th>
                  <th className="p-3.5 text-center">SIM</th>
                  <th className="p-3.5 text-center">NÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-300">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-slate-600">{f.data}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{f.mobilizador}</td>
                    <td className="p-3.5 font-medium text-slate-700">{f.coordNome}</td>
                    <td className="p-3.5 font-medium text-slate-700">{f.bairro}</td>
                    <td className="p-3.5 text-center font-mono font-medium">{f.totalLocais}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700 print:text-black">
                      {f.totalPessoas.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center font-mono font-semibold text-emerald-700 print:text-black">
                      {f.sim}
                    </td>
                    <td className="p-3.5 text-center font-mono font-semibold text-red-600 print:text-black">
                      {f.nao}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      Nenhum registo atende aos critérios selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-900 font-bold text-white print:bg-slate-100 print:text-black">
                <tr>
                  <td colSpan={4} className="p-3.5">
                    TOTAIS GERAIS DO RELATÓRIO
                  </td>
                  <td className="p-3.5 text-center font-mono">{totalLocais}</td>
                  <td className="p-3.5 text-right font-mono text-white print:text-black">
                    {totalPessoas.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-center font-mono text-white print:text-black">
                    {totalSim}
                  </td>
                  <td className="p-3.5 text-center font-mono text-white print:text-black">
                    {totalNao}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* BOLETIM PROVINCIAL DPS MODE VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 print:border-none print:p-0">
          {/* Header Banner DPS */}
          <div className="border-b-2 border-blue-600 pb-4 text-center space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              República de Angola • Ministério da Saúde
            </span>
            <h2 className="text-lg font-black tracking-tight text-blue-900 uppercase">
              Boletim Estratégico de Desempenho e Cobertura de Saúde
            </h2>
            <p className="text-xs font-bold text-slate-700">
              Direção Municipal de Saúde do Sumbe • Cuanza Sul
            </p>
            <div className="text-[11px] text-slate-500 font-mono pt-1">
              Data de Emissão: {new Date().toLocaleDateString('pt-AO')} • Responsável: {user.nome}
            </div>
          </div>

          {/* Goals and Executed Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1">
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                Total Mobilizados (Sumbe)
              </div>
              <div className="text-2xl font-black text-blue-950 font-mono">
                {totalPessoas.toLocaleString('pt-AO')}
              </div>
              <div className="text-[11px] text-blue-800 font-medium">
                Pessoas alcançadas pela equipa
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Taxa de Aceitação Global
              </div>
              <div className="text-2xl font-black text-emerald-800 font-mono">
                {acceptancePct}%
              </div>
              <div className="text-[11px] text-emerald-800 font-medium">
                {totalSim.toLocaleString()} Aceites / {totalNao.toLocaleString()} Recusas
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-1">
              <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                Fichas & Locais
              </div>
              <div className="text-2xl font-black text-purple-950 font-mono">
                {filtered.length} <span className="text-xs font-normal text-purple-700">fichas</span>
              </div>
              <div className="text-[11px] text-purple-800 font-medium">
                {totalLocais.toLocaleString()} locais/casas visitadas
              </div>
            </div>
          </div>

          {/* Coordination Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Desempenho e Metas por Coordenação do Sumbe</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Coordenação</th>
                    <th className="p-3">Coordenador(a)</th>
                    <th className="p-3 text-right">Meta Pessoas</th>
                    <th className="p-3 text-right">Alcançado</th>
                    <th className="p-3 text-center">Cobertura %</th>
                    <th className="p-3 text-center">Fichas</th>
                    <th className="p-3 text-center">Estado da Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {coordenacoes.map((c) => {
                    const cFichas = filtered.filter((f) => f.coordId === c.id || f.coordNome === c.nome);
                    const cPessoas = cFichas.reduce((s, f) => s + (f.totalPessoas || 0), 0);
                    const g = goals.find((item) => item.coordId === c.id) || { targetPessoas: 5000, targetFichas: 80 };
                    const cobPct = g.targetPessoas > 0 ? Math.round((cPessoas / g.targetPessoas) * 100) : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-blue-800">{c.nome}</td>
                        <td className="p-3 font-medium text-slate-700">{c.coordenador || '—'}</td>
                        <td className="p-3 text-right font-mono font-semibold">{g.targetPessoas.toLocaleString('pt-AO')}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">{cPessoas.toLocaleString('pt-AO')}</td>
                        <td className="p-3 text-center font-mono font-bold">{cobPct}%</td>
                        <td className="p-3 text-center font-mono">{cFichas.length} / {g.targetFichas}</td>
                        <td className="p-3 text-center font-bold text-[11px]">
                          {cobPct >= 100 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">🟢 Meta Concluída</span>
                          ) : cobPct >= 80 ? (
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">🔵 Bom Progresso</span>
                          ) : cobPct >= 50 ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">🟡 Ritmo Médio</span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">🔴 Cobertura Crítica</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-2 flex justify-end gap-3 print:hidden">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Gerar PDF do Boletim Municipal (DMS)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
