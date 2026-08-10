import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, MapPin, Calculator, HelpCircle, UserCheck } from 'lucide-react';
import { Coordination, Ficha, FichaTableData, Mobilizador, User } from '../types';
import { LOCATION_CONFIGS } from '../data/initialData';
import { useToast } from '../context/ToastContext';

interface NovaFichaViewProps {
  user: User;
  coordenacoes: Coordination[];
  mobilizadores: Mobilizador[];
  onSaveFicha: (ficha: Partial<Ficha>) => Promise<void>;
}

export const NovaFichaView: React.FC<NovaFichaViewProps> = ({
  user,
  coordenacoes,
  mobilizadores,
  onSaveFicha,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';

  // Geo & Mobilizer state
  const [provincia] = useState('CUANZA-SUL');
  const [municipio] = useState('SUMBE');
  const [comuna] = useState('SEDE');
  const [bairro, setBairro] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0]);
  const [ronda, setRonda] = useState('1ª Ronda');
  const [mobilizador, setMobilizador] = useState('');
  const [telefone, setTelefone] = useState('');

  // Coordination selection
  const [coordId, setCoordId] = useState<number>(() => {
    if (!isAdmin && user.coordId) return user.coordId;
    return coordenacoes.length > 0 ? coordenacoes[0].id : 1;
  });

  // Filter mobilizadores available for the selected/active coordination
  const activeCoordMobilizadores = mobilizadores.filter((m) => {
    if (isAdmin) return m.coordId === Number(coordId) || !m.coordId;
    return m.supervisorId ? m.supervisorId === user.id : m.coordId === user.coordId;
  });

  const selectedCoordination = coordenacoes.find((c) => c.id === Number(coordId));
  const availableBairros = selectedCoordination?.bairros || [];

  const handleSelectMobilizador = (mobNome: string) => {
    setMobilizador(mobNome);
    const found = mobilizadores.find(
      (m) => m.nome.toLowerCase().trim() === mobNome.toLowerCase().trim()
    );
    if (found) {
      if (found.telefone) setTelefone(found.telefone);
      if (found.coordId) setCoordId(found.coordId);
      if (found.ronda) setRonda(found.ronda);
    }
  };

  // 14 Location Table State: key -> [locais, pessoas]
  const [tableState, setTableState] = useState<FichaTableData>(() => {
    const init: FichaTableData = {};
    LOCATION_CONFIGS.forEach((loc) => {
      init[loc.key] = [0, 0];
    });
    return init;
  });

  // Acceptance state
  const [sim, setSim] = useState<number>(0);
  const [nao, setNao] = useState<number>(0);
  const [motivo, setMotivo] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin && user.coordId) {
      setCoordId(user.coordId);
    }
  }, [user, isAdmin]);

  const handleInputChange = (
    key: string,
    colIndex: 0 | 1,
    value: string
  ) => {
    const num = Math.max(0, parseInt(value) || 0);
    setTableState((prev) => {
      const current = prev[key] || [0, 0];
      const updated: [number, number] = [current[0], current[1]];
      updated[colIndex] = num;
      return { ...prev, [key]: updated };
    });
  };

  // Calculations
  let grandLocais = 0;
  let grandPessoas = 0;
  let casaLocais = 0;
  let casaPessoas = 0;
  let otherLocais = 0;
  let otherPessoas = 0;

  LOCATION_CONFIGS.forEach((loc) => {
    const val = tableState[loc.key] || [0, 0];
    const l = val[0] || 0;
    const p = val[1] || 0;
    grandLocais += l;
    grandPessoas += p;

    if (loc.group === 'casa') {
      casaLocais += l;
      casaPessoas += p;
    } else {
      otherLocais += l;
      otherPessoas += p;
    }
  });

  const totalRespostas = sim + nao;
  const acceptancePct =
    totalRespostas > 0 ? Math.round((sim / totalRespostas) * 100) : 0;

  const handleReset = () => {
    setBairro('');
    setMobilizador('');
    setTelefone('');
    setData(new Date().toISOString().split('T')[0]);
    setRonda('1ª Ronda');
    const clean: FichaTableData = {};
    LOCATION_CONFIGS.forEach((loc) => {
      clean[loc.key] = [0, 0];
    });
    setTableState(clean);
    setSim(0);
    setNao(0);
    setMotivo('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bairro.trim()) {
      showToast('Por favor insira o Bairro / Comunidade.', 'error');
      return;
    }
    if (!mobilizador.trim()) {
      showToast('Por favor insira o Nome do Mobilizador.', 'error');
      return;
    }

    const selectedCoord = coordenacoes.find((c) => c.id === Number(coordId));
    const coordNome = selectedCoord ? selectedCoord.nome : user.coordNome || '—';
    const coordenadorNome = selectedCoord?.coordenador || user.coordenadorNome || '—';

    const selectedMob = mobilizadores.find(
      (m) => m.nome.toLowerCase().trim() === mobilizador.toLowerCase().trim()
    );

    setIsSaving(true);
    try {
      await onSaveFicha({
        provincia,
        municipio,
        comuna,
        bairro: bairro.trim(),
        data,
        ronda,
        mobilizador: mobilizador.trim(),
        mobilizadorId: selectedMob ? selectedMob.id : null,
        mobilizadorCodigoId: selectedMob?.codigoId || undefined,
        telefone: telefone.trim(),
        coordId: Number(coordId),
        coordNome,
        coordenadorNome,
        supervisorNome: user.nome,
        userId: user.id,
        tableData: tableState,
        totalLocais: grandLocais,
        totalPessoas: grandPessoas,
        sim,
        nao,
        motivo: motivo.trim(),
      });
      showToast('Ficha gravada com sucesso!', 'success');
      handleReset();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Erro ao guardar ficha.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Ficha de Mobilização de Saúde
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Formulário oficial de recolha de dados e aceitação no terreno
        </p>
      </div>

      {/* Dados Gerais Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>Localização & Mobilizador</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Província
            </label>
            <input
              type="text"
              readOnly
              value={provincia}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Município / Distrito
            </label>
            <input
              type="text"
              readOnly
              value={municipio}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Comuna
            </label>
            <input
              type="text"
              readOnly
              value={comuna}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Coordenação Responsável
            </label>
            {isAdmin ? (
              <select
                value={coordId}
                onChange={(e) => setCoordId(Number(e.target.value))}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="select-ficha-coord"
              >
                {coordenacoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value={
                  coordenacoes.find((c) => c.id === user.coordId)?.nome ||
                  user.coordNome ||
                  '—'
                }
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 cursor-not-allowed outline-none"
              />
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-700">
              Bairro / Comunidade <span className="text-red-500">*</span>
            </label>

            {availableBairros.length > 0 && (
              <select
                value={availableBairros.includes(bairro) ? bairro : ''}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                id="select-ficha-bairro"
              >
                <option value="">-- Selecionar Bairro Registado --</option>
                {availableBairros.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              required
              placeholder="Ou digite o nome do bairro..."
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-ficha-bairro"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Data da Atividade <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-ficha-data"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Ronda da Campanha <span className="text-red-500">*</span>
            </label>
            <select
              value={ronda}
              onChange={(e) => setRonda(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="select-ficha-ronda"
            >
              <option value="1ª Ronda">1ª Ronda</option>
              <option value="2ª Ronda">2ª Ronda</option>
              <option value="3ª Ronda">3ª Ronda</option>
              <option value="4ª Ronda">4ª Ronda</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Nome do Mobilizador <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5">
              {activeCoordMobilizadores.length > 0 ? (
                <select
                  value={mobilizador}
                  onChange={(e) => handleSelectMobilizador(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="select-ficha-mobilizador"
                >
                  <option value="">-- Seleccionar Mobilizador Registado --</option>
                  {activeCoordMobilizadores.map((m) => (
                    <option key={m.id} value={m.nome}>
                      {m.nome} ({m.ronda || '1ª Ronda'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Nome completo do agente"
                  value={mobilizador}
                  onChange={(e) => setMobilizador(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  id="input-ficha-mobilizador"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Contacto Telefónico
            </label>
            <input
              type="text"
              placeholder="9XX XXX XXX"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              id="input-ficha-telefone"
            />
          </div>
        </div>
      </div>

      {/* Summary Counters Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {grandPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-emerald-800 mt-1">
            Total Pessoas Alcançadas
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-blue-700">
            {grandLocais.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-blue-800 mt-1">
            Total Locais Visitados
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-amber-700">
            {casaPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-amber-800 mt-1">
            Pessoas Casa a Casa
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-purple-700">
            {otherPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-purple-800 mt-1">
            Pessoas Outros Locais
          </div>
        </div>
      </div>

      {/* Mobilization Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span>Matriz de Mobilização no Terreno (Locais & Pessoas)</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Cálculo em tempo real</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Local de Mobilização</th>
                <th className="p-3 text-center w-40 bg-emerald-50/50 text-emerald-800 border-x border-slate-200">
                  Total Locais
                </th>
                <th className="p-3 text-center w-40 bg-blue-50/50 text-blue-800">
                  Total Pessoas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {/* Casa a Casa Items */}
              {LOCATION_CONFIGS.filter((l) => l.group === 'casa').map((loc) => {
                const val = tableState[loc.key] || [0, 0];
                return (
                  <tr key={loc.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium text-slate-800">{loc.label}</td>
                    <td className="p-1.5 border-x border-slate-100">
                      <input
                        type="number"
                        min="0"
                        value={val[0] || ''}
                        onChange={(e) => handleInputChange(loc.key, 0, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-slate-50 p-2 text-center font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg border border-slate-200 transition"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        value={val[1] || ''}
                        onChange={(e) => handleInputChange(loc.key, 1, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-slate-50 p-2 text-center font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg border border-slate-200 transition"
                      />
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Casa a Casa */}
              <tr className="bg-emerald-50/70 font-bold border-y border-emerald-200 text-emerald-800">
                <td className="p-3 text-xs">↳ SUB-TOTAL CASA A CASA</td>
                <td className="p-3 text-center font-mono border-x border-emerald-200">
                  {casaLocais}
                </td>
                <td className="p-3 text-center font-mono">{casaPessoas}</td>
              </tr>

              {/* Section Header for Other Locals */}
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-y border-slate-200">
                <td colSpan={3} className="p-3">
                  Outros Locais de Mobilização Comunitária
                </td>
              </tr>

              {/* Other Items */}
              {LOCATION_CONFIGS.filter((l) => l.group === 'other').map((loc) => {
                const val = tableState[loc.key] || [0, 0];
                return (
                  <tr key={loc.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium text-slate-800">{loc.label}</td>
                    <td className="p-1.5 border-x border-slate-100">
                      <input
                        type="number"
                        min="0"
                        value={val[0] || ''}
                        onChange={(e) => handleInputChange(loc.key, 0, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-slate-50 p-2 text-center font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg border border-slate-200 transition"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        value={val[1] || ''}
                        onChange={(e) => handleInputChange(loc.key, 1, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-slate-50 p-2 text-center font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg border border-slate-200 transition"
                      />
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Other */}
              <tr className="bg-blue-50/70 font-bold border-y border-blue-200 text-blue-800">
                <td className="p-3 text-xs">↳ SUB-TOTAL OUTROS LOCAIS</td>
                <td className="p-3 text-center font-mono border-x border-blue-200">
                  {otherLocais}
                </td>
                <td className="p-3 text-center font-mono">{otherPessoas}</td>
              </tr>
            </tbody>

            {/* Grand Total Footer */}
            <tfoot>
              <tr className="bg-slate-900 text-sm font-bold text-white">
                <td className="p-3.5">TOTAL GERAL DE ATIVIDADES</td>
                <td className="p-3.5 text-center font-mono border-x border-slate-800">
                  {grandLocais}
                </td>
                <td className="p-3.5 text-center font-mono">
                  {grandPessoas}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pergunta Final de Aceitação */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <HelpCircle className="h-4 w-4 text-purple-600" />
          <span>Pergunta de Aceitação da Visita Vacinal</span>
        </div>

        <p className="text-sm font-semibold text-slate-800">
          "As equipas virão vacinar as crianças. Queres que venham à tua casa?"
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-emerald-700">
              Responderam SIM
            </label>
            <input
              type="number"
              min="0"
              value={sim || ''}
              onChange={(e) => setSim(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="mt-1.5 w-full h-11 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 text-sm font-bold font-mono text-emerald-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition"
              id="input-ficha-sim"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-red-700">
              Responderam NÃO
            </label>
            <input
              type="number"
              min="0"
              value={nao || ''}
              onChange={(e) => setNao(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="mt-1.5 w-full h-11 rounded-xl border border-red-200 bg-red-50/50 px-3.5 text-sm font-bold font-mono text-red-800 outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/20 transition"
              id="input-ficha-nao"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-purple-700">
              Taxa de Aceitação
            </label>
            <div className="mt-1.5 flex h-11 items-center justify-between rounded-xl border border-purple-200 bg-purple-50/50 px-3.5 text-xs font-bold text-purple-900">
              <span>{acceptancePct}% de Aceitação</span>
              <span className="text-xs text-purple-600 font-medium">
                ({sim} SIM / {totalRespostas} Total)
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Motivo da Recusa (quando responderam NÃO)
          </label>
          <input
            type="text"
            placeholder="Descreva o motivo informado pelas famílias recusantes..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
            id="input-ficha-motivo"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex h-11 items-center gap-2 rounded-xl bg-[#00B2FF] px-6 text-xs font-bold text-white shadow-xs transition hover:bg-[#009ee3] active:scale-[0.98] disabled:opacity-50"
          id="btn-guardar-ficha"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'A guardar...' : 'Guardar Ficha de Mobilização'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
          id="btn-limpar-ficha"
        >
          <RotateCcw className="h-4 w-4 text-slate-500" />
          <span>Limpar Campos</span>
        </button>
      </div>
    </form>
  );
};
