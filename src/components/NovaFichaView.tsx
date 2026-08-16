import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, MapPin, Calculator, HelpCircle, UserCheck, ShieldAlert, Activity, CheckSquare } from 'lucide-react';
import { CasoPFA, Coordination, Ficha, FichaTableData, Mobilizador, User } from '../types';
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
  const [ronda, setRonda] = useState('3ª Ronda');
  const [mobilizador, setMobilizador] = useState('');
  const [telefone, setTelefone] = useState('');
  const [numeroEquipa, setNumeroEquipa] = useState('');

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
      if (found.numeroEquipa) setNumeroEquipa(found.numeroEquipa);
      else setNumeroEquipa('');
      if (found.coordId) setCoordId(found.coordId);
      if (found.ronda) setRonda(found.ronda);
    } else {
      setNumeroEquipa('');
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

  // PFA (Paralisia Flácida Aguda) State
  const [pfaDetetado, setPfaDetetado] = useState(false);
  const [pfaNomeCrianca, setPfaNomeCrianca] = useState('');
  const [pfaIdadeCrianca, setPfaIdadeCrianca] = useState('');
  const [pfaSexoCrianca, setPfaSexoCrianca] = useState<'Masculino' | 'Feminino'>('Masculino');
  
  // Guardião / Encarregado com quem vive
  const [pfaComQuemVive, setPfaComQuemVive] = useState<string>('Pais');
  const [pfaNomePai, setPfaNomePai] = useState('');
  const [pfaNomeMae, setPfaNomeMae] = useState('');
  const [pfaNomeEncarregado, setPfaNomeEncarregado] = useState('');
  const [pfaTelefoneEncarregado, setPfaTelefoneEncarregado] = useState('');
  const [pfaMorada, setPfaMorada] = useState('');
  const [pfaTempoEstagio, setPfaTempoEstagio] = useState('3 dias');
  const [pfaMembroAfetado, setPfaMembroAfetado] = useState('Perna Esquerda');
  const [pfaFebreNoInicio, setPfaFebreNoInicio] = useState<'Sim' | 'Não' | 'Desconhecido'>('Sim');
  const [pfaSintomas, setPfaSintomas] = useState('');

  // Acompanhamento Técnico de Saúde
  const [pfaEstaAcompanhada, setPfaEstaAcompanhada] = useState<'Sim' | 'Não' | 'Em Processo'>('Sim');
  const [pfaTecnicoAcompanhante, setPfaTecnicoAcompanhante] = useState('');
  const [pfaTecnicoTelefone, setPfaTecnicoTelefone] = useState('');
  const [pfaDataUltimoAcompanhamento, setPfaDataUltimoAcompanhamento] = useState('');

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

  // Auto-fill SIM with total number of persons reached from the location tables
  useEffect(() => {
    setSim(grandPessoas);
  }, [grandPessoas]);

  const totalRespostas = sim + nao;
  const acceptancePct =
    totalRespostas > 0 ? Math.round((sim / totalRespostas) * 100) : 0;

  const handleReset = () => {
    setBairro('');
    setMobilizador('');
    setTelefone('');
    setNumeroEquipa('');
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

    // Reset PFA
    setPfaDetetado(false);
    setPfaNomeCrianca('');
    setPfaIdadeCrianca('');
    setPfaSexoCrianca('Masculino');
    setPfaComQuemVive('Pais');
    setPfaNomePai('');
    setPfaNomeMae('');
    setPfaNomeEncarregado('');
    setPfaTelefoneEncarregado('');
    setPfaMorada('');
    setPfaTempoEstagio('3 dias');
    setPfaMembroAfetado('Perna Esquerda');
    setPfaFebreNoInicio('Sim');
    setPfaSintomas('');
    setPfaEstaAcompanhada('Sim');
    setPfaTecnicoAcompanhante('');
    setPfaTecnicoTelefone('');
    setPfaDataUltimoAcompanhamento('');
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

    if (pfaDetetado) {
      if (!pfaNomeCrianca.trim()) {
        showToast('Por favor preencha o nome da criança no caso de PFA.', 'error');
        return;
      }
      if (pfaComQuemVive === 'Pais') {
        if (!pfaNomePai.trim() && !pfaNomeMae.trim()) {
          showToast('Por favor preencha o nome do Pai e/ou da Mãe da criança.', 'error');
          return;
        }
      } else {
        if (!pfaNomeEncarregado.trim()) {
          showToast(`Por favor preencha o nome do encarregado (${pfaComQuemVive}).`, 'error');
          return;
        }
      }
    }

    const selectedCoord = coordenacoes.find((c) => c.id === Number(coordId));
    const coordNome = selectedCoord ? selectedCoord.nome : user.coordNome || '—';
    const coordenadorNome = selectedCoord?.coordenador || user.coordenadorNome || '—';

    const selectedMob = mobilizadores.find(
      (m) => m.nome.toLowerCase().trim() === mobilizador.toLowerCase().trim()
    );

    const calculatedEncarregado = pfaComQuemVive === 'Pais'
      ? ([pfaNomePai.trim(), pfaNomeMae.trim()].filter(Boolean).join(' e ') || 'Pais')
      : pfaNomeEncarregado.trim();

    // Build PFA Case array if detected
    const pfaCasosList: CasoPFA[] = pfaDetetado
      ? [
          {
            id: `pfa_${Date.now()}`,
            provincia,
            municipio,
            comuna,
            bairro: bairro.trim(),
            dataDetecao: data,
            nomeCrianca: pfaNomeCrianca.trim(),
            idadeCrianca: pfaIdadeCrianca.trim() || 'Não especificada',
            sexoCrianca: pfaSexoCrianca,
            comQuemVive: pfaComQuemVive,
            nomePai: pfaNomePai.trim(),
            nomeMae: pfaNomeMae.trim(),
            nomeEncarregado: calculatedEncarregado,
            telefoneEncarregado: pfaTelefoneEncarregado.trim() || telefone.trim(),
            morada: pfaMorada.trim() || bairro.trim(),
            tempoEstagio: pfaTempoEstagio.trim() || '3 dias',
            membroAfetado: pfaMembroAfetado,
            febreNoInicio: pfaFebreNoInicio,
            sintomasDescricao: pfaSintomas.trim(),
            estaAcompanhada: pfaEstaAcompanhada,
            tecnicoAcompanhante: pfaTecnicoAcompanhante.trim(),
            tecnicoTelefone: pfaTecnicoTelefone.trim(),
            dataUltimoAcompanhamento: pfaDataUltimoAcompanhamento.trim(),
            mobilizadorNome: mobilizador.trim(),
            mobilizadorTelefone: telefone.trim(),
            coordId: Number(coordId),
            coordNome,
            statusNotificacao: pfaEstaAcompanhada === 'Sim' ? 'Em Acompanhamento' : 'Pendente de Investigação',
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

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
        numeroEquipa: numeroEquipa.trim() || selectedMob?.numeroEquipa || undefined,
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
        pfaDetetado,
        pfaCasos: pfaCasosList,
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
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Localização & Mobilizador</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Província
            </label>
            <input
              type="text"
              readOnly
              value={provincia}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Município / Distrito
            </label>
            <input
              type="text"
              readOnly
              value={municipio}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed outline-none"
            />
          </div>

          {/* Coordenação Responsável between Município and Comuna */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Coordenação Responsável
            </label>
            {isAdmin ? (
              <select
                value={coordId}
                onChange={(e) => setCoordId(Number(e.target.value))}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-medium text-slate-900 dark:text-white outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
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
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Comuna
            </label>
            <input
              type="text"
              readOnly
              value={comuna}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Bairro / Comunidade <span className="text-red-500">*</span>
            </label>

            {availableBairros.length > 0 && (
              <select
                value={availableBairros.includes(bairro) ? bairro : ''}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
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
              className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              id="input-ficha-bairro"
            />
          </div>

          {/* Nome do Mobilizador right after Bairro */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Nome do Mobilizador</span>
              <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-mono font-bold text-[11px] border border-sky-300 dark:border-sky-700">
                {ronda}
              </span>
              <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5">
              {activeCoordMobilizadores.length > 0 ? (
                <select
                  value={mobilizador}
                  onChange={(e) => handleSelectMobilizador(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-medium"
                  id="select-ficha-mobilizador"
                >
                  <option value="">-- Seleccionar Mobilizador Registado --</option>
                  {activeCoordMobilizadores.map((m) => (
                    <option key={m.id} value={m.nome}>
                      [{m.ronda || '3ª Ronda'}] — {m.nome}
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
                  className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  id="input-ficha-mobilizador"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Contacto Telefónico
            </label>
            <input
              type="text"
              placeholder="9XX XXX XXX"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              id="input-ficha-telefone"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Número da Equipa</span>
              <span className="text-[10px] font-normal text-slate-400">(Fixo / Cadastro RH)</span>
            </label>
            <div className="relative mt-1.5">
              <input
                type="text"
                readOnly
                placeholder="—"
                value={numeroEquipa || (mobilizador ? 'Sem equipa atribuída' : 'Selecione o mobilizador')}
                className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 pl-3.5 pr-3 text-xs font-bold text-indigo-900 dark:text-indigo-300 cursor-not-allowed outline-none"
                id="input-ficha-equipa"
              />
              {numeroEquipa && (
                <span className="absolute right-3 top-2.5 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-mono font-black text-[11px] border border-indigo-300 dark:border-indigo-700">
                  {numeroEquipa}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ronda da Campanha <span className="text-red-500">*</span>
            </label>
            <select
              value={ronda}
              onChange={(e) => setRonda(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-medium text-slate-900 dark:text-white outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              id="select-ficha-ronda"
            >
              <option value="1ª Ronda">1ª Ronda</option>
              <option value="2ª Ronda">2ª Ronda</option>
              <option value="3ª Ronda">3ª Ronda</option>
              <option value="4ª Ronda">4ª Ronda</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Data da Atividade <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              id="input-ficha-data"
            />
          </div>
        </div>
      </div>

      {/* Summary Counters Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
            {grandPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mt-1">
            Total Pessoas Alcançadas
          </div>
        </div>

        <div className="rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-950/40 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-400">
            {grandLocais.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-blue-900 dark:text-blue-300 mt-1">
            Total Locais Visitados
          </div>
        </div>

        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
            {casaPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-amber-900 dark:text-amber-300 mt-1">
            Pessoas Casa a Casa
          </div>
        </div>

        <div className="rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50/80 dark:bg-purple-950/40 p-4 text-center shadow-xs">
          <div className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-400">
            {otherPessoas.toLocaleString()}
          </div>
          <div className="text-xs font-bold text-purple-900 dark:text-purple-300 mt-1">
            Pessoas Outros Locais
          </div>
        </div>
      </div>

      {/* Mobilization Table */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Matriz de Mobilização no Terreno (Locais & Pessoas)</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cálculo em tempo real</span>
        </div>

        <div className="overflow-x-auto rounded-xl border-2 border-slate-400 dark:border-slate-600 shadow-xs">
          <table className="w-full text-left text-xs text-slate-900 dark:text-slate-100 border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase border-b-2 border-slate-400 dark:border-slate-600">
              <tr>
                <th className="p-3.5 border-r-2 border-slate-400 dark:border-slate-600">
                  Local de Mobilização
                </th>
                <th className="p-3.5 text-center w-44 bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-r-2 border-slate-400 dark:border-slate-600 font-bold">
                  Total Locais
                </th>
                <th className="p-3.5 text-center w-44 bg-blue-100/70 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold">
                  Total Pessoas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-300 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {/* Casa a Casa Items */}
              {LOCATION_CONFIGS.filter((l) => l.group === 'casa').map((loc) => {
                const val = tableState[loc.key] || [0, 0];
                return (
                  <tr key={loc.key} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-700">
                      {loc.label}
                    </td>
                    <td className="p-2 border-r-2 border-slate-300 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-950/20">
                      <input
                        type="number"
                        min="0"
                        value={val[0] || ''}
                        onChange={(e) => handleInputChange(loc.key, 0, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-white dark:bg-slate-800 p-2 text-center font-mono font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 transition"
                      />
                    </td>
                    <td className="p-2 bg-blue-50/30 dark:bg-blue-950/20">
                      <input
                        type="number"
                        min="0"
                        value={val[1] || ''}
                        onChange={(e) => handleInputChange(loc.key, 1, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-white dark:bg-slate-800 p-2 text-center font-mono font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 transition"
                      />
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Casa a Casa */}
              <tr className="bg-emerald-100/80 dark:bg-emerald-950/80 font-bold border-y-2 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200">
                <td className="p-3 text-xs border-r-2 border-emerald-400 dark:border-emerald-600 font-extrabold">
                  ↳ SUB-TOTAL CASA A CASA
                </td>
                <td className="p-3 text-center font-mono text-sm border-r-2 border-emerald-400 dark:border-emerald-600 font-black">
                  {casaLocais}
                </td>
                <td className="p-3 text-center font-mono text-sm font-black">
                  {casaPessoas}
                </td>
              </tr>

              {/* Section Header for Other Locals */}
              <tr className="bg-slate-200/90 dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-y-2 border-slate-400 dark:border-slate-600">
                <td colSpan={3} className="p-3 font-extrabold text-slate-900 dark:text-white">
                  Outros Locais de Mobilização Comunitária
                </td>
              </tr>

              {/* Other Items */}
              {LOCATION_CONFIGS.filter((l) => l.group === 'other').map((loc) => {
                const val = tableState[loc.key] || [0, 0];
                return (
                  <tr key={loc.key} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-700">
                      {loc.label}
                    </td>
                    <td className="p-2 border-r-2 border-slate-300 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-950/20">
                      <input
                        type="number"
                        min="0"
                        value={val[0] || ''}
                        onChange={(e) => handleInputChange(loc.key, 0, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-white dark:bg-slate-800 p-2 text-center font-mono font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 transition"
                      />
                    </td>
                    <td className="p-2 bg-blue-50/30 dark:bg-blue-950/20">
                      <input
                        type="number"
                        min="0"
                        value={val[1] || ''}
                        onChange={(e) => handleInputChange(loc.key, 1, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 bg-white dark:bg-slate-800 p-2 text-center font-mono font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 transition"
                      />
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Other */}
              <tr className="bg-blue-100/80 dark:bg-blue-950/80 font-bold border-y-2 border-blue-400 dark:border-blue-600 text-blue-950 dark:text-blue-200">
                <td className="p-3 text-xs border-r-2 border-blue-400 dark:border-blue-600 font-extrabold">
                  ↳ SUB-TOTAL OUTROS LOCAIS
                </td>
                <td className="p-3 text-center font-mono text-sm border-r-2 border-blue-400 dark:border-blue-600 font-black">
                  {otherLocais}
                </td>
                <td className="p-3 text-center font-mono text-sm font-black">
                  {otherPessoas}
                </td>
              </tr>
            </tbody>

            {/* Grand Total Footer */}
            <tfoot>
              <tr className="bg-slate-900 text-sm font-bold text-white border-t-2 border-slate-950">
                <td className="p-3.5 border-r-2 border-slate-700 font-black">TOTAL GERAL DE ATIVIDADES</td>
                <td className="p-3.5 text-center font-mono text-base border-r-2 border-slate-700 font-black text-emerald-400">
                  {grandLocais}
                </td>
                <td className="p-3.5 text-center font-mono text-base font-black text-blue-400">
                  {grandPessoas}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pergunta Final de Aceitação */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span>Pergunta de Aceitação da Visita Vacinal</span>
        </div>

        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          "As equipas virão vacinar as crianças. Queres que venham à tua casa?"
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Responderam SIM
            </label>
            <input
              type="number"
              min="0"
              value={sim || ''}
              onChange={(e) => setSim(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="mt-1.5 w-full h-11 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 px-3.5 text-sm font-bold font-mono text-emerald-900 dark:text-emerald-200 outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 transition"
              id="input-ficha-sim"
            />
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span>✓ Preenchido automaticamente com base no total de pessoas alcançadas ({grandPessoas} pessoas)</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-red-800 dark:text-red-300">
              Responderam NÃO
            </label>
            <input
              type="number"
              min="0"
              value={nao || ''}
              onChange={(e) => setNao(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="mt-1.5 w-full h-11 rounded-xl border-2 border-red-400 dark:border-red-600 bg-red-50/60 dark:bg-red-950/40 px-3.5 text-sm font-bold font-mono text-red-900 dark:text-red-200 outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/30 transition"
              id="input-ficha-nao"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-purple-800 dark:text-purple-300">
              Taxa de Aceitação
            </label>
            <div className="mt-1.5 flex h-11 items-center justify-between rounded-xl border-2 border-purple-400 dark:border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 px-3.5 text-xs font-bold text-purple-950 dark:text-purple-200">
              <span>{acceptancePct}% de Aceitação</span>
              <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                ({sim} SIM / {totalRespostas} Total)
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Motivo da Recusa (quando responderam NÃO)
          </label>
          <input
            type="text"
            placeholder="Descreva o motivo informado pelas famílias recusantes..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            id="input-ficha-motivo"
          />
        </div>
      </div>

      {/* Secção Especial de Vigilância de PFA (Paralisia Flácida Aguda) */}
      <div className={`rounded-2xl border-2 p-6 shadow-sm space-y-4 transition-all ${
        pfaDetetado ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/40' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <ShieldAlert className={`h-4 w-4 ${pfaDetetado ? 'text-rose-600' : 'text-slate-500'}`} />
            <span>Vigilância Epidemiológica - Paralisia Flácida Aguda (PFA)</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pfaDetetado}
              onChange={(e) => setPfaDetetado(e.target.checked)}
              className="sr-only peer"
              id="checkbox-pfa-detetado"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            <span className="ml-3 text-xs font-bold text-slate-800">
              {pfaDetetado ? 'CASO DE PFA ENCONTRADO!' : 'Registar Caso de PFA nesta área'}
            </span>
          </label>
        </div>

        {pfaDetetado ? (
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> Insira os dados da criança com sintomas de paralisia e dos respetivos pais. Este caso será encaminhado automaticamente para o painel de vigilância epidemiológica municipal.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nome Completo da Criança <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Esperança Mateus Paulo"
                  value={pfaNomeCrianca}
                  onChange={(e) => setPfaNomeCrianca(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Idade da Criança <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 anos ou 18 meses"
                  value={pfaIdadeCrianca}
                  onChange={(e) => setPfaIdadeCrianca(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Sexo da Criança
                </label>
                <select
                  value={pfaSexoCrianca}
                  onChange={(e) => setPfaSexoCrianca(e.target.value as any)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>

              {/* Com quem vive a criação / Grau de Parentesco */}
              <div className="sm:col-span-2 lg:col-span-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                    Com quem vive a criança? (Encarregados) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={pfaComQuemVive}
                    onChange={(e) => setPfaComQuemVive(e.target.value)}
                    className="w-full h-11 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-bold text-slate-900 outline-none transition focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 cursor-pointer"
                    id="select-pfa-com-quem-vive"
                  >
                    <option value="Pais">Com os Pais</option>
                    <option value="Pai">Apenas Pai</option>
                    <option value="Mãe">Apenas Mãe</option>
                    <option value="Tio(a)">Tio(a)</option>
                    <option value="Primo(a)">Primo(a)</option>
                    <option value="Irmão(ã)">Irmão(ã)</option>
                    <option value="Cunhado(a)">Cunhado(a)</option>
                    <option value="Avô(ó)">Avô(ó)</option>
                    <option value="Outro">Outro Encarregado</option>
                  </select>
                </div>

                {/* Campos Dinâmicos de Acordo com Parentesco */}
                {pfaComQuemVive === 'Pais' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Nome Completo do Pai <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Mateus Paulo"
                        value={pfaNomePai}
                        onChange={(e) => setPfaNomePai(e.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Nome Completo da Mãe <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Ana Maria"
                        value={pfaNomeMae}
                        onChange={(e) => setPfaNomeMae(e.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                      />
                    </div>
                  </div>
                ) : pfaComQuemVive === 'Pai' ? (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nome Completo do Pai <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mateus Paulo"
                      value={pfaNomePai}
                      onChange={(e) => setPfaNomePai(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                    />
                  </div>
                ) : pfaComQuemVive === 'Mãe' ? (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nome Completo da Mãe <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Ana Maria"
                      value={pfaNomeMae}
                      onChange={(e) => setPfaNomeMae(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                    />
                  </div>
                ) : (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nome Completo do Encarregado ({pfaComQuemVive}) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={`Ex: Nome do(a) ${pfaComQuemVive} responsável pela criança`}
                      value={pfaNomeEncarregado}
                      onChange={(e) => setPfaNomeEncarregado(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Telefone de Contacto do Encarregado
                </label>
                <input
                  type="text"
                  placeholder="Ex: 924112233"
                  value={pfaTelefoneEncarregado}
                  onChange={(e) => setPfaTelefoneEncarregado(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Morada / Ponto de Referência Detalhado
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rua do Chafariz, Casa nº 42"
                  value={pfaMorada}
                  onChange={(e) => setPfaMorada(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tempo de Estágio / Início dos Sintomas
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5 dias, 2 semanas"
                  value={pfaTempoEstagio}
                  onChange={(e) => setPfaTempoEstagio(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Membro Afetado
                </label>
                <select
                  value={pfaMembroAfetado}
                  onChange={(e) => setPfaMembroAfetado(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600"
                >
                  <option value="Perna Esquerda">Perna Esquerda</option>
                  <option value="Perna Direita">Perna Direita</option>
                  <option value="Ambas as Pernas">Ambas as Pernas</option>
                  <option value="Braço Esquerdo/Direito">Braço Esquerdo/Direito</option>
                  <option value="Todos os Membros">Todos os Membros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Febre no Início da Paralisia?
                </label>
                <select
                  value={pfaFebreNoInicio}
                  onChange={(e) => setPfaFebreNoInicio(e.target.value as any)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-rose-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-rose-600"
                >
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                  <option value="Desconhecido">Desconhecido</option>
                </select>
              </div>

              {/* Secção de Acompanhamento por Técnico de Saúde */}
              <div className="sm:col-span-2 lg:col-span-3 p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-sky-900 uppercase tracking-wide">
                    Acompanhamento por Técnico de Saúde / Epidemiologia
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">A criança está a ser acompanhada?</span>
                    <select
                      value={pfaEstaAcompanhada}
                      onChange={(e) => setPfaEstaAcompanhada(e.target.value as any)}
                      className="h-8 rounded-lg border border-sky-300 bg-white px-2 text-xs font-bold text-sky-900 outline-none focus:border-sky-600"
                    >
                      <option value="Sim">Sim (Está Acompanhada)</option>
                      <option value="Em Processo">Em Processo / Aguarda Técnico</option>
                      <option value="Não">Não (Sem Acompanhamento)</option>
                    </select>
                  </div>
                </div>

                {pfaEstaAcompanhada !== 'Não' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Nome do Técnico Responsável
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Dr. Manuel Santos (Epidemiologia)"
                        value={pfaTecnicoAcompanhante}
                        onChange={(e) => setPfaTecnicoAcompanhante(e.target.value)}
                        className="mt-1 w-full h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Telefone / Contacto do Técnico
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 923112233"
                        value={pfaTecnicoTelefone}
                        onChange={(e) => setPfaTecnicoTelefone(e.target.value)}
                        className="mt-1 w-full h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Data da Última Visita / Acompanhamento
                      </label>
                      <input
                        type="date"
                        value={pfaDataUltimoAcompanhamento}
                        onChange={(e) => setPfaDataUltimoAcompanhamento(e.target.value)}
                        className="mt-1 w-full h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Observações e Sintomas Detalhados
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva a fraqueza muscular, perda de mobilidade ou observações da família..."
                  value={pfaSintomas}
                  onChange={(e) => setPfaSintomas(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-rose-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Assinale a opção acima caso os mobilizadores tenham detetado alguma criança com fraqueza ou paralisia súbita de pernas/braços nesta área.
          </p>
        )}
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
