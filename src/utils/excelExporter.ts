import * as XLSX from 'xlsx';
import { Coordination, Ficha, Mobilizador, User } from '../types';

export interface SupervisorAggregate {
  supervisorId: number | string;
  supervisorNome: string;
  coordId: number;
  coordNome: string;
  countMobilizadores: number;
  countFichas: number;
  locais: number;
  pessoas: number;
  sim: number;
  nao: number;
  taxaAceitacao: number;
  mobilizadoresList: string[];
}

/**
 * Helper to group fichas by Supervisor
 */
export function buildSupervisorAggregates(
  fichas: Ficha[],
  users: User[],
  mobilizadores: Mobilizador[],
  coordenacoes: Coordination[]
): SupervisorAggregate[] {
  // Find all supervisors from users list (or infer from mobilizadores / fichas)
  const supervisors = users.filter((u) => u.tipo === 'supervisor' || u.tipo === 'admin');

  const map: Record<string, SupervisorAggregate> = {};

  // First seed supervisor map with registered supervisors
  supervisors.forEach((sup) => {
    const key = `sup_${sup.id}`;
    const mobCount = mobilizadores.filter(
      (m) => m.supervisorId === sup.id || m.coordId === sup.coordId
    ).length;

    map[key] = {
      supervisorId: sup.id,
      supervisorNome: sup.nome,
      coordId: sup.coordId || 0,
      coordNome: sup.coordNome || 'Geral',
      countMobilizadores: mobCount,
      countFichas: 0,
      locais: 0,
      pessoas: 0,
      sim: 0,
      nao: 0,
      taxaAceitacao: 0,
      mobilizadoresList: [],
    };
  });

  // Default aggregate for unassigned/direct
  const unassignedKey = 'sup_unassigned';
  map[unassignedKey] = {
    supervisorId: 0,
    supervisorNome: 'Outros / Sem Supervisor Directo',
    coordId: 0,
    coordNome: 'Geral',
    countMobilizadores: 0,
    countFichas: 0,
    locais: 0,
    pessoas: 0,
    sim: 0,
    nao: 0,
    taxaAceitacao: 0,
    mobilizadoresList: [],
  };

  // Group fichas
  fichas.forEach((f) => {
    // Attempt to match supervisor via mobilizador registered info
    const mobObj = mobilizadores.find(
      (m) => m.nome.trim().toLowerCase() === f.mobilizador.trim().toLowerCase()
    );

    let matchedSupId = mobObj?.supervisorId;
    let targetKey = matchedSupId ? `sup_${matchedSupId}` : '';

    if (!targetKey || !map[targetKey]) {
      // Check if user is a supervisor who logged this ficha directly
      const supUser = supervisors.find((s) => s.coordId === f.coordId);
      if (supUser) {
        targetKey = `sup_${supUser.id}`;
      } else {
        targetKey = unassignedKey;
      }
    }

    const agg = map[targetKey];
    agg.countFichas += 1;
    agg.locais += f.totalLocais || 0;
    agg.pessoas += f.totalPessoas || 0;
    agg.sim += f.sim || 0;
    agg.nao += f.nao || 0;

    if (f.mobilizador && !agg.mobilizadoresList.includes(f.mobilizador)) {
      agg.mobilizadoresList.push(f.mobilizador);
    }
  });

  // Calculate percentages and filter empty aggregates
  const result = Object.values(map)
    .map((agg) => {
      const resp = agg.sim + agg.nao;
      agg.taxaAceitacao = resp > 0 ? Math.round((agg.sim / resp) * 100) : 0;
      if (agg.countMobilizadores === 0 && agg.mobilizadoresList.length > 0) {
        agg.countMobilizadores = agg.mobilizadoresList.length;
      }
      return agg;
    })
    .filter((agg) => agg.countFichas > 0 || agg.countMobilizadores > 0);

  return result.sort((a, b) => b.pessoas - a.pessoas);
}

