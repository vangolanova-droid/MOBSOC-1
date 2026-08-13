import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  X,
  MapPin,
  CheckCircle2,
  Clock,
  Radio,
  Building2,
  Filter,
  FileText,
  Activity,
  UserCheck,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { User, Ficha, Coordination, Mobilizador, ODKSubmission } from '../types';

interface ActiveSupervisorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser?: User | null;
  fichas: Ficha[];
  odkSubmissions?: ODKSubmission[];
  coordenacoes?: Coordination[];
  mobilizadores?: Mobilizador[];
  onSelectSupervisorFichas?: (supervisorNome: string) => void;
}

export interface ActiveSupervisorItem {
  id: number | string;
  nome: string;
  email: string;
  tipo: string;
  coordNome: string;
  ronda: string;
  statusOnline: boolean;
  fichasCount: number;
  fichasHojeCount: number;
  pessoasHojeCount: number;
  ultimoLancamento: string;
  bairroAtivo: string;
  mobilizadoresCount: number;
  mobilizadoresNomes: string[];
  fotoUrl?: string;
  telefone?: string;
  morada?: string;
}

export const ActiveSupervisorsModal: React.FC<ActiveSupervisorsModalProps> = ({
  isOpen,
  onClose,
  users = [],
  currentUser,
  fichas = [],
  odkSubmissions = [],
  coordenacoes = [],
  mobilizadores = [],
  onSelectSupervisorFichas,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoordFilter, setSelectedCoordFilter] = useState('Todas');

  const todayStr = new Date().toISOString().split('T')[0];

  // Process and compute supervisors actively LOGGED IN into the system
  const supervisorsList = useMemo<ActiveSupervisorItem[]>(() => {
    // STRICT FILTER: Only users with supervisor/admin role AND active logged-in session
    const loggedInUsers = users.filter((u) => {
      const isSupervisorRole = u.tipo === 'supervisor' || u.tipo === 'admin';
      const isCurrentlyLoggedIn =
        u.isOnline === true ||
        u.isLogged === true ||
        (currentUser && u.id === currentUser.id);

      return isSupervisorRole && isCurrentlyLoggedIn;
    });

    const map = new Map<string, ActiveSupervisorItem>();

    // Initialize map ONLY from logged-in users
    loggedInUsers.forEach((u) => {
      const coord = coordenacoes.find((c) => c.id === u.coordId);
      const coordNome = u.coordNome || coord?.nome || 'Coordenação Geral';
      const supervisorMobs = mobilizadores.filter(
        (m) => m.supervisorId === u.id || m.coordId === u.coordId
      );

      map.set(u.nome.toLowerCase().trim(), {
        id: u.id,
        nome: u.nome,
        email: u.email,
        tipo: u.tipo === 'admin' ? 'Coordenador / Admin' : 'Supervisor de Campo',
        coordNome,
        ronda: u.ronda || '1ª Ronda',
        statusOnline: true,
        fichasCount: 0,
        fichasHojeCount: 0,
        pessoasHojeCount: 0,
        ultimoLancamento: u.ultimoAcesso || 'Com sessão iniciada agora',
        bairroAtivo: coord?.bairros?.[0] || 'Sumbe Urbano',
        mobilizadoresCount: supervisorMobs.length,
        mobilizadoresNomes: supervisorMobs.map((m) => m.nome),
        fotoUrl: u.fotoUrl,
        telefone: u.telefone,
        morada: u.morada,
      });
    });

    // 2. Aggregate Fichas metrics
    fichas.forEach((f) => {
      const supKey = (f.supervisorNome || f.coordenadorNome || '').toLowerCase().trim();
      let item = map.get(supKey);

      // If no direct supervisor match, match by user ID or coord
      if (!item) {
        const matchedUser = loggedInUsers.find((u) => u.id === f.userId);
        if (matchedUser) {
          item = map.get(matchedUser.nome.toLowerCase().trim());
        }
      }

      if (item) {
        item.fichasCount += 1;

        // Check if ficha is from today or recent
        const isToday = f.data === todayStr || (f.createdAt && f.createdAt.startsWith(todayStr));
        if (isToday) {
          item.fichasHojeCount += 1;
          item.pessoasHojeCount += f.totalPessoas || 0;
        }

        if (f.bairro) {
          item.bairroAtivo = f.bairro;
        }

        const fichaDate = f.data || (f.createdAt ? f.createdAt.split('T')[0] : '');
        if (fichaDate) {
          item.ultimoLancamento = `Hoje (${fichaDate})`;
        }
      }
    });

    // 3. Aggregate ODK Submissions
    odkSubmissions.forEach((s) => {
      const supKey = s.supervisorNome.toLowerCase().trim();
      const item = map.get(supKey);
      if (item) {
        item.fichasCount += s.totalFormularios || 1;
        if (s.dataEnvio === todayStr) {
          item.fichasHojeCount += s.totalFormularios || 1;
        }
        item.ultimoLancamento = `ODK: ${s.horaEnvio || 'Hoje'}`;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.fichasHojeCount - a.fichasHojeCount);
  }, [users, fichas, odkSubmissions, coordenacoes, mobilizadores, todayStr]);

  // Filtered list
  const filteredSupervisors = useMemo(() => {
    return supervisorsList.filter((s) => {
      const matchesSearch =
        !searchQuery.trim() ||
        s.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.coordNome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bairroAtivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobilizadoresNomes.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCoord =
        selectedCoordFilter === 'Todas' || s.coordNome === selectedCoordFilter;

      return matchesSearch && matchesCoord;
    });
  }, [supervisorsList, searchQuery, selectedCoordFilter]);

  // Total summary metrics
  const totalActive = supervisorsList.length;
  const totalFichasHoje = supervisorsList.reduce((acc, curr) => acc + curr.fichasHojeCount, 0);
  const totalPessoasHoje = supervisorsList.reduce((acc, curr) => acc + curr.pessoasHojeCount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl text-white space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold shadow-lg">
              <Radio className="h-6 w-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Supervisores & Equipas a Lançar Dados</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-black text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    {totalActive} Ativos
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Monitorização em tempo real das pessoas com <strong className="text-emerald-400 font-bold">sessão iniciada (logadas)</strong> no sistema SisMob
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="self-end sm:self-auto rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title="Fechar Modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-200 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Sessões Ativas em Tempo Real:</strong> Esta lista apresenta <strong>apenas</strong> utilizadores/supervisores com login ativo na plataforma. Supervisores cadastrados que não iniciaram sessão estão ocultos.
          </span>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Supervisores Ativos
              </span>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalActive}</div>
            <p className="text-[10px] text-slate-400">Com credenciais válidas e dados em sincronização</p>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/30 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-sky-400">
              <span>Fichas Lançadas Hoje</span>
              <FileText className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalFichasHoje}</div>
            <p className="text-[10px] text-slate-400">Formulários e registos submetidos hoje</p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-purple-400">
              <span>Pessoas Sensibilizadas Hoje</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalPessoasHoje.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400">Cidadãos informados pelas equipas em campo</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-950/50 p-2.5 rounded-2xl border border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar supervisor, coordenação, bairro..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 mr-1">Coordenação:</span>
            {['Todas', ...Array.from(new Set(supervisorsList.map((s) => s.coordNome)))].map((coord) => (
              <button
                key={coord}
                onClick={() => setSelectedCoordFilter(coord)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCoordFilter === coord
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {coord}
              </button>
            ))}
          </div>
        </div>

        {/* Main List of Active Supervisors */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredSupervisors.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800">
              <Users className="h-10 w-10 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-300">
                Nenhum supervisor encontrado com os filtros selecionados.
              </p>
            </div>
          ) : (
            filteredSupervisors.map((sup) => (
              <div
                key={sup.id}
                className="group relative rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/60 p-4 transition-all duration-200 shadow-md space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Avatar & Supervisor Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {sup.fotoUrl ? (
                        <img
                          src={sup.fotoUrl}
                          alt={sup.nome}
                          className="h-12 w-12 rounded-2xl object-cover border-2 border-emerald-500/40"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black text-sm border border-emerald-400/30 shadow-md">
                          {sup.nome.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                          {sup.nome}
                        </h3>
                        <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                          <Activity className="h-3 w-3 text-emerald-400" />
                          <span>A Lançar Dados</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-sky-400" />
                          {sup.coordNome}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300 font-mono">{sup.ronda}</span>
                        <span>•</span>
                        <span className="text-slate-400">{sup.tipo}</span>
                      </div>

                      {sup.morada && (
                        <div className="text-[11px] font-medium text-sky-300 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-sky-400" />
                          <span>Residência: {sup.morada}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {onSelectSupervisorFichas && (
                      <button
                        onClick={() => {
                          onSelectSupervisorFichas(sup.nome);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-black text-slate-950 shadow-md transition active:scale-95 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Ver Fichas deste Supervisor</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Supervisor Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Bairro / Local Ativo</span>
                    <p className="font-bold text-emerald-300 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 text-emerald-400" />
                      {sup.bairroAtivo}
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Lançamentos Hoje</span>
                    <p className="font-bold text-white flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-sky-400" />
                      {sup.fichasHojeCount} fichas
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Pessoas Alcancadas</span>
                    <p className="font-bold text-purple-300">
                      {sup.pessoasHojeCount} pessoas
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Último Lançamento</span>
                    <p className="font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      {sup.ultimoLancamento}
                    </p>
                  </div>
                </div>

                {/* Subvised Mobilizadores */}
                {sup.mobilizadoresNomes.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-300">Mobilizadores Sob Supervisão:</span>
                    {sup.mobilizadoresNomes.slice(0, 4).map((mob, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-medium"
                      >
                        {mob}
                      </span>
                    ))}
                    {sup.mobilizadoresNomes.length > 4 && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        +{sup.mobilizadoresNomes.length - 4} outros
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Lista de Supervisores</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-bold text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
