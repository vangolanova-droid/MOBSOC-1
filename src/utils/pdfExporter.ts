import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Ficha, Mobilizador } from '../types';

export interface ConsolidadoRow {
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

// Helper to draw official document header
function drawOfficialHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Bar
  doc.setFillColor(11, 92, 173); // #0B5CAD
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Secondary Accent Bar
  doc.setFillColor(46, 125, 50); // #2E7D32
  doc.rect(0, 8, pageWidth, 2, 'F');

  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('REPÚBLICA DE ANGOLA — MINISTÉRIO DA SAÚDE', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(11, 92, 173);
  doc.text('SIS-MOBSOC SUMBE — MOBILIZAÇÃO SOCIAL EM SAÚDE PÚBLICA', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title.toUpperCase(), pageWidth / 2, 30, { align: 'center' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, pageWidth / 2, 35, { align: 'center' });
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 39, pageWidth - 14, 39);
}

// Helper to draw document footer with page numbers
function drawOfficialFooter(doc: jsPDF) {
  const pageCount = doc.internal.pages.length - 1; // 1-indexed internal array
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    const dateStr = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    doc.text(`SIS-MOBSOC Sumbe • Emitido em: ${dateStr}`, 14, pageHeight - 9);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: 'right' });
  }
}

/**
 * Export a single Ficha as an Official Individual Certificate / Document PDF
 */
