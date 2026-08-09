import React, { useEffect, useMemo, useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  Trash2,
  Eye,
  Info,
  ShieldCheck,
  Send,
  Building2,
  X,
  FileText,
  Check,
  Calendar,
  Camera,
  Printer,
  Users,
  Award,
} from 'lucide-react';

import { User, Coordination, ODKSubmission } from '../types';
import { Tooltip as ActionTooltip } from './Tooltip';

interface ODKCollectViewProps {
  user: User;
  coordenacoes: Coordination[];
  users: User[];
  submissions: ODKSubmission[];

  onCreateSubmission: (
    sub: Partial<ODKSubmission>
  ) => Promise<void>;

  onUpdateStatus: (
    id: string,
    status: 'confirmado' | 'divergencia' | 'pendente',
    adminNotes?: string
  ) => Promise<void>;

  onDeleteSubmission: (id: string) => Promise<void>;
}

export const ODKCollectView: React.FC<ODKCollectViewProps> = ({
  user,
  coordenacoes,
  users,
  submissions,
  onCreateSubmission,
  onUpdateStatus,
  onDeleteSubmission,
}) => {
  const isAdmin = user.tipo === 'admin';

  // ============================================================
  // TABS
  // ============================================================

  const [activeMainTab, setActiveMainTab] = useState<
    'list' | 'supervisores' | 'campanha4dias'
  >('list');

  useEffect(() => {
    if (!isAdmin && activeMainTab === 'supervisores') {
      setActiveMainTab('list');
    }
  }, [isAdmin, activeMainTab]);

  // ============================================================
  // MODAIS
  // ============================================================

  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [show4DaysReceiptModal, setShow4DaysReceiptModal] =
    useState(false);

  const [selectedSub, setSelectedSub] =
    useState<ODKSubmission | null>(null);

  // ============================================================
  // CONTROLO LOCAL DOS REGISTOS ELIMINADOS
  // ============================================================

  /*
   * Isto resolve um problema comum:
   *
   * onDeleteSubmission() pode apagar no backend,
   * mas o componente pai pode demorar a atualizar "submissions".
   *
   * Guardamos temporariamente os IDs eliminados para que
   * desapareçam imediatamente da interface.
   */
  const [deletedSubmissionIds, setDeletedSubmissionIds] =
    useState<Set<string>>(new Set());

  // ============================================================
  // FILTROS
  // ============================================================

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<
    'todos' | 'pendente' | 'confirmado' | 'divergencia'
  >('todos');

  const [coordFilter, setCoordFilter] = useState('todas');

  const [supervisorFilter, setSupervisorFilter] =
    useState('todos');

  // ============================================================
  // FORMULÁRIO
  // ============================================================

  const [formNome, setFormNome] = useState(
    'Ficha de Supervisão da Mobilização'
  );

  const [customFormNome, setCustomFormNome] = useState('');

  const [dataEnvio, setDataEnvio] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [horaEnvio, setHoraEnvio] = useState(
    new Date().toTimeString().slice(0, 5)
  );

  const [totalFormularios, setTotalFormularios] =
    useState(25);

  const [dispositivoAndroid, setDispositivoAndroid] =
    useState(
      'Samsung Galaxy Tab A7 (Android 11, 4GB RAM)'
    );

  const [codigoRecibo, setCodigoRecibo] = useState(
    `ODK-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}-X`
  );

  const userAssignedCoord =
    coordenacoes.find((c) => c.id === user.coordId) ||
    coordenacoes[0];

  const [coordId, setCoordId] = useState<number | null>(
    user.coordId || userAssignedCoord?.id || null
  );

  const [observacoes, setObservacoes] = useState('');

  const [imagemComprovativo, setImagemComprovativo] =
    useState<string | undefined>(undefined);

  const [uploadedProof, setUploadedProof] =
    useState<string | undefined>(undefined);

  const [numCampaignDays, setNumCampaignDays] =
    useState(7);

  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [adminNoteInput, setAdminNoteInput] =
    useState('');

  // ============================================================
  // OPÇÕES ODK
  // ============================================================

  const ODK_FORM_OPTIONS = [
    'Ficha de Supervisão da Mobilização',
    'Registo de Agregados Familiares (ODK Collect)',
    'Inquérito de Mapeamento & Vacinação Polio',
    'Cadastramento de Casas e Famílias em Campo',
    'Ficha Epidemiológica e Vigilância Comunitária',
    'Outro Formulário Personalizado...',
  ];

  // ============================================================
  // UPLOAD DE IMAGEM
  // ============================================================

  const handleImageUpload = (
    file: File,
    callback: (base64: string) => void
  ) => {
    if (file.size > 8 * 1024 * 1024) {
      alert(
        'O ficheiro de imagem excede o tamanho máximo permitido de 8MB.'
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };

    reader.onerror = () => {
      alert('Não foi possível ler a imagem selecionada.');
    };

    reader.readAsDataURL(file);
  };

  // ============================================================
  // GERAR RECIBO
  // ============================================================

  const handleGenerateReceiptCode = () => {
    const randomCode = `ODK-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}-${String.fromCharCode(
      65 + Math.floor(Math.random() * 26)
    )}`;

    setCodigoRecibo(randomCode);
  };

  // ============================================================
  // ABRIR NOVO REGISTO
  // ============================================================

  const handleOpenNewSubmissionModal = () => {
    if (!isAdmin && user.coordId) {
      setCoordId(user.coordId);
    } else if (!coordId && coordenacoes.length > 0) {
      setCoordId(coordenacoes[0].id);
    }

    setFormNome(
      'Ficha de Supervisão da Mobilização'
    );

    setCustomFormNome('');

    setDataEnvio(
      new Date().toISOString().split('T')[0]
    );

    setHoraEnvio(
      new Date().toTimeString().slice(0, 5)
    );

    setTotalFormularios(25);

    setObservacoes('');

    setImagemComprovativo(undefined);

    handleGenerateReceiptCode();

    setShowModal(true);
  };

  // ============================================================
  // SUBMETER NOVO REGISTO
  // ============================================================

  const handleFormSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      const effectiveCoordId =
        !isAdmin && user.coordId
          ? user.coordId
          : Number(coordId);

      const selectedCoord = coordenacoes.find(
        (c) => c.id === effectiveCoordId
      );

      const finalCoordNome = selectedCoord
        ? selectedCoord.nome
        : user.coordNome || 'Sem Coordenação';

      const finalFormNome =
        formNome ===
        'Outro Formulário Personalizado...'
          ? customFormNome.trim() ||
            'Formulário Personalizado ODK'
          : formNome;

      await onCreateSubmission({
        formId: finalFormNome
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_'),

        formNome: finalFormNome,

        dataEnvio,

        horaEnvio,

        totalFormularios:
          Number(totalFormularios) || 0,

        dispositivoAndroid,

        codigoReciboODK: codigoRecibo,

        coordId: effectiveCoordId,

        coordNome: finalCoordNome,

        observacoes,

        imagemComprovativo,
      });

      setShowModal(false);

      setTotalFormularios(25);

      setObservacoes('');

      setImagemComprovativo(undefined);

      setCustomFormNome('');

      handleGenerateReceiptCode();

      alert(
        'Envio ODK registado com sucesso.'
      );
    } catch (err) {
      console.error(
        'Erro ao registar confirmação ODK:',
        err
      );

      alert(
        'Erro ao registar confirmação ODK: ' +
          (err instanceof Error
            ? err.message
            : String(err))
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // ATUALIZAR STATUS
  // ============================================================

  const handleUpdateStatusAction = async (
    id: string,
    status:
      | 'confirmado'
      | 'divergencia'
      | 'pendente'
  ) => {
    try {
      await onUpdateStatus(
        id,
        status,
        adminNoteInput
      );

      setSelectedSub(null);

      setAdminNoteInput('');
    } catch (err) {
      console.error(
        'Erro ao atualizar status:',
        err
      );

      alert(
        'Erro ao atualizar status: ' +
          (err instanceof Error
            ? err.message
            : String(err))
      );
    }
  };

  // ============================================================
  // DELETE CORRIGIDO
  // ============================================================

  const handleDeleteSubmissionAction = async (
    id: string,
    codigoReciboODK: string
  ) => {
    if (!id) {
      alert(
        'Erro: o registo não possui um ID válido.'
      );
      return;
    }

    if (deletingId) {
      return;
    }

    const confirmar = window.confirm(
      `Tem a certeza que deseja eliminar este registo ODK?\n\n` +
        `Recibo: ${codigoReciboODK}\n\n` +
        `Esta operação não pode ser desfeita.`
    );

    if (!confirmar) {
      return;
    }

    setDeletingId(id);

    try {
      console.log(
        '[ODK] A eliminar submissão:',
        id
      );

      /*
       * PRIMEIRO:
       * chama a função do componente pai.
       *
       * Esta função deve eliminar da base de dados.
       */
      await onDeleteSubmission(id);

      /*
       * SEGUNDO:
       * remove imediatamente da interface local.
       */
      setDeletedSubmissionIds(
        (previous) => {
          const next = new Set(previous);
          next.add(String(id));
          return next;
        }
      );

      /*
       * TERCEIRO:
       * fecha o modal se estava aberto.
       */
      setSelectedSub((current) => {
        if (
          current &&
          String(current.id) === String(id)
        ) {
          return null;
        }

        return current;
      });

      setAdminNoteInput('');

      console.log(
        '[ODK] Submissão eliminada com sucesso:',
        id
      );
    } catch (err) {
      console.error(
        '[ODK] Erro ao eliminar submissão:',
        err
      );

      alert(
        'Não foi possível eliminar o registo ODK.\n\n' +
          (err instanceof Error
            ? err.message
            : String(err))
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // LISTA DE SUBMISSÕES
  // ============================================================

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      /*
       * Não mostrar localmente os registos eliminados.
       */
      if (
        deletedSubmissionIds.has(
          String(sub.id)
        )
      ) {
        return false;
      }

      /*
       * Supervisores:
       * só podem visualizar os seus próprios
       * registos ou os da sua coordenação.
       */
      if (!isAdmin) {
        if (
          sub.supervisorId !== user.id
        ) {
          if (
            user.coordId &&
            sub.coordId !== user.coordId
          ) {
            return false;
          }
        }
      }

      if (
        statusFilter !== 'todos' &&
        sub.status !== statusFilter
      ) {
        return false;
      }

      if (
        coordFilter !== 'todas' &&
        String(sub.coordId) !== coordFilter
      ) {
        return false;
      }

      if (
        supervisorFilter !== 'todos' &&
        String(sub.supervisorId) !==
          supervisorFilter
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const term =
          searchTerm.toLowerCase();

        const matchRecibo =
          String(
            sub.codigoReciboODK || ''
          )
            .toLowerCase()
            .includes(term);

        const matchSupervisor =
          String(
            sub.supervisorNome || ''
          )
            .toLowerCase()
            .includes(term);

        const matchForm =
          String(
            sub.formNome || ''
          )
            .toLowerCase()
            .includes(term);

        const matchCoord =
          String(
            sub.coordNome || ''
          )
            .toLowerCase()
            .includes(term);

        if (
          !matchRecibo &&
          !matchSupervisor &&
          !matchForm &&
          !matchCoord
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    submissions,
    deletedSubmissionIds,
    isAdmin,
    user,
    statusFilter,
    coordFilter,
    supervisorFilter,
    searchTerm,
  ]);

  // ============================================================
  // KPIs
  // ============================================================

  const totalSubmissionsCount =
    filteredSubmissions.length;

  const totalFormsCount =
    filteredSubmissions.reduce(
      (acc, curr) =>
        acc +
        (Number(
          curr.totalFormularios
        ) || 0),
      0
    );

  const confirmedCount =
    filteredSubmissions.filter(
      (s) => s.status === 'confirmado'
    ).length;

  const pendingCount =
    filteredSubmissions.filter(
      (s) => s.status === 'pendente'
    ).length;

  const divergenciaCount =
    filteredSubmissions.filter(
      (s) => s.status === 'divergencia'
    ).length;

  const confirmationRate =
    totalSubmissionsCount > 0
      ? Math.round(
          (confirmedCount /
            totalSubmissionsCount) *
            100
        )
      : 0;

  // ============================================================
  // EXPORTAR CSV
  // ============================================================

  const handleExportCSV = () => {
    const headers = [
      'Recibo ODK',
      'Supervisor',
      'Coordenação',
      'Formulário',
      'Data Envio',
      'Hora Envio',
      'Formulários Lançados',
      'Dispositivo Android',
      'Status',
      'Confirmado por Admin',
    ];

    const escapeCSV = (
      value: unknown
    ) => {
      const text =
        value === null ||
        value === undefined
          ? ''
          : String(value);

      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    };

    const rows =
      filteredSubmissions.map((s) => [
        escapeCSV(
          s.codigoReciboODK
        ),
        escapeCSV(
          s.supervisorNome
        ),
        escapeCSV(s.coordNome),
        escapeCSV(s.formNome),
        escapeCSV(s.dataEnvio),
        escapeCSV(s.horaEnvio),
        escapeCSV(
          s.totalFormularios
        ),
        escapeCSV(
          s.dispositivoAndroid
        ),
        escapeCSV(
          String(
            s.status
          ).toUpperCase()
        ),
        escapeCSV(
          s.confirmadoPorAdmin
            ? 'Sim'
            : 'Não'
        ),
      ]);

    const csvContent =
      '\uFEFF' +
      [
        headers
          .map(escapeCSV)
          .join(';'),
        ...rows.map((row) =>
          row.join(';')
        ),
      ].join('\n');

    const blob = new Blob(
      [csvContent],
      {
        type:
          'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `Confirmacoes_ODK_Collect_${new Date()
        .toISOString()
        .split('T')[0]}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ============================================================
  // SUPERVISORES
  // ============================================================

  const supervisoresList =
    users.filter(
      (u) =>
        u.tipo === 'supervisor' ||
        u.tipo === 'user' ||
        u.tipo === 'admin'
    );

  const supervisorStats =
    supervisoresList.map((sup) => {
      const supSubs =
        submissions.filter(
          (s) =>
            String(
              s.supervisorId
            ) === String(sup.id) ||
            s.supervisorNome ===
              sup.nome
        );

      const totalSubs =
        supSubs.length;

      const totalForms =
        supSubs.reduce(
          (acc, curr) =>
            acc +
            (Number(
              curr.totalFormularios
            ) || 0),
          0
        );

      const confirmados =
        supSubs.filter(
          (s) =>
            s.status ===
            'confirmado'
        ).length;

      const pendentes =
        supSubs.filter(
          (s) =>
            s.status ===
            'pendente'
        ).length;

      const ultimosEnvio =
        supSubs.length > 0
          ? supSubs[
              supSubs.length - 1
            ].dataEnvio
          : '—';

      const recibos =
        supSubs.map(
          (s) =>
            s.codigoReciboODK
        );

      return {
        supervisor: sup,
        totalSubs,
        totalForms,
        confirmados,
        pendentes,
        ultimosEnvio,
        recibos,
        coordNome:
          sup.coordNome ||
          'Coordenação não atribuída',
      };
    });

  // ============================================================
  // CAMPANHA
  // ============================================================

  const allDates = Array.from(
    new Set(
      submissions
        .filter(
          (s) =>
            !deletedSubmissionIds.has(
              String(s.id)
            )
        )
        .map(
          (s) => s.dataEnvio
        )
        .filter(Boolean)
    )
  ).sort();

  const totalDaysCount = Math.max(
    numCampaignDays,
    allDates.length
  );

  const campaignDays =
    Array.from({
      length: totalDaysCount,
    }).map((_, index) => {
      const dayLabel =
        `Dia ${
          index + 1
        } de Campanha`;

      const date =
        allDates[index] ||
        `Dia ${index + 1}`;

      const daySubs =
        submissions.filter(
          (s) => {
            if (
              deletedSubmissionIds.has(
                String(s.id)
              )
            ) {
              return false;
            }

            return (
              s.dataEnvio ===
              date
            );
          }
        );

      const totalFormsDay =
        daySubs.reduce(
          (acc, curr) =>
            acc +
            (Number(
              curr.totalFormularios
            ) || 0),
          0
        );

      const confirmadosDay =
        daySubs.filter(
          (s) =>
            s.status ===
            'confirmado'
        ).length;

      return {
        dayIndex: index + 1,
        dayLabel,
        date,
        submissions: daySubs,
        totalFormsDay,
        confirmadosDay,
      };
    });

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
                <Smartphone className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  ODK Collect Integration
                </h1>

                <p className="text-xs font-bold text-emerald-600">
                  Confirmação de Envios de Campo
                </p>
              </div>
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Confirmação & Controlo de Envios ODK
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Acompanhamento e validação administrativa
              das Fichas de Supervisão da Mobilização e
              relatórios de envio executados pelos
              supervisores no aplicativo Android ODK Collect.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                setShowInfoModal(true)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
            >
              <Info className="h-4 w-4 text-emerald-600" />
              Guia do ODK
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Exportar Excel
            </button>

            <button
              onClick={
                handleOpenNewSubmissionModal
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-extrabold shadow-sm transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Registar Envio ODK
            </button>
          </div>
        </div>

        {/* ==================================================
            ALERTA ADMIN
        ================================================== */}

        {isAdmin &&
          pendingCount > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-3.5 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <div className="text-xs font-black uppercase">
                    Atenção Administrador:
                    Validações ODK Pendentes (
                    {pendingCount})
                  </div>

                  <div className="text-[11px] text-amber-800 dark:text-amber-300">
                    Existem {pendingCount}{' '}
                    submissões aguardando validação.
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setStatusFilter('pendente')
                }
                className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white"
              >
                Validar Agora
              </button>
            </div>
          )}

        {/* ==================================================
            KPIs
        ================================================== */}

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Submissões ODK
            </span>

            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {totalSubmissionsCount}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Registos de confirmação
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Formulários ODK
            </span>

            <div className="mt-2 text-2xl font-black text-emerald-600">
              {totalFormsCount.toLocaleString(
                'pt-PT'
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Fichas submetidas
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Confirmados Admin
            </span>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {confirmedCount}
              </span>

              <span className="text-xs font-bold text-emerald-600">
                ({confirmationRate}%)
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Validados
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Pendentes / Alertas
            </span>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">
                {pendingCount}
              </span>

              {divergenciaCount > 0 && (
                <span className="text-xs font-bold text-rose-600">
                  ({divergenciaCount} div.)
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Aguardam verificação
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setActiveMainTab('list')
            }
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeMainTab === 'list'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            Lista ({filteredSubmissions.length})
          </button>

          {isAdmin && (
            <button
              onClick={() =>
                setActiveMainTab(
                  'supervisores'
                )
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                activeMainTab ===
                'supervisores'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              Supervisores (
              {supervisoresList.length})
            </button>
          )}

          <button
            onClick={() =>
              setActiveMainTab(
                'campanha4dias'
              )
            }
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeMainTab ===
              'campanha4dias'
                ? 'bg-purple-700 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Relatório dos dias
          </button>
        </div>

        {activeMainTab ===
          'campanha4dias' && (
          <button
            onClick={() =>
              setShow4DaysReceiptModal(
                true
              )
            }
            className="flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 px-4 py-2 text-xs font-black text-white"
          >
            <Camera className="h-4 w-4" />
            Gerar Comprovativo
          </button>
        )}
      </div>

      {/* ======================================================
          LISTA
      ====================================================== */}

      {activeMainTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Pesquisar recibo, supervisor, coordenação ou formulário..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | 'todos'
                    | 'pendente'
                    | 'confirmado'
                    | 'divergencia'
                )
              }
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold"
            >
              <option value="todos">
                Todos os Estados
              </option>

              <option value="pendente">
                Pendentes
              </option>

              <option value="confirmado">
                Confirmados
              </option>

              <option value="divergencia">
                Divergências
              </option>
            </select>

            {isAdmin && (
              <>
                <select
                  value={coordFilter}
                  onChange={(e) =>
                    setCoordFilter(
                      e.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold"
                >
                  <option value="todas">
                    Todas Coordenações
                  </option>

                  {coordenacoes.map(
                    (c) => (
                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {c.nome}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    supervisorFilter
                  }
                  onChange={(e) =>
                    setSupervisorFilter(
                      e.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold"
                >
                  <option value="todos">
                    Todos Supervisores
                  </option>

                  {supervisoresList.map(
                    (sup) => (
                      <option
                        key={sup.id}
                        value={sup.id}
                      >
                        {sup.nome}
                      </option>
                    )
                  )}
                </select>
              </>
            )}
          </div>

          {/* ==================================================
              TABELA
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {filteredSubmissions.length ===
            0 ? (
              <div className="p-12 text-center">
                <Smartphone className="mx-auto h-12 w-12 text-slate-300 mb-3" />

                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nenhuma confirmação ODK encontrada
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Registe um novo envio ou
                  ajuste os filtros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-[10px] font-extrabold uppercase text-slate-500">
                    <tr>
                      <th className="p-3">
                        Recibo ODK
                      </th>

                      <th className="p-3">
                        Data/Hora
                      </th>

                      <th className="p-3">
                        Supervisor
                      </th>

                      <th className="p-3">
                        Coordenação
                      </th>

                      <th className="p-3">
                        Formulário
                      </th>

                      <th className="p-3 text-center">
                        Formulários
                      </th>

                      <th className="p-3">
                        Status
                      </th>

                      <th className="p-3 text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.map(
                      (sub) => {
                        const isConf =
                          sub.status ===
                          'confirmado';

                        const isDiv =
                          sub.status ===
                          'divergencia';

                        const isDeleting =
                          deletingId ===
                          String(sub.id);

                        return (
                          <tr
                            key={sub.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="p-3 font-mono font-bold text-emerald-600">
                              <div className="flex items-center gap-2">
                                {sub.codigoReciboODK}

                                {sub.imagemComprovativo && (
                                  <Camera className="h-3.5 w-3.5 text-purple-600" />
                                )}
                              </div>
                            </td>

                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                              {sub.dataEnvio}{' '}
                              <span className="text-[10px]">
                                ({sub.horaEnvio})
                              </span>
                            </td>

                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {sub.supervisorNome}
                            </td>

                            <td className="p-3">
                              <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                {sub.coordNome}
                              </span>
                            </td>

                            <td className="p-3 font-medium">
                              {sub.formNome}
                            </td>

                            <td className="p-3 text-center font-black text-emerald-700 dark:text-emerald-300 text-sm">
                              {sub.totalFormularios}
                            </td>

                            <td className="p-3">
                              {isConf ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Confirmado
                                </span>
                              ) : isDiv ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950 px-2.5 py-1 text-[10px] font-extrabold text-rose-800 dark:text-rose-300">
                                  <AlertTriangle className="h-3 w-3" />
                                  Divergência
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                                  <Clock className="h-3 w-3" />
                                  Pendente
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() =>
                                    setSelectedSub(
                                      sub
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Ver detalhes"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {isAdmin &&
                                  !isConf && (
                                    <button
                                      onClick={() =>
                                        handleUpdateStatusAction(
                                          String(
                                            sub.id
                                          ),
                                          'confirmado'
                                        )
                                      }
                                      disabled={
                                        isDeleting
                                      }
                                      className="rounded-lg border border-emerald-200 p-1.5 text-emerald-600 hover:bg-emerald-50"
                                      title="Confirmar"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                {/* =================================================
                                    BOTÃO DELETE
                                ================================================== */}

                                <button
                                  onClick={() =>
                                    handleDeleteSubmissionAction(
                                      String(
                                        sub.id
                                      ),
                                      sub.codigoReciboODK
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className={`rounded-lg border border-rose-200 dark:border-rose-900 p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition ${
                                    isDeleting
                                      ? 'opacity-50 cursor-not-allowed'
                                      : ''
                                  }`}
                                  title={
                                    isDeleting
                                      ? 'A eliminar...'
                                      : 'Eliminar registo'
                                  }
                                >
                                  {isDeleting ? (
                                    <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          SUPERVISORES
      ====================================================== */}

      {activeMainTab ===
        'supervisores' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Desempenho por Supervisor
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Resumo das submissões e formulários
              ODK enviados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supervisorStats.map(
              (st) => (
                <div
                  key={st.supervisor.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-black">
                      {st.supervisor.nome
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {st.supervisor.nome}
                      </h3>

                      <p className="text-[11px] font-bold text-emerald-600">
                        {st.coordNome}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                      <span className="text-[10px] font-bold text-slate-500">
                        SUBMISSÕES
                      </span>

                      <div className="text-lg font-black">
                        {st.totalSubs}
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-3">
                      <span className="text-[10px] font-bold text-emerald-700">
                        FORMULÁRIOS
                      </span>

                      <div className="text-lg font-black text-emerald-700">
                        {st.totalForms}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span>
                      Validadas:{' '}
                      <strong className="text-emerald-600">
                        {st.confirmados}
                      </strong>
                    </span>

                    <span>
                      Pendentes:{' '}
                      <strong className="text-amber-600">
                        {st.pendentes}
                      </strong>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSearchTerm(
                        st.supervisor
                          .nome
                      );

                      setActiveMainTab(
                        'list'
                      );
                    }}
                    className="w-full rounded-xl bg-emerald-50 dark:bg-emerald-950 py-2 text-xs font-bold text-emerald-700"
                  >
                    Ver Envios
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          CAMPANHA
      ====================================================== */}

      {activeMainTab ===
        'campanha4dias' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950 px-3 py-1 text-xs font-bold text-purple-800 dark:text-purple-300">
                    <Award className="h-3.5 w-3.5" />
                    {campaignDays.length}{' '}
                    Dias de Trabalho
                  </span>

                  <select
                    value={
                      numCampaignDays
                    }
                    onChange={(e) =>
                      setNumCampaignDays(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold"
                  >
                    <option value={4}>
                      4 Dias
                    </option>

                    <option value={5}>
                      5 Dias
                    </option>

                    <option value={6}>
                      6 Dias
                    </option>

                    <option value={7}>
                      7 Dias
                    </option>

                    <option value={10}>
                      10 Dias
                    </option>

                    <option value={14}>
                      14 Dias
                    </option>
                  </select>
                </div>

                <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">
                  Consolidado Diário ODK Collect
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Visualização dos dias da campanha
                  e submissões realizadas.
                </p>
              </div>

              <ActionTooltip content="Gerar comprovativo dos dias trabalhados">
                <button
                  onClick={() =>
                    setShow4DaysReceiptModal(
                      true
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 text-xs font-black"
                >
                  <Camera className="h-4 w-4" />
                  Capturar Comprovativo
                </button>
              </ActionTooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaignDays.map(
              (day) => (
                <div
                  key={day.dayIndex}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-black">
                        D{day.dayIndex}
                      </div>

                      <div>
                        <h3 className="text-sm font-black">
                          {day.dayLabel}
                        </h3>

                        <p className="text-[11px] font-mono text-slate-500">
                          {day.date}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-purple-700">
                        {day.totalFormsDay}
                      </div>

                      <div className="text-[10px] text-emerald-600 font-bold">
                        {day.confirmadosDay}{' '}
                        validados
                      </div>
                    </div>
                  </div>

                  {day.submissions.length ===
                  0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">
                      Nenhum formulário
                      registado neste dia.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {day.submissions.map(
                        (sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 p-3"
                          >
                            <div>
                              <div className="font-bold text-xs">
                                {
                                  sub.supervisorNome
                                }
                              </div>

                              <div className="text-[10px] font-mono text-slate-500">
                                {
                                  sub.codigoReciboODK
                                }{' '}
                                •{' '}
                                {
                                  sub.horaEnvio
                                }
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-black text-emerald-600">
                                {
                                  sub.totalFormularios
                                }
                              </span>

                              <button
                                onClick={() =>
                                  setSelectedSub(
                                    sub
                                  )
                                }
                                className="rounded-lg border p-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteSubmissionAction(
                                    String(
                                      sub.id
                                    ),
                                    sub.codigoReciboODK
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  String(
                                    sub.id
                                  )
                                }
                                className="rounded-lg border border-rose-200 p-1.5 text-rose-600"
                              >
                                {deletingId ===
                                String(
                                  sub.id
                                ) ? (
                                  <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL NOVO ENVIO
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500 p-2.5 text-slate-950">
                  <Smartphone className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-lg font-black">
                    Registar Envio ODK Collect
                  </h3>

                  <p className="text-xs text-slate-300">
                    Registo de envio de campo.
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold mb-1">
                  Nome do Formulário *
                </label>

                <select
                  value={formNome}
                  onChange={(e) =>
                    setFormNome(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-bold text-white"
                  required
                >
                  {ODK_FORM_OPTIONS.map(
                    (opt) => (
                      <option
                        key={opt}
                        value={opt}
                      >
                        {opt}
                      </option>
                    )
                  )}
                </select>

                {formNome ===
                  'Outro Formulário Personalizado...' && (
                  <input
                    type="text"
                    value={
                      customFormNome
                    }
                    onChange={(e) =>
                      setCustomFormNome(
                        e.target.value
                      )
                    }
                    placeholder="Nome do formulário..."
                    className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs text-white"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Data *
                  </label>

                  <input
                    type="date"
                    value={dataEnvio}
                    onChange={(e) =>
                      setDataEnvio(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Hora *
                  </label>

                  <input
                    type="time"
                    value={horaEnvio}
                    onChange={(e) =>
                      setHoraEnvio(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Formulários *
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={
                      totalFormularios
                    }
                    onChange={(e) =>
                      setTotalFormularios(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-sm font-black text-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Coordenação
                  </label>

                  {isAdmin ? (
                    <select
                      value={
                        coordId || ''
                      }
                      onChange={(e) =>
                        setCoordId(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs text-white"
                    >
                      {coordenacoes.map(
                        (c) => (
                          <option
                            key={c.id}
                            value={c.id}
                          >
                            {c.nome}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-slate-800 p-3 text-xs font-bold text-emerald-300">
                      <Building2 className="h-4 w-4" />

                      {user.coordNome ||
                        userAssignedCoord?.nome ||
                        'Coordenação'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold">
                    Código de Recibo *
                  </label>

                  <button
                    type="button"
                    onClick={
                      handleGenerateReceiptCode
                    }
                    className="text-[10px] font-bold text-emerald-400"
                  >
                    Gerar Novo
                  </button>
                </div>

                <input
                  type="text"
                  value={codigoRecibo}
                  onChange={(e) =>
                    setCodigoRecibo(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs font-mono font-bold text-emerald-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Dispositivo Android
                </label>

                <input
                  type="text"
                  value={
                    dispositivoAndroid
                  }
                  onChange={(e) =>
                    setDispositivoAndroid(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Observações
                </label>

                <textarea
                  value={observacoes}
                  onChange={(e) =>
                    setObservacoes(
                      e.target.value
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold mb-2">
                  <Camera className="h-4 w-4 text-emerald-400" />
                  Captura de Ecrã ODK
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (file) {
                      handleImageUpload(
                        file,
                        setImagemComprovativo
                      );
                    }
                  }}
                  className="w-full rounded-xl bg-slate-800 p-2 text-xs"
                />

                {imagemComprovativo && (
                  <div className="relative mt-3 rounded-xl border border-slate-700 bg-slate-950 p-2">
                    <img
                      src={
                        imagemComprovativo
                      }
                      alt="Captura ODK"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setImagemComprovativo(
                          undefined
                        )
                      }
                      className="absolute right-2 top-2 rounded-full bg-rose-600 p-1 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />

                  {submitting
                    ? 'A Submeter...'
                    : 'Confirmar Envio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL DETALHES
      ====================================================== */}

      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Comprovativo ODK
                </span>

                <h3 className="text-lg font-black font-mono">
                  {
                    selectedSub.codigoReciboODK
                  }
                </h3>
              </div>

              <button
                onClick={() =>
                  setSelectedSub(null)
                }
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-800 p-3">
                <div>
                  <span className="text-slate-400">
                    Supervisor
                  </span>

                  <div className="font-black text-sm">
                    {
                      selectedSub.supervisorNome
                    }
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">
                    Coordenação
                  </span>

                  <div className="font-black text-emerald-300">
                    {
                      selectedSub.coordNome
                    }
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800 p-3">
                <span className="text-slate-400">
                  Formulário
                </span>

                <div className="font-bold">
                  {selectedSub.formNome}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-800 p-3">
                <div>
                  <span className="text-slate-400">
                    Data/Hora
                  </span>

                  <div>
                    {
                      selectedSub.dataEnvio
                    }{' '}
                    às{' '}
                    {
                      selectedSub.horaEnvio
                    }
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">
                    Formulários
                  </span>

                  <div className="font-black text-emerald-400">
                    {
                      selectedSub.totalFormularios
                    }
                  </div>
                </div>
              </div>

              {selectedSub.dispositivoAndroid && (
                <div className="rounded-xl bg-slate-800 p-3">
                  <span className="text-slate-400">
                    Dispositivo
                  </span>

                  <div>
                    {
                      selectedSub.dispositivoAndroid
                    }
                  </div>
                </div>
              )}

              {selectedSub.observacoes && (
                <div className="rounded-xl bg-slate-800 p-3">
                  <span className="text-slate-400">
                    Observações
                  </span>

                  <div className="italic">
                    {
                      selectedSub.observacoes
                    }
                  </div>
                </div>
              )}

              {selectedSub.imagemComprovativo && (
                <div className="rounded-xl bg-slate-800 p-3">
                  <div className="mb-2 flex items-center gap-2 font-bold text-emerald-400">
                    <Camera className="h-4 w-4" />
                    Captura de Ecrã
                  </div>

                  <img
                    src={
                      selectedSub.imagemComprovativo
                    }
                    alt="Captura ODK"
                    className="max-h-80 w-full rounded-lg object-contain"
                  />
                </div>
              )}

              {isAdmin && (
                <div className="border-t border-slate-800 pt-4">
                  <label className="block text-xs font-bold text-amber-300 mb-2">
                    Nota Administrativa
                  </label>

                  <input
                    type="text"
                    value={
                      adminNoteInput
                    }
                    onChange={(e) =>
                      setAdminNoteInput(
                        e.target.value
                      )
                    }
                    placeholder="Nota de validação..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white"
                  />

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        handleUpdateStatusAction(
                          String(
                            selectedSub.id
                          ),
                          'confirmado'
                        )
                      }
                      className="rounded-xl bg-emerald-500 p-2.5 text-xs font-black text-slate-950"
                    >
                      Aprovar
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateStatusAction(
                          String(
                            selectedSub.id
                          ),
                          'divergencia'
                        )
                      }
                      className="rounded-xl bg-rose-600 p-2.5 text-xs font-black text-white"
                    >
                      Divergência
                    </button>
                  </div>
                </div>
              )}

              {/* DELETE NO MODAL */}

              <button
                onClick={() =>
                  handleDeleteSubmissionAction(
                    String(
                      selectedSub.id
                    ),
                    selectedSub.codigoReciboODK
                  )
                }
                disabled={
                  deletingId ===
                  String(
                    selectedSub.id
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950 p-3 text-xs font-bold text-rose-300 disabled:opacity-50"
              >
                {deletingId ===
                String(
                  selectedSub.id
                ) ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
                    A eliminar...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar Registo
                  </>
                )}
              </button>

              <button
                onClick={() =>
                  setSelectedSub(null)
                }
                className="w-full rounded-xl bg-slate-800 p-2.5 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL COMPROVATIVO
      ====================================================== */}

      {show4DaysReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border-2 border-purple-500 bg-white p-8 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase">
                  Comprovativo Oficial dos{' '}
                  {campaignDays.length}{' '}
                  Dias de Trabalho
                </h2>

                <p className="text-xs font-bold text-purple-800">
                  Campanha de Mobilização •
                  ODK Collect
                </p>
              </div>

              <div className="text-right">
                <div className="font-mono text-xs font-black">
                  REF-ODK-
                  {campaignDays.length}
                  DIAS-
                  {new Date().getFullYear()}
                </div>

                <p className="text-[10px] text-slate-500">
                  {new Date().toLocaleString(
                    'pt-PT'
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl bg-purple-50 border border-purple-200 p-4 text-center">
              <div>
                <span className="text-[10px] font-bold">
                  DIAS
                </span>

                <div className="text-xl font-black text-purple-900">
                  {
                    campaignDays.length
                  }
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold">
                  FORMULÁRIOS
                </span>

                <div className="text-xl font-black text-emerald-700">
                  {
                    totalFormsCount
                  }
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold">
                  SUBMISSÕES
                </span>

                <div className="text-xl font-black">
                  {
                    totalSubmissionsCount
                  }
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold">
                  VALIDADAS
                </span>

                <div className="text-xl font-black text-emerald-800">
                  {confirmedCount}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-300 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">
                      Dia
                    </th>

                    <th className="p-2.5">
                      Data
                    </th>

                    <th className="p-2.5">
                      Submissões
                    </th>

                    <th className="p-2.5 text-right">
                      Formulários
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {campaignDays.map(
                    (d) => (
                      <tr
                        key={
                          d.dayIndex
                        }
                        className="border-t"
                      >
                        <td className="p-2.5 font-black text-purple-900">
                          {
                            d.dayLabel
                          }
                        </td>

                        <td className="p-2.5 font-mono">
                          {d.date}
                        </td>

                        <td className="p-2.5">
                          {
                            d.submissions
                              .length
                          }
                        </td>

                        <td className="p-2.5 text-right font-black text-emerald-800">
                          {
                            d.totalFormsDay
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
              <h4 className="text-xs font-black text-purple-950">
                Captura de Ecrã dos Dias Trabalhados
              </h4>

              <p className="mt-1 text-[11px] text-purple-800">
                Anexe uma captura do ODK Collect
                como comprovativo.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];

                  if (file) {
                    handleImageUpload(
                      file,
                      setUploadedProof
                    );
                  }
                }}
                className="mt-3 w-full text-xs"
              />

              {uploadedProof && (
                <div className="mt-3 rounded-xl bg-white p-3">
                  <img
                    src={uploadedProof}
                    alt="Comprovativo ODK"
                    className="max-h-72 mx-auto object-contain"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-8 border-t pt-5 text-center text-xs">
              <div>
                <div className="border-t border-slate-400 pt-2 font-bold">
                  Assinatura do Supervisor
                </div>

                <p className="text-[10px] text-slate-500">
                  {user.nome}
                </p>
              </div>

              <div>
                <div className="border-t border-slate-400 pt-2 font-bold">
                  Validação do Administrador
                </div>

                <p className="text-[10px] text-emerald-700">
                  Autenticado
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-between border-t pt-4">
              <button
                onClick={() =>
                  setShow4DaysReceiptModal(
                    false
                  )
                }
                className="rounded-xl border px-5 py-2.5 text-xs font-bold"
              >
                Fechar
              </button>

              <button
                onClick={() =>
                  window.print()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-6 py-2.5 text-xs font-black text-white"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Capturar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          GUIA ODK
      ====================================================== */}

      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-400" />

                <h3 className="font-black">
                  Guia do ODK Collect
                </h3>
              </div>

              <button
                onClick={() =>
                  setShowInfoModal(false)
                }
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-200">
              <p>
                <strong>
                  ODK Collect
                </strong>{' '}
                é utilizado para recolha de
                dados e fichas de supervisão
                em campo.
              </p>

              <div className="rounded-xl bg-slate-800 p-4">
                <strong className="text-emerald-300">
                  Passo a passo:
                </strong>

                <ol className="mt-2 list-decimal pl-5 space-y-1">
                  <li>
                    Abrir o ODK Collect.
                  </li>

                  <li>
                    Preencher a ficha.
                  </li>

                  <li>
                    Enviar os formulários.
                  </li>

                  <li>
                    Registar o envio neste
                    sistema.
                  </li>

                  <li>
                    Aguardar validação do
                    administrador.
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-800 pt-4 text-right">
              <button
                onClick={() =>
                  setShowInfoModal(false)
                }
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-slate-950"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};