/**
 * Export Formatted Excel File for Supervisor Reports (Daily & General)
 */
export function exportRelatorioSupervisoresExcel(
  reportMode: 'diario' | 'geral',
  dateStr: string,
  supervisorAggregates: SupervisorAggregate[],
  fichas: Ficha[],
  currentUser: User,
  coordFilterName = 'Todas as Coordenações'
) {
  const workbook = XLSX.utils.book_new();

  // SHEET 1: Resumo por Supervisor
  const headerData = [
    ['REPÚBLICA DE ANGOLA — MINISTÉRIO DA SAÚDE'],
    ['SISMOB — RELATÓRIO DE MOBILIZAÇÃO POR SUPERVISORES'],
    [
      `MODO: ${reportMode === 'diario' ? 'RELATÓRIO DIÁRIO (' + dateStr + ')' : 'RELATÓRIO GERAL (CUMULATIVO)'}`,
      '',
      `EMITIDO POR: ${currentUser.nome}`,
      '',
      `DATA EMISSÃO: ${new Date().toLocaleDateString('pt-AO')} ${new Date().toLocaleTimeString('pt-AO')}`,
    ],
    [`COORDENAÇÃO: ${coordFilterName}`],
    [], // empty row
    [
      'Nº',
      'Coordenação Operacional',
      'Supervisor Responsável',
      'Mobilizadores',
      'Fichas Submetidas',
      'Locais Visitados',
      'Pessoas Alcançadas',
      'SIM (Adesão)',
      'NÃO (Recusa)',
      'Taxa de Aceitação (%)',
    ],
  ];

  let totalFichas = 0;
  let totalLocais = 0;
  let totalPessoas = 0;
  let totalSim = 0;
  let totalNao = 0;

  const rows: any[] = [];
  supervisorAggregates.forEach((agg, index) => {
    totalFichas += agg.countFichas;
    totalLocais += agg.locais;
    totalPessoas += agg.pessoas;
    totalSim += agg.sim;
    totalNao += agg.nao;

    rows.push([
      index + 1,
      agg.coordNome,
      agg.supervisorNome,
      agg.countMobilizadores,
      agg.countFichas,
      agg.locais,
      agg.pessoas,
      agg.sim,
      agg.nao,
      `${agg.taxaAceitacao}%`,
    ]);
  });

  const totalResp = totalSim + totalNao;
  const overallPct = totalResp > 0 ? Math.round((totalSim / totalResp) * 100) : 0;

  // Total Row
  rows.push([
    'TOTAIS',
    'TOTAL GERAL DAS COORDENAÇÕES',
    'TODOS OS SUPERVISORES',
    '—',
    totalFichas,
    totalLocais,
    totalPessoas,
    totalSim,
    totalNao,
    `${overallPct}%`,
  ]);

  const sheet1Data = [...headerData, ...rows];
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Column widths
  ws1['!cols'] = [
    { wch: 5 },  // Nº
    { wch: 32 }, // Coordenação
    { wch: 30 }, // Supervisor
    { wch: 14 }, // Mobilizadores
    { wch: 16 }, // Fichas
    { wch: 16 }, // Locais
    { wch: 18 }, // Pessoas
    { wch: 14 }, // SIM
    { wch: 14 }, // NÃO
    { wch: 20 }, // Taxa Aceitação
  ];

  XLSX.utils.book_append_sheet(workbook, ws1, 'Resumo Por Supervisor');

  // SHEET 2: Detalhamento Individual de Fichas
  const detailHeader = [
    [
      'Data',
      'Coordenação',
      'Supervisor / Responsável',
      'Mobilizador',
      'Província',
      'Município',
      'Comuna',
      'Bairro',
      'Locais Visitados',
      'Pessoas Alcançadas',
      'Adesão (SIM)',
      'Recusas (NÃO)',
      'Taxa Aceitação',
      'Motivo / Observações',
    ],
  ];

  const detailRows = fichas.map((f) => {
    const resp = (f.sim || 0) + (f.nao || 0);
    const tx = resp > 0 ? `${Math.round(((f.sim || 0) / resp) * 100)}%` : '0%';
    return [
      f.data,
      f.coordNome || '—',
      f.supervisorNome || '—',
      f.mobilizador,
      f.provincia || 'Cuanza Sul',
      f.municipio || 'Sumbe',
      f.comuna || 'Sede',
      f.bairro || '—',
      f.totalLocais || 0,
      f.totalPessoas || 0,
      f.sim || 0,
      f.nao || 0,
      tx,
      f.motivo || 'Sem observações',
    ];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows]);
  ws2['!cols'] = [
    { wch: 12 }, // Data
    { wch: 28 }, // Coord
    { wch: 25 }, // Supervisor
    { wch: 25 }, // Mobilizador
    { wch: 14 }, // Prov
    { wch: 14 }, // Mun
    { wch: 14 }, // Comuna
    { wch: 22 }, // Bairro
    { wch: 14 }, // Locais
    { wch: 16 }, // Pessoas
    { wch: 12 }, // SIM
    { wch: 12 }, // NÃO
    { wch: 14 }, // Taxa
    { wch: 35 }, // Motivo
  ];

  XLSX.utils.book_append_sheet(workbook, ws2, 'Fichas Detalhadas');

  const fileName = `SISMOB_Relatorio_${reportMode.toUpperCase()}_Supervisores_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportFinancasExcel(
  mobilizadores: Mobilizador[],
  fichas: Ficha[],
  diarioRate: number = 5000,
  paymentStatuses: Record<number, 'pendente' | 'pago'> = {}
) {
  const workbook = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  const header = [
    [
      'REPÚBLICA DE ANGOLA — MINISTÉRIO DA SAÚDE',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'SIS-MOBSOC — CONTROLO FINANCEIRO E SUBSÍDIOS DOS MOBILIZADORES (RH-MC)',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      `Data de Emissão: ${dateStr} | Taxa Diária de Referência: ${diarioRate.toLocaleString('pt-AO')} Kz`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [],
    [
      'Nº',
      'Nome do Mobilizador',
      'Função',
      'Coordenação',
      'Supervisor Responsável',
      'Telefone',
      'Fichas Lançadas',
      'Dias Trabalhados',
      'Valor Diário (Kz)',
      'Total a Receber (Kz)',
      'Estado do Pagamento',
    ],
  ];

  const rows = mobilizadores.map((mob, index) => {
    const mobFichas = fichas.filter(
      (f) =>
        (f.mobilizadorId && f.mobilizadorId === mob.id) ||
        (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
    );
    const fichasCount = mobFichas.length;
    const diasTrabalhados = fichasCount;
    const totalKwanzas = fichasCount * diarioRate;
    const status = paymentStatuses[mob.id] || (totalKwanzas > 0 ? 'pendente' : 'sem_fichas');

    return [
      index + 1,
      mob.nome,
      mob.funcao || 'Mobilizador Comunitário',
      mob.coordNome || '—',
      mob.supervisorNome || '—',
      mob.telefone || '—',
      fichasCount,
      diasTrabalhados,
      diarioRate,
      totalKwanzas,
      status === 'pago' ? 'PAGO' : status === 'pendente' ? 'PENDENTE' : 'SEM FICHAS (0 Kz)',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 28 }, // Nome
    { wch: 24 }, // Função
    { wch: 24 }, // Coord
    { wch: 24 }, // Supervisor
    { wch: 16 }, // Telefone
    { wch: 16 }, // Fichas
    { wch: 16 }, // Dias
    { wch: 18 }, // Valor/Dia
    { wch: 20 }, // Total (Kz)
    { wch: 20 }, // Estado
  ];

  XLSX.utils.book_append_sheet(workbook, ws, 'Controlo Financeiro RH');
  XLSX.writeFile(workbook, `SISMOB_Financas_Mobilizadores_${dateStr}.xlsx`);
}
