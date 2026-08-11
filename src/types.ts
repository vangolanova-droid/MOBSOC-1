export type UserRole = 'admin' | 'supervisor';

export interface User {
  id: number;
  nome: string;
  email: string;
  senha: string;
  tipo: UserRole;
  coordId: number | null;
  coordNome?: string;
  coordenadorNome?: string;
  ronda?: string;
  fotoUrl?: string;
  status?: 'ativo' | 'pendente' | 'rejeitado';
  telefone?: string;
  createdAt?: string;
}

export interface Coordination {
  id: number;
  nome: string;
  coordenador?: string;
  bairros?: string[];
  createdAt?: string;
}

export type LocationKey =
  | 'casa'
  | 'igreja'
  | 'pracas'
  | 'paragem'
  | 'creche'
  | 'escola'
  | 'agua'
  | 'outros';

export interface LocationConfig {
  key: LocationKey;
  label: string;
  group: 'casa' | 'other';
}

export interface Mobilizador {
  id: number;
  codigoId?: string;
  nome: string;
  morada: string;
  telefone: string;
  funcao: string;
  ronda?: string;
  coordId: number | null;
  coordNome?: string;
  supervisorId?: number | null;
  supervisorNome?: string;
  createdAt?: string;
}

export interface FichaTableData {
  [key: string]: [number, number]; // [locais, pessoas]
}

export interface CasoPFA {
  id: string;
  fichaId?: number;
  provincia: string;
  municipio: string;
  comuna?: string;
  bairro: string;
  dataDetecao: string;
  
  // Dados da Criança
  nomeCrianca: string;
  idadeCrianca: string; // e.g. "3 anos", "14 meses"
  sexoCrianca: 'Masculino' | 'Feminino';
  
  // Dados dos Pais / Encarregados
  comQuemVive?: string; // 'Pais' | 'Tio' | 'Tia' | 'Cunhada' | 'Irmã' | 'Irmão' | 'Primo' | 'Prima' | 'Outro'
  nomePai?: string;
  nomeMae?: string;
  nomeEncarregado: string;
  telefoneEncarregado: string;
  morada: string;
  pontoReferencia?: string;
  
  // Detalhes do Estágio da Paralisia
  tempoEstagio: string; // e.g. "4 dias", "2 semanas"
  membroAfetado?: string; // e.g. "Perna Esquerda", "Ambas as Pernas"
  febreNoInicio?: 'Sim' | 'Não' | 'Desconhecido';
  sintomasDescricao?: string;
  
  // Acompanhamento Técnico
  estaAcompanhada?: 'Sim' | 'Não' | 'Em Processo';
  tecnicoAcompanhante?: string;
  tecnicoTelefone?: string;
  dataUltimoAcompanhamento?: string;
  
  // Mobilizador & Coordenação
  mobilizadorNome: string;
  mobilizadorTelefone?: string;
  coordId?: number | null;
  coordNome: string;
  
  // Vigilância Epidemiológica
  statusNotificacao: 'Notificado à Vigilância' | 'Pendente de Investigação' | 'Em Acompanhamento' | 'Descartado';
  dataNotificacaoCS?: string;
  centroSaudeReferencia?: string;
  observacoesNotificacao?: string;
  createdAt: string;
}

export interface Ficha {
  id: number;
  provincia: string;
  municipio: string;
  comuna: string;
  bairro: string;
  data: string;
  ronda?: string;
  mobilizador: string;
  mobilizadorId?: number | null;
  mobilizadorCodigoId?: string;
  telefone?: string;
  coordId: number | null;
  coordNome: string;
  coordenadorNome?: string;
  userId: number;
  supervisorNome?: string;
  tableData: FichaTableData;
  totalLocais: number;
  totalPessoas: number;
  sim: number;
  nao: number;
  motivo?: string;
  pfaDetetado?: boolean;
  pfaCasos?: CasoPFA[];
  createdAt?: string;
  status?: 'pendente' | 'aprovada' | 'rejeitada';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  usuarioId: number;
  usuarioNome: string;
  usuarioTipo: UserRole;
  acao: 'Criação' | 'Edição' | 'Eliminação' | 'Login' | string;
  entidade: 'Ficha' | 'Utilizador' | 'Coordenação' | 'Mobilizador' | 'Sessão' | string;
  detalhes: string;
  fichaId?: number;
}

export interface CoordinationGoal {
  coordId: number;
  targetPessoas: number;
  targetLocais: number;
  targetFichas: number;
}

export interface AIInsightResponse {
  summary: string;
  keyStats: {
    totalPessoas: number;
    acceptanceRate: number;
    topLocation: string;
  };
  lowAcceptanceMotives: string[];
  recommendations: string[];
  officialBulletinDraft: string;
}

export interface PendingUpdate {
  type: 'nome' | 'senha' | 'nome_supervisor' | 'senha_supervisor';
  userId: number;
  email: string;
  nome?: string;
  senha?: string;
  timestamp: string;
}

export interface ODKSubmission {
  id: string;
  supervisorId: number;
  supervisorNome: string;
  coordId: number | null;
  coordNome: string;
  formId: string;
  formNome: string;
  dataEnvio: string;
  horaEnvio: string;
  totalFormularios: number;
  dispositivoAndroid?: string;
  codigoReciboODK: string;
  status: 'pendente' | 'confirmado' | 'divergencia';
  confirmadoPorAdmin?: boolean;
  adminConfirmadorNome?: string;
  dataConfirmacaoAdmin?: string;
  observacoes?: string;
  imagemComprovativo?: string;
  createdAt: string;
}

export interface PortalPost {
  id: string;
  titulo: string;
  subtitulo?: string;
  conteudo: string;
  categoria: 'Notícia' | 'Aviso' | 'Brigada Móvel' | 'Estatística' | 'Guia';
  data: string;
  autor: string;
  destaque?: boolean;
  imagemUrl?: string;
  createdAt: string;
}

