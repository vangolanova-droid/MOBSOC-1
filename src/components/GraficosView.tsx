import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Ficha, User } from '../types';

interface GraficosViewProps {
  user: User;
  fichas: Ficha[];
}

export const GraficosView: React.FC<GraficosViewProps> = ({ user, fichas }) => {
  const visibleFichas =
    user.tipo === 'admin'
      ? fichas
      : fichas.filter((f) => f.coordId === user.coordId);

  // 1. Locations
  const locAgg: Record<string, number> = {
    'Casa a Casa': 0,
    Igreja: 0,
    'Praças / Mercados': 0,
    'Paragem Táxi': 0,
    Creche: 0,
    Escola: 0,
    'Ponto Água': 0,
    Outros: 0,
  };

  visibleFichas.forEach((f) => {
    if (!f.tableData) return;
    Object.entries(f.tableData).forEach(([key, val]) => {
      const pes = Array.isArray(val) ? val[1] || 0 : 0;
      if (key.startsWith('casa')) locAgg['Casa a Casa'] += pes;
      else if (key === 'igreja') locAgg['Igreja'] += pes;
      else if (key === 'pracas') locAgg['Praças / Mercados'] += pes;
      else if (key === 'paragem') locAgg['Paragem Táxi'] += pes;
      else if (key === 'creche') locAgg['Creche'] += pes;
      else if (key === 'escola') locAgg['Escola'] += pes;
      else if (key === 'agua') locAgg['Ponto Água'] += pes;
      else locAgg['Outros'] += pes;
    });
  });

  const barData = Object.entries(locAgg).map(([name, Pessoas]) => ({
    name,
    Pessoas,
  }));

  // 2. Daily Timeline
  const dailyMap: Record<string, number> = {};
  visibleFichas.forEach((f) => {
    dailyMap[f.data] = (dailyMap[f.data] || 0) + (f.totalPessoas || 0);
  });
  const lineData = Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      data: date,
      Pessoas: dailyMap[date],
    }));

  // 3. Acceptance Donut
  const totalSim = visibleFichas.reduce((s, f) => s + (f.sim || 0), 0);
  const totalNao = visibleFichas.reduce((s, f) => s + (f.nao || 0), 0);
  const donutData = [
    { name: 'SIM (Aceitaram)', value: totalSim, color: '#2E7D32' },
    { name: 'NÃO (Recusaram)', value: totalNao, color: '#dc2626' },
  ];

  // 4. Coordination Comparison
  const coordAgg: Record<string, number> = {};
  visibleFichas.forEach((f) => {
    const cName = f.coordNome || 'Sem Coordenação';
    coordAgg[cName] = (coordAgg[cName] || 0) + (f.totalPessoas || 0);
  });
  const coordData = Object.entries(coordAgg).map(([name, Pessoas]) => ({
    name,
    Pessoas,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Gráficos Analíticos</h1>
        <p className="mt-1 text-xs text-slate-500">
          Análise gráfica detalhada do desempenho da mobilização comunitária
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Locais */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Pessoas Alcançadas por Categoria de Local
          </h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="Pessoas" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Diária */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Evolução Diária de Habitantes Alcançados
          </h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="data" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Pessoas"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aceitação */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Proporção de Aceitação (SIM vs NÃO)
          </h2>
          <div className="flex h-60 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparação Coordenações */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Pessoas Alcançadas por Coordenação
          </h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coordData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="Pessoas" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