export function exportFichaPDF(ficha: Ficha) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawOfficialHeader(
    doc,
    'Ficha Oficial de Mobilização Social',
    `Código da Ficha: #${ficha.id} • Data: ${ficha.data} • Ronda: ${ficha.ronda || '1ª Ronda'}`
  );

  let currentY = 46;

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 92, 173);
  doc.text('INFORMACÃO DO MOBILIZADOR E COORDENACÃO', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.text(`Mobilizador: `, 18, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(ficha.mobilizador || '—', 40, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.text(`Telefone: `, 120, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(ficha.telefone || '—', 140, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.text(`Coordenação: `, 18, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(ficha.coordNome || '—', 42, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Província: `, 120, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(ficha.provincia || 'Cuanza Sul', 140, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Município/Comuna: `, 18, currentY + 27);
  doc.setFont('helvetica', 'bold');
  doc.text(`${ficha.municipio || 'Sumbe'} / ${ficha.comuna || 'Sede'}`, 48, currentY + 27);

  doc.setFont('helvetica', 'normal');
  doc.text(`Bairro/Comunidade: `, 120, currentY + 27);
  doc.setFont('helvetica', 'bold');
  doc.text(ficha.bairro || '—', 152, currentY + 27);

  currentY += 44;

  // Indicators Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 92, 173);
  doc.text('RESUMO DE INDICADORES DE CAMPO', 14, currentY);

  currentY += 4;

  const totalResp = (ficha.sim || 0) + (ficha.nao || 0);
  const taxaAceitacao = totalResp > 0 ? `${Math.round(((ficha.sim || 0) / totalResp) * 100)}%` : '0%';

  autoTable(doc, {
    startY: currentY,
    head: [['Indicador de Atividade', 'Quantidade / Valor', 'Percentual / Obs.']],
    body: [
      ['Locais / Residências Visitadas', `${ficha.totalLocais || 0} locais`, 'Atendimento porta a porta'],
      ['Total de Pessoas Sensibilizadas', `${ficha.totalPessoas || 0} pessoas`, 'Público-alvo direto'],
      ['Aceitação / Adesão (SIM)', `${ficha.sim || 0} pessoas`, `Taxa: ${taxaAceitacao}`],
      ['Recusas / Hesitação (NÃO)', `${ficha.nao || 0} pessoas`, ficha.nao > 0 ? 'Requer Acompanhamento' : 'Sem recusas'],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [11, 92, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Motivo de Recusa / Observações
  if (ficha.nao > 0 || ficha.motivo) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text('MOTIVO DECLARADO PARA RECUSA / HESITACÃO:', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(127, 29, 29);
    const motivoText = doc.splitTextToSize(ficha.motivo || 'Motivo não especificado.', pageWidth - 36);
    doc.text(motivoText, 18, currentY + 13);

    currentY += 28;
  }

  // Official Signatures Block
  currentY = Math.max(currentY + 15, 210);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);

  // Line 1: Mobilizador
  doc.line(20, currentY, 90, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura do Mobilizador', 55, currentY + 5, { align: 'center' });

  // Line 2: Supervisor / Coordenador
  doc.line( pageWidth - 90, currentY, pageWidth - 20, currentY);
  doc.text('Assinatura do Coordenador / Supervisor', pageWidth - 55, currentY + 5, { align: 'center' });

  drawOfficialFooter(doc);

  // Download trigger
  doc.save(`Ficha_Mobilizacao_${ficha.id}_${ficha.data}.pdf`);
}

/**
 * Export a list of Fichas as a PDF Report Table
 */
export function exportFichasListPDF(fichas: Ficha[], title = 'Relatório Geral de Fichas de Mobilização') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawOfficialHeader(
    doc,
    title,
    `Total de Registos: ${fichas.length} • Gerado em: ${new Date().toLocaleDateString('pt-AO')}`
  );

  // KPI Summary Bar
  const totalLocais = fichas.reduce((s, f) => s + (f.totalLocais || 0), 0);
  const totalPessoas = fichas.reduce((s, f) => s + (f.totalPessoas || 0), 0);
  const totalSim = fichas.reduce((s, f) => s + (f.sim || 0), 0);
  const totalNao = fichas.reduce((s, f) => s + (f.nao || 0), 0);
  const totalResp = totalSim + totalNao;
  const pct = totalResp > 0 ? Math.round((totalSim / totalResp) * 100) : 0;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, pageWidth - 28, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 92, 173);
  doc.text(`Total Fichas: ${fichas.length}`, 20, 51);

  doc.setTextColor(51, 65, 85);
  doc.text(`Locais Visitados: ${totalLocais.toLocaleString()}`, 70, 51);

  doc.setTextColor(46, 125, 50);
  doc.text(`Pessoas Alcançadas: ${totalPessoas.toLocaleString()}`, 130, 51);

  doc.setTextColor(11, 92, 173);
  doc.text(`Adesão (SIM): ${totalSim.toLocaleString()} (${pct}%)`, 200, 51);

  doc.setTextColor(225, 29, 72);
  doc.text(`Recusas (NÃO): ${totalNao.toLocaleString()}`, 250, 51);

  // Table
  const tableData = fichas.map((f) => [
    f.data,
    f.ronda || '1ª Ronda',
    f.mobilizador,
    f.coordNome,
    f.municipio,
    f.bairro,
    f.totalLocais || 0,
    f.totalPessoas || 0,
    f.sim || 0,
    f.nao || 0,
    f.motivo || '—',
  ]);

  autoTable(doc, {
    startY: 60,
    head: [
      [
        'Data',
        'Ronda',
        'Mobilizador',
        'Coordenação',
        'Município',
        'Bairro',
        'Locais',
        'Pessoas',
        'SIM',
        'NÃO',
        'Motivo / Obs.',
      ],
    ],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 92, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  drawOfficialFooter(doc);

  doc.save(`SIS-MOBSOC_Relatorio_Fichas_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Consolidated Geographic Report as a PDF
 */
export function exportConsolidadoPDF(data: ConsolidadoRow[], title = 'Relatório Consolidado Geográfico') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawOfficialHeader(
    doc,
    title,
    'Agrupamento Oficial por Província, Município, Comuna e Bairro'
  );

  // Totals
  const totalFichas = data.reduce((s, r) => s + r.countFichas, 0);
  const totalLocais = data.reduce((s, r) => s + r.locais, 0);
  const totalPessoas = data.reduce((s, r) => s + r.pessoas, 0);
  const totalSim = data.reduce((s, r) => s + r.sim, 0);
  const totalNao = data.reduce((s, r) => s + r.nao, 0);
  const totalResp = totalSim + totalNao;
  const overallPct = totalResp > 0 ? Math.round((totalSim / totalResp) * 100) : 0;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, pageWidth - 28, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 92, 173);
  doc.text(`Zonas Monitoradas: ${data.length}`, 20, 51);

  doc.setTextColor(51, 65, 85);
  doc.text(`Total Fichas: ${totalFichas}`, 75, 51);

  doc.setTextColor(46, 125, 50);
  doc.text(`Pessoas Alcançadas: ${totalPessoas.toLocaleString()}`, 130, 51);

  doc.setTextColor(11, 92, 173);
  doc.text(`Taxa Média de Aceitação: ${overallPct}%`, 205, 51);

  const tableRows = data.map((row) => {
    const resp = row.sim + row.nao;
    const taxa = resp > 0 ? `${Math.round((row.sim / resp) * 100)}%` : '0%';
    return [
      row.provincia,
      row.municipio,
      row.comuna,
      row.bairro,
      row.countFichas,
      row.locais.toLocaleString(),
      row.pessoas.toLocaleString(),
      row.sim.toLocaleString(),
      row.nao.toLocaleString(),
      taxa,
    ];
  });

  // Footer totals row
  tableRows.push([
    'TOTAL GERAL',
    '—',
    '—',
    '—',
    totalFichas,
    totalLocais.toLocaleString(),
    totalPessoas.toLocaleString(),
    totalSim.toLocaleString(),
    totalNao.toLocaleString(),
    `${overallPct}%`,
  ]);

  autoTable(doc, {
    startY: 60,
    head: [
      [
        'Província',
        'Município',
        'Comuna',
        'Bairro / Comunidade',
        'Fichas',
        'Locais',
        'Pessoas',
        'SIM',
        'NÃO',
        'Aceitação',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 92, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: function (dataCell) {
      // Highlight total row
      if (dataCell.row.index === tableRows.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [226, 232, 240];
        dataCell.cell.styles.textColor = [11, 92, 173];
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawOfficialFooter(doc);

  doc.save(`SIS-MOBSOC_Consolidado_Geografico_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Official Executive / Period Report PDF
 */
export function exportRelatorioOficialPDF(
  reportType: 'geral' | 'diario' | 'export',
  fichas: Ficha[],
  filters: { coordName?: string; date?: string; municipio?: string }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const reportTitle =
    reportType === 'diario'
      ? `Relatório Diário de Mobilização (${filters.date || new Date().toISOString().split('T')[0]})`
      : reportType === 'export'
      ? 'Relatório de Exportação e Arquivo Oficial'
      : 'Relatório Geral de Atividades e Impacto';

  drawOfficialHeader(doc, reportTitle, 'SIS-MOBSOC Sumbe • Serviço Nacional de Saúde Pública');

  let currentY = 44;

  // Filter Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 92, 173);
  doc.text('PARÂMETROS E FILTROS APLICADOS:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Coordenação: ${filters.coordName || 'Todas as Coordenações'}`, 18, currentY + 12);
  doc.text(`Município: ${filters.municipio || 'Todos'}`, 85, currentY + 12);
  doc.text(`Data Referência: ${filters.date || 'Período Completo'}`, 145, currentY + 12);

  currentY += 26;

  // Key Performance Indicators
  const totalPessoas = fichas.reduce((s, f) => s + (f.totalPessoas || 0), 0);
  const totalLocais = fichas.reduce((s, f) => s + (f.totalLocais || 0), 0);
  const totalSim = fichas.reduce((s, f) => s + (f.sim || 0), 0);
  const totalNao = fichas.reduce((s, f) => s + (f.nao || 0), 0);
  const totalResp = totalSim + totalNao;
  const pct = totalResp > 0 ? Math.round((totalSim / totalResp) * 100) : 0;

  // 4 KPI Cards
  const cardWidth = (pageWidth - 28 - 9) / 4;

  const kpis = [
    { title: 'TOTAL FICHAS', val: `${fichas.length}`, color: [11, 92, 173] },
    { title: 'LOCAIS VISITADOS', val: totalLocais.toLocaleString(), color: [51, 65, 85] },
    { title: 'PESSOAS ALCANÇADAS', val: totalPessoas.toLocaleString(), color: [46, 125, 50] },
    { title: 'TAXA ADESÃO', val: `${pct}%`, color: [11, 92, 173] },
  ];

  kpis.forEach((k, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(k.title, x + cardWidth / 2, currentY + 5, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, x + cardWidth / 2, currentY + 13, { align: 'center' });
  });

  currentY += 24;

  // Table of Fichas included
  const tableData = fichas.map((f) => [
    f.data,
    f.mobilizador,
    f.bairro,
    f.totalLocais || 0,
    f.totalPessoas || 0,
    f.sim || 0,
    f.nao || 0,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Mobilizador', 'Bairro', 'Locais', 'Pessoas', 'SIM', 'NÃO']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 92, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Approval Block
  if (currentY + 30 > 280) {
    doc.addPage();
    currentY = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 92, 173);
  doc.text('PARECER E APORTE DA SUPERVISÃO DE SAÚDE PÚBLICA:', 14, currentY);

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY + 3, pageWidth - 28, 18, 2, 2, 'D');

  currentY += 35;

  doc.line(20, currentY, 90, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('O Coordenador de Saúde Pública', 55, currentY + 5, { align: 'center' });

  doc.line(pageWidth - 90, currentY, pageWidth - 20, currentY);
  doc.text('O Supervisor Provincial', pageWidth - 55, currentY + 5, { align: 'center' });

  drawOfficialFooter(doc);

  doc.save(`SIS-MOBSOC_Relatorio_Oficial_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Supervisor Summary Report as an official PDF
 */
export function exportSupervisoresReportPDF(
  reportMode: 'diario' | 'geral',
  supervisorAggregates: any[],
  dateStr: string,
  coordFilterName = 'Todas as Coordenações'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const title =
    reportMode === 'diario'
      ? `Relatório Diário Por Supervisores (${dateStr})`
      : 'Relatório Geral Cumulativo Por Supervisores';

  drawOfficialHeader(
    doc,
    title,
    `Filtro de Coordenação: ${coordFilterName} • Serviço de Saúde Pública`
  );

  const totalSups = supervisorAggregates.length;
  const totalFichas = supervisorAggregates.reduce((s, a) => s + (a.countFichas || 0), 0);
  const totalLocais = supervisorAggregates.reduce((s, a) => s + (a.locais || 0), 0);
  const totalPessoas = supervisorAggregates.reduce((s, a) => s + (a.pessoas || 0), 0);
  const totalSim = supervisorAggregates.reduce((s, a) => s + (a.sim || 0), 0);
  const totalNao = supervisorAggregates.reduce((s, a) => s + (a.nao || 0), 0);
  const totalResp = totalSim + totalNao;
  const overallPct = totalResp > 0 ? Math.round((totalSim / totalResp) * 100) : 0;

  // KPI Header Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, pageWidth - 28, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 92, 173);
  doc.text(`Supervisores: ${totalSups}`, 20, 51);

  doc.setTextColor(51, 65, 85);
  doc.text(`Fichas Submetidas: ${totalFichas}`, 70, 51);

  doc.setTextColor(51, 65, 85);
  doc.text(`Locais Visitados: ${totalLocais.toLocaleString()}`, 125, 51);

  doc.setTextColor(46, 125, 50);
  doc.text(`Pessoas Alcançadas: ${totalPessoas.toLocaleString()}`, 180, 51);

  doc.setTextColor(11, 92, 173);
  doc.text(`Adesão Média (SIM): ${overallPct}%`, 245, 51);

  const tableRows = supervisorAggregates.map((a, i) => [
    i + 1,
    a.coordNome,
    a.supervisorNome,
    a.countMobilizadores,
    a.countFichas,
    a.locais.toLocaleString(),
    a.pessoas.toLocaleString(),
    a.sim.toLocaleString(),
    a.nao.toLocaleString(),
    `${a.taxaAceitacao}%`,
  ]);

  // Grand Total Row
  tableRows.push([
    'TOTAIS',
    'TODAS AS COORDENAÇÕES',
    'TODOS OS SUPERVISORES',
    '—',
    totalFichas,
    totalLocais.toLocaleString(),
    totalPessoas.toLocaleString(),
    totalSim.toLocaleString(),
    totalNao.toLocaleString(),
    `${overallPct}%`,
  ]);

  autoTable(doc, {
    startY: 60,
    head: [
      [
        '#',
        'Coordenação Operacional',
        'Supervisor Responsável',
        'Mobilizadores',
        'Fichas',
        'Locais',
        'Pessoas',
        'SIM',
        'NÃO',
        'Aceitação',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 92, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: function (dataCell) {
      if (dataCell.row.index === tableRows.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [226, 232, 240];
        dataCell.cell.styles.textColor = [11, 92, 173];
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawOfficialFooter(doc);

  doc.save(`SIS-MOBSOC_Relatorio_Supervisores_${reportMode}_${dateStr}.pdf`);
}

export function exportFinancasPDF(
  mobilizadores: Mobilizador[],
  fichas: Ficha[],
  diarioRate: number = 5000,
  paymentStatuses: Record<number, 'pendente' | 'pago'> = {}
) {
  const doc = new jsPDF('landscape');
  const dateStr = new Date().toISOString().split('T')[0];

  drawOfficialHeader(
    doc,
    'Relatório Financeiro & Controlo de Subsídios de Mobilizadores (RH-MC)',
    `Taxa Diária de Referência: ${diarioRate.toLocaleString('pt-AO')} Kz / Ficha Lançada — Gerado em: ${new Date().toLocaleDateString('pt-PT')}`
  );

  let totalFichasGeral = 0;
  let totalKzGeral = 0;
  let totalPagoKz = 0;
  let totalPendenteKz = 0;

  const tableRows = mobilizadores.map((mob, index) => {
    const mobFichas = fichas.filter(
      (f) =>
        (f.mobilizadorId && f.mobilizadorId === mob.id) ||
        (f.mobilizador && f.mobilizador.trim().toLowerCase() === mob.nome.trim().toLowerCase())
    );
    const fichasCount = mobFichas.length;
    const diasTrabalhados = fichasCount;
    const totalKwanzas = fichasCount * diarioRate;
    const status = paymentStatuses[mob.id] || (totalKwanzas > 0 ? 'pendente' : 'sem_fichas');

    totalFichasGeral += fichasCount;
    totalKzGeral += totalKwanzas;

    if (status === 'pago') {
      totalPagoKz += totalKwanzas;
    } else {
      totalPendenteKz += totalKwanzas;
    }

    const valorStr = totalKwanzas > 0 ? `${totalKwanzas.toLocaleString('pt-AO')},00 Kz` : '0,00 Kz';

    return [
      index + 1,
      mob.nome,
      mob.coordNome || '—',
      mob.supervisorNome || '—',
      mob.telefone || '—',
      mob.ronda || '1ª Ronda',
      fichasCount,
      `${diasTrabalhados} dia(s)`,
      `${diarioRate.toLocaleString('pt-AO')},00 Kz`,
      valorStr,
      status === 'pago' ? 'PAGO' : status === 'pendente' ? 'PENDENTE' : 'SEM FICHAS',
    ];
  });

  // Add Summary Row
  tableRows.push([
    'TOTAL',
    `Mobilizadores: ${mobilizadores.length}`,
    '—',
    '—',
    '—',
    '—',
    totalFichasGeral,
    `${totalFichasGeral} dias`,
    '—',
    `${totalKzGeral.toLocaleString('pt-AO')},00 Kz`,
    `Pago: ${totalPagoKz.toLocaleString('pt-AO')} Kz`,
  ]);

  autoTable(doc, {
    startY: 44,
    head: [
      [
        '#',
        'Mobilizador',
        'Coordenação',
        'Supervisor',
        'Telefone',
        'Ronda',
        'Fichas',
        'Dias Trab.',
        'Valor/Dia',
        'Total (Kz)',
        'Estado',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 92, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: function (dataCell) {
      if (dataCell.row.index === tableRows.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [226, 232, 240];
        dataCell.cell.styles.textColor = [11, 92, 173];
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawOfficialFooter(doc);

  doc.save(`SIS-MOBSOC_Relatorio_Financeiro_RH_${dateStr}.pdf`);
}

