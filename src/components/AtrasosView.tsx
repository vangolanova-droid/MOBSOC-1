import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Clock, Send, Users, Calendar, ShieldAlert, ArrowRight, MessageSquare, Check } from 'lucide-react';
import { User, Ficha, Coordination, Mobilizador } from '../types';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface AtrasosViewProps {
  user: User;
  users: User[];
  fichas: Ficha[];
  coordenacoes: Coordination[];
  mobilizadores: Mobilizador[];
  onNewFicha: () => void;
}

export const AtrasosView: React.FC<AtrasosViewProps> = ({
  user,
  users,
  fichas,
  coordenacoes,
  mobilizadores,
  onNewFicha,
}) => {
  const { showToast } = useToast();
  const isAdmin = user.tipo === 'admin';

  // Selected date filter (default today)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customMsg, setCustomMsg] = useState('');
  const [selectedSupForMsg, setSelectedSupForMsg] = useState<User | null>(null);

  // Sent alerts stored in Firestore for persistence
  const [sentAlerts, setSentAlerts] = useState<{ [key: string]: boolean }>({});
  const [adminMessages, setAdminMessages] = useState<any[]>([]);

  useEffect(() => {
    api.getAdminAlerts().then((alerts) => setSentAlerts(alerts));
    api.getAdminMessages().then((msgs) => setAdminMessages(msgs));
  }, []);

  // Filter supervisors
  const supervisores = useMemo(() => {
    return users.filter((u) => u.tipo === 'user' || u.tipo === 'supervisor' || u.tipo === 'coordenador');
  }, [users]);

  // Supervisors submission stats for selectedDate
  const supervisorStats = useMemo(() => {
    return supervisores.map((sup) => {
      // Find fichas submitted by or under this supervisor for selectedDate
      const supsFichasOnDate = fichas.filter((f) => {
        if (f.data !== selectedDate) return false;
        const matchesSupId = f.supervisorId === sup.id || f.criadoPor === sup.email;
        const matchesCoord = f.coordId === sup.coordId;
        return matchesSupId || matchesCoord;
      });

      // Find last submission date for this supervisor
      const allSupsFichas = fichas.filter(
        (f) => f.supervisorId === sup.id || f.criadoPor === sup.email || f.coordId === sup.coordId
      );
      const lastFicha = [...allSupsFichas].sort((a, b) => b.data.localeCompare(a.data))[0];

      // Total mobilizadores under supervisor/coordination
      const myMobs = mobilizadores.filter(
        (m) => m.supervisorId === sup.id || m.coordId === sup.coordId
      );

      const hasSubmitted = supsFichasOnDate.length > 0;

      return {
        supervisor: sup,
        fichasCount: supsFichasOnDate.length,
        hasSubmitted,
        lastFichaDate: lastFicha ? lastFicha.data : 'Nenhum lançamento',
        mobilizadoresCount: myMobs.length,
      };
    });
  }, [supervisores, fichas, mobilizadores, selectedDate]);

  const delayedSupervisors = useMemo(() => {
    return supervisorStats.filter((st) => !st.hasSubmitted);
  }, [supervisorStats]);

  const submittedSupervisors = useMemo(() => {
    return supervisorStats.filter((st) => st.hasSubmitted);
  }, [supervisorStats]);

  // Handle sending alert notification to supervisor
  const handleSendAlert = async (sup: User) => {
    const alertKey = `${sup.id}_${selectedDate}`;
    const newAlerts = { ...sentAlerts, [alertKey]: true };
    setSentAlerts(newAlerts);
    await api.saveAdminAlerts(newAlerts);

    const newMsg = {
      id: Date.now(),
      supervisorId: sup.id,
      supervisorNome: sup.nome,
      dataAtraso: selectedDate,
      mensagem: customMsg.trim() || `AVISO DE ATRASO: Por favor efetue o lançamento dos dados/fichas referentes ao dia ${selectedDate} para a sua coordenação.`,
      enviadoEm: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    };

    await api.addAdminMessage(newMsg);
    setAdminMessages((prev) => [newMsg, ...prev]);

    showToast(`Aviso de atraso enviado com sucesso para ${sup.nome}!`, 'success');
    setSelectedSupForMsg(null);
    setCustomMsg('');
  };

  // Handle send alert to all delayed supervisors
  const handleSendAlertToAll = async () => {
    if (delayedSupervisors.length === 0) {
      showToast('Não existem supervisores em atraso na data seleccionada.', 'info');
      return;
    }

    const newAlerts = { ...sentAlerts };

    for (const { supervisor: sup } of delayedSupervisors) {
      const alertKey = `${sup.id}_${selectedDate}`;
      newAlerts[alertKey] = true;

      const newMsg = {
        id: Date.now() + Math.random(),
        supervisorId: sup.id,
        supervisorNome: sup.nome,
        dataAtraso: selectedDate,
        mensagem: `AVISO URGENTE DE ATRASO: O lançamento das fichas para o dia ${selectedDate} encontra-se em falta na sua coordenação. Por favor registe os dados.`,
        enviadoEm: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      };

      await api.addAdminMessage(newMsg);
      setAdminMessages((prev) => [newMsg, ...prev]);
    }

    setSentAlerts(newAlerts);
    await api.saveAdminAlerts(newAlerts);

    showToast(`Notificação colectiva de atraso enviada para ${delayedSupervisors.length} supervisor(es)!`, 'success');
  };

  // Fetch admin messages for current supervisor
  const myAdminMessages = useMemo(() => {
    return adminMessages.filter(
      (m: any) => m.supervisorId === user.id || m.supervisorId === String(user.id) || !m.supervisorId
    );
  }, [adminMessages, user.id]);

  // Check if current user (supervisor) is delayed today
  const myStat = supervisorStats.find((st) => st.supervisor.id === user.id || st.supervisor.email === user.email);
  const myIsDelayed = myStat ? !myStat.hasSubmitted : true;

  // Render for SUPERVISOR (Non-admin)
  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-100">
                Centro de Notificação do Supervisor
              </div>
              <h1 className="text-2xl font-black">Alertas de Lançamento & Mensagens da Administração</h1>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {myIsDelayed ? (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 shadow-md space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-xl shadow-sm">
                ⚠️
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
                  <Clock className="h-3.5 w-3.5" />
                  <span>EM ATRASO — {selectedDate}</span>
                </span>
                <h2 className="text-lg font-black text-amber-950">
                  Aviso de Atraso no Registo de Fichas
                </h2>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  A sua coordenação (<strong>{user.coordNome || 'Geral'}</strong>) ainda não registou fichas de mobilização social para o dia de hoje (<strong>{selectedDate}</strong>).
                </p>
              </div>
            </div>

            {/* Admin Message if exists */}
            {myAdminMessages.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                    <span>Mensagem Directa do Administrador</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {myAdminMessages[0].enviadoEm}
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-semibold bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">
                  "{myAdminMessages[0].mensagem}"
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onNewFicha}
                className="flex items-center gap-2 rounded-xl bg-[#2E7D32] px-6 py-3 text-sm font-black text-white shadow-md hover:bg-[#256729] active:scale-95 transition"
                id="btn-supervisor-lancar-ficha-atraso"
              >
                <span>Lançar Ficha Agora</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-emerald-950">
                  Lançamento em Dia!
                </h2>
                <p className="text-xs text-emerald-800 font-medium">
                  A sua coordenação já registou os dados para a data de hoje. Não existem pendências de atraso.
                </p>
              </div>
            </div>
            <button
              onClick={onNewFicha}
              className="flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-[#094b8a] shrink-0"
            >
              <span>+ Nova Ficha</span>
            </button>
          </div>
        )}

        {/* Historico de Notificacoes */}
        {myAdminMessages.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-[#0B5CAD] uppercase tracking-wider flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <span>Histórico de Mensagens da Administração</span>
            </h3>
            <div className="space-y-2 divide-y divide-slate-100">
              {myAdminMessages.map((msg: any) => (
                <div key={msg.id} className="pt-2 text-xs text-slate-700 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Aviso para {msg.dataAtraso}</span>
                    <span>{msg.enviadoEm}</span>
                  </div>
                  <p className="font-medium text-slate-800">{msg.mensagem}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render for ADMINISTRATOR (Full control panel)
  return (
    <div className="space-y-3.5">
      {/* Header Banner */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-500 text-white p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5 text-white" />
              <span>Controlo de Lançamentos & Atrasos Diários</span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-white">
              Monitorização de Lançamento de Fichas pelos Supervisores
            </h1>
            <p className="text-xs text-amber-100 max-w-2xl font-medium">
              Identifique em tempo real quais as coordenações e supervisores que ainda não submeteram os dados de mobilização para o dia seleccionado e envie avisos directos.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-md">
            <Calendar className="h-4 w-4 text-white" />
            <div>
              <label className="block text-[10px] font-bold text-white/80 uppercase">Data em Análise</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black text-white outline-none cursor-pointer"
                id="input-date-atrasos"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Supervisores Registados</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-2xl font-black text-slate-800">{supervisores.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Com coordenação de campo atribuída</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">Lançamentos em Dia (🟢)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{submittedSupervisors.length}</div>
          <p className="text-[10px] text-emerald-600 mt-0.5">Submeteram fichas em {selectedDate}</p>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase">Em Atraso de Lançamento (🔴)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1 text-2xl font-black text-amber-800">{delayedSupervisors.length}</div>
          <p className="text-[10px] text-amber-700 mt-0.5">Sem dados submetidos em {selectedDate}</p>
        </div>
      </div>

      {/* Main Action Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2.5">
          <div>
            <h3 className="text-xs font-black text-[#0B5CAD] flex items-center gap-1.5">
              <span>Estado dos Lançamentos por Supervisor ({selectedDate})</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {delayedSupervisors.length > 0
                ? `${delayedSupervisors.length} supervisor(es) com lançamento pendente de dados no dia ${selectedDate}`
                : 'Todos os supervisores efetuaram os lançamentos do dia com sucesso!'}
            </p>
          </div>

          {isAdmin && delayedSupervisors.length > 0 && (
            <button
              onClick={handleSendAlertToAll}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-amber-700 active:scale-95"
              id="btn-alert-all-supervisors"
            >
              <Bell className="h-3.5 w-3.5 animate-bounce" />
              <span>Avisar Todos os Supervisores em Atraso ({delayedSupervisors.length})</span>
            </button>
          )}
        </div>

        {/* Supervisors Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white text-[10px] font-bold text-[#0B5CAD] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2 sm:p-2.5 w-8 text-center">#</th>
                <th className="p-2 sm:p-2.5">Supervisor</th>
                <th className="p-2 sm:p-2.5">Coordenação Territorial</th>
                <th className="p-2 sm:p-2.5 text-center">Mobilizadores RH-MC</th>
                <th className="p-2 sm:p-2.5 text-center">Fichas Submetidas ({selectedDate})</th>
                <th className="p-2 sm:p-2.5">Estado do Lançamento</th>
                <th className="p-2 sm:p-2.5">Último Lançamento</th>
                {isAdmin && <th className="p-2 sm:p-2.5 text-right">Ação do Administrador</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {supervisorStats.map((st, index) => {
                const sup = st.supervisor;
                const alertKey = `${sup.id}_${selectedDate}`;
                const isAlerted = !!sentAlerts[alertKey];

                return (
                  <tr
                    key={sup.id}
                    className={`transition ${
                      !st.hasSubmitted ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3 text-center font-mono font-bold text-slate-400">
                      {index + 1}
                    </td>

                    <td className="p-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border ${
                            st.hasSubmitted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {sup.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-slate-800 font-black">{sup.nome}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{sup.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-semibold text-slate-700">
                      {sup.coordNome || 'Sem Coordenação'}
                    </td>

                    <td className="p-3 text-center font-bold font-mono text-slate-700">
                      {st.mobilizadoresCount}
                    </td>

                    <td className="p-3 text-center font-bold font-mono text-slate-800">
                      {st.fichasCount}
                    </td>

                    <td className="p-3">
                      {st.hasSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Em Dia (Lançado)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-300 animate-pulse">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>EM ATRASO (Pendente)</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-mono text-xs text-slate-500">
                      {st.lastFichaDate}
                    </td>

                    {isAdmin && (
                      <td className="p-3 text-right">
                        {!st.hasSubmitted ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {isAlerted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                                <Check className="h-3.5 w-3.5 text-amber-600" />
                                <span>Aviso Enviado</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedSupForMsg(sup)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition"
                                title="Enviar Notificação de Atraso"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Avisar Supervisor</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-semibold">Sem pendências</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {supervisorStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Nenhum supervisor encontrado no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Custom Message */}
      {selectedSupForMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-amber-700 font-black text-sm">
                <Bell className="h-5 w-5" />
                <span>Enviar Aviso de Atraso ao Supervisor</span>
              </div>
              <button
                onClick={() => setSelectedSupForMsg(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 font-medium">
                Destinatário: <strong className="text-slate-900">{selectedSupForMsg.nome}</strong> ({selectedSupForMsg.coordNome || 'Geral'})
              </p>
              <p className="text-slate-600 font-medium">
                Data do Atraso: <strong className="text-amber-700">{selectedDate}</strong>
              </p>

              <div className="pt-2">
                <label className="block text-[11px] font-bold text-[#0B5CAD] uppercase mb-1">
                  Mensagem Personalizada do Administrador (Opcional)
                </label>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder={`Ex: Por favor efetue o lançamento dos dados referentes a ${selectedDate} até às 18h.`}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs outline-none focus:border-[#0B5CAD] h-24"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedSupForMsg(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSendAlert(selectedSupForMsg)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-amber-700"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Enviar Notificação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
