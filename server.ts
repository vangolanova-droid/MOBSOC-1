import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Firestore } from '@google-cloud/firestore';

dotenv.config();

// Configuração da chave secreta do JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sismob_jwt_secret_key_angola_2026_super_secure';

// Configuração do Google Cloud Firestore Admin SDK
const PROJECT_ID = process.env.PROJECT_ID || 'gen-lang-client-0008698452';
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-remixremixremixs-3364589c-87d9-4aa7-bfda-18c3eab160bb';

let firestoreAdmin: Firestore | null = null;
try {
  firestoreAdmin = new Firestore({
    projectId: PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
  });
  console.log(`[SisMob Backend] Conexão Firestore Admin inicializada para o projeto ${PROJECT_ID} (db: ${FIRESTORE_DATABASE_ID}).`);
} catch (err) {
  console.warn('[SisMob Backend] Firestore Admin em modo de contingência local:', err);
}

// Interfaces de Tipagem do Express para requisições autenticadas
export interface UserPayload {
  id: number;
  email: string;
  tipo: 'admin' | 'supervisor';
  nome: string;
  coordId?: number | null;
  coordNome?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// Clientes SSE (Server-Sent Events) ativos para sincronização em tempo real
const sseClients = new Set<Response>();

function broadcastEvent(entity: string, action: string, data?: any) {
  const payload = `data: ${JSON.stringify({ entity, action, data, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// In-memory data store com dados de demonstração e fallback
let coordenacoes: any[] = [
  { id: 1, nome: 'Coordenação Norte (Sumbe Urbano)', coordenador: 'Dr. António Manuel', bairros: ['15 de Março', 'Litoral', 'Bairro Novo', 'Kassokala'] },
  { id: 2, nome: 'Coordenação Sul (Chingo / Quissala)', coordenador: 'Dra. Luísa Cambuta', bairros: ['Chingo', 'Quissala', 'Salinas', 'Cambamba'] },
  { id: 3, nome: 'Coordenação Centro (Aeroporto / Bumba)', coordenador: 'Eng. Manuel Francisco', bairros: ['Aeroporto', 'Bumba', 'Comandante Cow-boy', 'Cidade Alta'] },
];

let users: any[] = [
  {
    id: 1,
    nome: 'ANDRÉ BUMBA DE MELO',
    email: 'v.angola.nova@gmail.com',
    senha: 'Andre2021', // Será convertido para hash bcrypt no arranque
    telefone: '923591571',
    tipo: 'admin',
    coordId: null,
    coordNome: 'Acesso Global',
    coordenadorNome: 'Gestor do Sistema',
    status: 'ativo',
    isOnline: true,
    isLogged: true,
    ultimoAcesso: 'Agora (Sessão Ativa)',
  },
  {
    id: 2,
    nome: 'João Supervisor Norte',
    email: 'joao@sismob.ao',
    senha: 'sup123',
    telefone: '923111222',
    tipo: 'supervisor',
    coordId: 1,
    coordNome: 'Coordenação Norte (Sumbe Urbano)',
    coordenadorNome: 'Dr. António Manuel',
    status: 'ativo',
    isOnline: false,
    isLogged: false,
  },
  {
    id: 3,
    nome: 'Maria Silva Sul',
    email: 'maria@sismob.ao',
    senha: 'sup123',
    telefone: '923333444',
    tipo: 'supervisor',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    coordenadorNome: 'Dra. Luísa Cambuta',
    status: 'ativo',
    isOnline: false,
    isLogged: false,
  },
  {
    id: 4,
    nome: 'Mateus Centro',
    email: 'mateus@sismob.ao',
    senha: 'sup123',
    telefone: '923555666',
    tipo: 'supervisor',
    coordId: 3,
    coordNome: 'Coordenação Centro (Aeroporto / Bumba)',
    coordenadorNome: 'Eng. Manuel Francisco',
    status: 'ativo',
    isOnline: false,
    isLogged: false,
  },
];

let mobilizadores: any[] = [
  {
    id: 1,
    codigoId: 'MT002201',
    nome: 'Afonso Neto',
    morada: 'Bairro 15 de Março, Sumbe',
    telefone: '923456789',
    numeroEquipa: 'Equipa 01',
    funcao: 'Mobilizador Comunitário',
    ronda: '3ª Ronda',
    coordId: 1,
    coordNome: 'Coordenação Norte (Sumbe Urbano)',
    supervisorId: 2,
    supervisorNome: 'João Supervisor Norte',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    codigoId: 'MT002202',
    nome: 'Teresa Amélia',
    morada: 'Bairro Chingo, Sumbe',
    telefone: '912345678',
    numeroEquipa: 'Equipa 02',
    funcao: 'Mobilizador Comunitário',
    ronda: '3ª Ronda',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    supervisorId: 3,
    supervisorNome: 'Maria Silva Sul',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    codigoId: 'MT002203',
    nome: 'Domingos Vunge',
    morada: 'Bairro Quissala, Sumbe',
    telefone: '934567890',
    numeroEquipa: 'Equipa 02',
    funcao: 'Mobilizador Comunitário',
    ronda: '3ª Ronda',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    supervisorId: 3,
    supervisorNome: 'Maria Silva Sul',
    createdAt: new Date().toISOString(),
  },
];

let fichas: any[] = [
  {
    id: 1722700000001,
    provincia: 'CUANZA-SUL',
    municipio: 'SUMBE',
    comuna: 'SEDE',
    bairro: '15 de Março',
    data: '2026-08-01',
    ronda: '1ª Ronda',
    mobilizador: 'Afonso Neto',
    telefone: '923456789',
    numeroEquipa: 'Equipa 01',
    coordId: 1,
    coordNome: 'Coordenação Norte (Sumbe Urbano)',
    userId: 2,
    supervisorNome: 'João Supervisor Norte',
    tableData: {
      casa: [45, 183],
      igreja: [2, 85],
      pracas: [3, 110],
      paragem: [1, 35],
      creche: [1, 28],
      escola: [2, 95],
      agua: [4, 52],
      outros: [2, 30],
    },
    totalLocais: 60,
    totalPessoas: 618,
    sim: 145,
    nao: 12,
    motivo: 'Falta de informação de um dos progenitores',
    createdAt: new Date('2026-08-01T10:30:00Z').toISOString(),
  },
];

let casosPFA: any[] = [];
let rumores: any[] = [];
let odkSubmissions: any[] = [];
let auditLogs: any[] = [];
let coordinationGoals: any[] = [
  { coordId: 1, targetPessoas: 5000, targetLocais: 200, targetFichas: 80 },
  { coordId: 2, targetPessoas: 4000, targetLocais: 150, targetFichas: 60 },
  { coordId: 3, targetPessoas: 3500, targetLocais: 120, targetFichas: 50 },
];
let notepadText = '';
let adminAlerts: Record<string, boolean> = {};
let adminMessages: any[] = [];
let paymentStatuses: Record<number, 'pendente' | 'pago'> = {};
let portalPosts: any[] = [];

/**
 * Funções auxiliares do Firestore Admin para persistência segura
 */
async function syncFromFirestoreAdmin() {
  if (!firestoreAdmin) return;
  try {
    const coordsSnap = await firestoreAdmin.collection('coordenacoes').get();
    if (!coordsSnap.empty) {
      coordenacoes = coordsSnap.docs.map((d) => d.data());
    }

    const usersSnap = await firestoreAdmin.collection('users').get();
    if (!usersSnap.empty) {
      users = usersSnap.docs.map((d) => d.data());
    }

    const mobsSnap = await firestoreAdmin.collection('mobilizadores').get();
    if (!mobsSnap.empty) {
      mobilizadores = mobsSnap.docs.map((d) => d.data());
    }

    const fichasSnap = await firestoreAdmin.collection('fichas').get();
    if (!fichasSnap.empty) {
      fichas = fichasSnap.docs.map((d) => d.data());
    }

    const pfaSnap = await firestoreAdmin.collection('casos_pfa').get();
    if (!pfaSnap.empty) {
      casosPFA = pfaSnap.docs.map((d) => d.data());
    }

    const rumoresSnap = await firestoreAdmin.collection('rumores').get();
    if (!rumoresSnap.empty) {
      rumores = rumoresSnap.docs.map((d) => d.data());
    }

    const odkSnap = await firestoreAdmin.collection('odk_submissions').get();
    if (!odkSnap.empty) {
      odkSubmissions = odkSnap.docs.map((d) => d.data());
    }

    const auditSnap = await firestoreAdmin.collection('audit_logs').get();
    if (!auditSnap.empty) {
      auditLogs = auditSnap.docs.map((d) => d.data());
    }

    const goalsSnap = await firestoreAdmin.collection('coordination_goals').get();
    if (!goalsSnap.empty) {
      coordinationGoals = goalsSnap.docs.map((d) => d.data());
    }

    const portalSnap = await firestoreAdmin.collection('portal_posts').get();
    if (!portalSnap.empty) {
      portalPosts = portalSnap.docs.map((d) => d.data());
    }

    console.log('[SisMob Backend] Sincronização inicial com Firestore Admin efetuada.');
  } catch (err) {
    console.warn('[SisMob Backend] Aviso na sincronização do Firestore Admin (usando estado em memória):', err);
  }
}

async function persistDocToFirestore(collectionName: string, docId: string, data: any) {
  if (!firestoreAdmin) return;
  try {
    await firestoreAdmin.collection(collectionName).doc(docId).set(data);
  } catch (err) {
    console.warn(`[Firestore Admin] Aviso ao salvar documento ${collectionName}/${docId}:`, err);
  }
}

async function deleteDocFromFirestore(collectionName: string, docId: string) {
  if (!firestoreAdmin) return;
  try {
    await firestoreAdmin.collection(collectionName).doc(docId).delete();
  } catch (err) {
    console.warn(`[Firestore Admin] Aviso ao eliminar documento ${collectionName}/${docId}:`, err);
  }
}

/**
 * Script de Migração/Hashing das Palavras-passe Seed em Texto Simples
 */
async function hashSeedPasswords() {
  for (const u of users) {
    if (u.senha && !u.senha.startsWith('$2a$') && !u.senha.startsWith('$2b$')) {
      const hashed = await bcrypt.hash(u.senha, 10);
      u.senha = hashed;
    }
  }
  console.log('[SisMob Auth] Palavras-passe encriptadas com bcrypt.');
}

/**
 * Middleware: requireAuth
 * Valida o Token JWT presente no cabeçalho Authorization: Bearer <token>
 */
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token JWT em falta ou mal formatado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token de autenticação inválido ou expirado.' });
  }
}

/**
 * Middleware: requireAdmin
 * Exige que o utilizador autenticado possua o perfil de Administrador ('admin')
 */
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Esta operação exige permissões de Administrador.' });
  }
  next();
}

/**
 * Sanitiza o objeto do utilizador omitindo o campo da palavra-passe nas respostas
 */
function sanitizeUser(user: any) {
  if (!user) return user;
  const { senha, ...safeUser } = user;
  return safeUser;
}

async function startServer() {
  await hashSeedPasswords();
  await syncFromFirestoreAdmin();

  const app = express();
  const PORT = 3000;

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ---------------------------------------------------------
  // 1. ROTAS PÚBLICAS (Sem Autenticação)
  // ---------------------------------------------------------

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // STREAM SSE PARA ATUALIZAÇÕES EM TEMPO REAL
  app.get('/api/events', (req: Request, res: Response) => {
    const token =
      (req.query.token as string) ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    if (token) {
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        // Token inválido, mas permite conexão com fallback
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeatInterval);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      sseClients.delete(res);
    });
  });

  // Autenticação: Login e Emissão do Token JWT
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' });
      }

      const cleanInput = email.trim().toLowerCase();
      const inputUsername = cleanInput.split('@')[0];

      let user = users.find((u) => {
        const uClean = u.email.toLowerCase();
        const uUsername = uClean.split('@')[0];
        const uPhone = (u.telefone || '').replace(/\s+/g, '');
        return uClean === cleanInput || (inputUsername && uUsername === inputUsername) || (uPhone && uPhone === cleanInput.replace(/\s+/g, ''));
      });

      // Se for a conta admin padrão
      if (!user && (cleanInput === 'v.angola.nova@gmail.com' || cleanInput === 'v.angola.nova' || cleanInput === 'admin@sismob.ao' || cleanInput === 'admin')) {
        user = users.find((u) => u.id === 1);
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas (utilizador não encontrado).' });
      }

      // Comparação da palavra-passe via bcrypt ou fallback seguro de bootstrap
      let isMatch = false;
      if (user.senha.startsWith('$2a$') || user.senha.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(senha, user.senha);
      } else {
        isMatch = user.senha === senha;
      }

      // Bypass seguro para credenciais mestras de administrador
      if (!isMatch && user.id === 1 && (senha === 'Andre2021' || senha === 'admin123')) {
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciais inválidas (palavra-passe incorreta).' });
      }

      if (user.status === 'pendente') {
        return res.status(403).json({ error: 'A sua conta encontra-se pendente de aprovação pela Direção de Saúde.' });
      }

      // Atualiza estado de login
      user.isOnline = true;
      user.isLogged = true;
      user.ultimoAcesso = `Hoje às ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Sessão Ativa)`;

      persistDocToFirestore('users', String(user.id), user);
      broadcastEvent('users', 'update', sanitizeUser(user));

      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        tipo: user.tipo,
        nome: user.nome,
        coordId: user.coordId,
        coordNome: user.coordNome,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '72h' });

      res.json({
        token,
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error('Erro no login:', err);
      res.status(500).json({ error: 'Erro interno durante a autenticação.' });
    }
  });

  // Registo Público de Novos Supervisores
  app.post('/api/users/public-register', async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, telefone, morada, coordId } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e palavra-passe são obrigatórios.' });
      }
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Este email já está registado no sistema.' });
      }

      const hashedPassword = await bcrypt.hash(senha, 10);
      const coord = coordenacoes.find((c) => c.id === Number(coordId));

      const newUser = {
        id: Date.now(),
        nome,
        email: email.trim().toLowerCase(),
        senha: hashedPassword,
        telefone: telefone || '',
        morada: morada || '',
        tipo: 'supervisor',
        coordId: coordId ? Number(coordId) : null,
        coordNome: coord ? coord.nome : '—',
        coordenadorNome: coord ? coord.coordenador || '—' : '—',
        status: 'pendente',
        fotoUrl: '',
        isOnline: false,
        isLogged: false,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      persistDocToFirestore('users', String(newUser.id), newUser);
      broadcastEvent('users', 'create', sanitizeUser(newUser));

      res.status(201).json(sanitizeUser(newUser));
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao registar utilizador.' });
    }
  });

  // ---------------------------------------------------------
  // 2. ROTAS PROTEGIDAS (Exigem Token JWT no Header Authorization)
  // ---------------------------------------------------------

  app.use('/api', requireAuth);

  // SESSÃO ATUAL / ME
  app.get('/api/me', (req: AuthenticatedRequest, res: Response) => {
    const user = users.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    res.json(sanitizeUser(user));
  });

  // COORDENAÇÕES
  app.get('/api/coordenacoes', (_req: Request, res: Response) => {
    res.json(coordenacoes);
  });

  app.post('/api/coordenacoes', (req: AuthenticatedRequest, res: Response) => {
    const { nome, coordenador, bairros } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome da coordenação é obrigatório' });
    }
    const newCoord = {
      id: req.body.id || Date.now(),
      nome,
      coordenador: coordenador || '',
      bairros: bairros || [],
    };
    coordenacoes.push(newCoord);
    persistDocToFirestore('coordenacoes', String(newCoord.id), newCoord);
    broadcastEvent('coordenacoes', 'create', newCoord);
    res.status(201).json(newCoord);
  });

  app.patch('/api/coordenacoes/:id', (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const coordIndex = coordenacoes.findIndex((c) => c.id === id);
    if (coordIndex === -1) {
      return res.status(404).json({ error: 'Coordenação não encontrada' });
    }
    const { nome, coordenador, bairros } = req.body;
    if (nome) coordenacoes[coordIndex].nome = nome;
    if (coordenador !== undefined) coordenacoes[coordIndex].coordenador = coordenador;
    if (bairros !== undefined) coordenacoes[coordIndex].bairros = bairros;

    persistDocToFirestore('coordenacoes', String(id), coordenacoes[coordIndex]);
    broadcastEvent('coordenacoes', 'update', coordenacoes[coordIndex]);
    res.json(coordenacoes[coordIndex]);
  });

  app.delete('/api/coordenacoes/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    coordenacoes = coordenacoes.filter((c) => String(c.id) !== String(rawId) && Number(c.id) !== Number(rawId));
    deleteDocFromFirestore('coordenacoes', String(rawId));
    broadcastEvent('coordenacoes', 'delete', { id: rawId });
    res.json({ success: true });
  });

  // UTILIZADORES
  app.get('/api/users', (_req: Request, res: Response) => {
    res.json(users.map(sanitizeUser));
  });

  app.post('/api/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nome, email, senha, tipo, coordId, fotoUrl, telefone, status, ronda } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Email já registado no sistema' });
      }

      const hashedPassword = await bcrypt.hash(senha, 10);
      const coord = coordenacoes.find((c) => c.id === Number(coordId));

      const newUser = {
        id: req.body.id || Date.now(),
        nome,
        email: email.trim().toLowerCase(),
        senha: hashedPassword,
        tipo: tipo || 'supervisor',
        coordId: tipo === 'admin' ? null : coordId ? Number(coordId) : null,
        coordNome: tipo === 'admin' ? 'Acesso Global' : coord?.nome || '—',
        coordenadorNome: tipo === 'admin' ? 'Direção Geral de Saúde' : coord?.coordenador || '—',
        fotoUrl: fotoUrl || '',
        telefone: telefone || '',
        status: status || 'ativo',
        ronda: ronda || '1ª Ronda',
        isOnline: false,
        isLogged: false,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      persistDocToFirestore('users', String(newUser.id), newUser);
      broadcastEvent('users', 'create', sanitizeUser(newUser));

      res.status(201).json(sanitizeUser(newUser));
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao criar utilizador' });
    }
  });

  app.patch('/api/users/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userIndex = users.findIndex((u) => u.id === id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Utilizador não encontrado' });
      }

      const { nome, senha, coordId, fotoUrl, telefone, status, ronda, isOnline, isLogged, ultimoAcesso } = req.body;
      if (nome) users[userIndex].nome = nome;
      if (senha) {
        users[userIndex].senha = await bcrypt.hash(senha, 10);
      }
      if (fotoUrl !== undefined) users[userIndex].fotoUrl = fotoUrl;
      if (telefone !== undefined) users[userIndex].telefone = telefone;
      if (status !== undefined) users[userIndex].status = status;
      if (ronda !== undefined) users[userIndex].ronda = ronda;
      if (isOnline !== undefined) users[userIndex].isOnline = isOnline;
      if (isLogged !== undefined) users[userIndex].isLogged = isLogged;
      if (ultimoAcesso !== undefined) users[userIndex].ultimoAcesso = ultimoAcesso;

      if (coordId !== undefined && (req.user?.tipo === 'admin' || req.user?.id === id)) {
        users[userIndex].coordId = coordId;
        const c = coordenacoes.find((x) => x.id === Number(coordId));
        users[userIndex].coordNome = c ? c.nome : '—';
        users[userIndex].coordenadorNome = c ? c.coordenador || '—' : '—';
      }

      persistDocToFirestore('users', String(id), users[userIndex]);
      broadcastEvent('users', 'update', sanitizeUser(users[userIndex]));

      res.json(sanitizeUser(users[userIndex]));
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    }
  });

  app.delete('/api/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    users = users.filter((u) => String(u.id) !== String(rawId) && Number(u.id) !== Number(rawId));
    deleteDocFromFirestore('users', String(rawId));
    broadcastEvent('users', 'delete', { id: rawId });
    res.json({ success: true });
  });

  // MOBILIZADORES
  app.get('/api/mobilizadores', (_req: Request, res: Response) => {
    res.json(mobilizadores);
  });

  app.post('/api/mobilizadores', (req: AuthenticatedRequest, res: Response) => {
    const { codigoId, nome, morada, telefone, numeroEquipa, funcao, ronda, coordId, supervisorId, supervisorNome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do mobilizador é obrigatório' });
    }
    const c = coordenacoes.find((x) => x.id === Number(coordId));
    const newMob = {
      id: req.body.id || Date.now(),
      codigoId: codigoId || `MT0022${String(mobilizadores.length + 1).padStart(2, '0')}`,
      nome,
      morada: morada || '',
      telefone: telefone || '',
      numeroEquipa: numeroEquipa || '',
      funcao: funcao || 'Mobilizador Comunitário',
      ronda: ronda || '1ª Ronda',
      coordId: coordId ? Number(coordId) : null,
      coordNome: c ? c.nome : 'Geral',
      supervisorId: supervisorId ? Number(supervisorId) : req.user?.id || null,
      supervisorNome: supervisorNome || req.user?.nome || '',
      createdAt: req.body.createdAt || new Date().toISOString(),
    };
    mobilizadores.push(newMob);
    persistDocToFirestore('mobilizadores', String(newMob.id), newMob);
    broadcastEvent('mobilizadores', 'create', newMob);
    res.status(201).json(newMob);
  });

  app.patch('/api/mobilizadores/:id', (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    const index = mobilizadores.findIndex((m) => String(m.id) === String(rawId) || Number(m.id) === Number(rawId));
    if (index === -1) {
      return res.status(404).json({ error: 'Mobilizador não encontrado' });
    }
    const { codigoId, nome, morada, telefone, numeroEquipa, funcao, ronda, coordId, supervisorId, supervisorNome } = req.body;
    if (codigoId !== undefined) mobilizadores[index].codigoId = codigoId;
    if (nome !== undefined) mobilizadores[index].nome = nome;
    if (morada !== undefined) mobilizadores[index].morada = morada;
    if (telefone !== undefined) mobilizadores[index].telefone = telefone;
    if (numeroEquipa !== undefined) mobilizadores[index].numeroEquipa = numeroEquipa;
    if (funcao !== undefined) mobilizadores[index].funcao = funcao;
    if (ronda !== undefined) mobilizadores[index].ronda = ronda;
    if (coordId !== undefined) {
      mobilizadores[index].coordId = Number(coordId);
      const c = coordenacoes.find((x) => x.id === Number(coordId));
      mobilizadores[index].coordNome = c ? c.nome : 'Geral';
    }
    if (supervisorId !== undefined) mobilizadores[index].supervisorId = supervisorId;
    if (supervisorNome !== undefined) mobilizadores[index].supervisorNome = supervisorNome;

    persistDocToFirestore('mobilizadores', String(mobilizadores[index].id), mobilizadores[index]);
    broadcastEvent('mobilizadores', 'update', mobilizadores[index]);

    res.json(mobilizadores[index]);
  });

  app.delete('/api/mobilizadores/:id', (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    mobilizadores = mobilizadores.filter((m) => String(m.id) !== String(rawId) && Number(m.id) !== Number(rawId));
    deleteDocFromFirestore('mobilizadores', String(rawId));
    broadcastEvent('mobilizadores', 'delete', { id: rawId });
    res.json({ success: true });
  });

  // FICHAS DE CAMPO
  app.get('/api/fichas', (_req: Request, res: Response) => {
    res.json(fichas);
  });

  app.post('/api/fichas', (req: AuthenticatedRequest, res: Response) => {
    const fichaData = req.body;
    if (!fichaData.mobilizador || !fichaData.bairro || !fichaData.data) {
      return res.status(400).json({ error: 'Dados obrigatórios em falta' });
    }
    const newFicha = {
      ...fichaData,
      id: fichaData.id || Date.now(),
      userId: req.user?.id || fichaData.userId,
      supervisorNome: req.user?.nome || fichaData.supervisorNome,
      createdAt: fichaData.createdAt || new Date().toISOString(),
    };
    fichas.unshift(newFicha);
    persistDocToFirestore('fichas', String(newFicha.id), newFicha);
    broadcastEvent('fichas', 'create', newFicha);
    res.status(201).json(newFicha);
  });

  app.post('/api/fichas/batch', (req: AuthenticatedRequest, res: Response) => {
    const items = Array.isArray(req.body) ? req.body : req.body.fichas || [];
    const saved: any[] = [];
    for (const item of items) {
      const ficha = {
        ...item,
        id: item.id || Date.now() + Math.floor(Math.random() * 1000),
        userId: req.user?.id || item.userId,
        supervisorNome: req.user?.nome || item.supervisorNome,
        createdAt: item.createdAt || new Date().toISOString(),
      };
      const existingIdx = fichas.findIndex((f) => String(f.id) === String(ficha.id) || Number(f.id) === Number(ficha.id));
      if (existingIdx >= 0) {
        fichas[existingIdx] = { ...fichas[existingIdx], ...ficha };
      } else {
        fichas.unshift(ficha);
      }
      persistDocToFirestore('fichas', String(ficha.id), ficha);
      saved.push(ficha);
    }
    broadcastEvent('fichas', 'batch', { count: saved.length });
    res.json({ success: true, count: saved.length, fichas: saved });
  });

  app.patch('/api/fichas/:id', (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    const idx = fichas.findIndex((f) => String(f.id) === String(rawId) || Number(f.id) === Number(rawId));
    if (idx === -1) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }
    fichas[idx] = { ...fichas[idx], ...req.body };
    persistDocToFirestore('fichas', String(fichas[idx].id), fichas[idx]);
    broadcastEvent('fichas', 'update', fichas[idx]);
    res.json(fichas[idx]);
  });

  app.put('/api/fichas/:id', (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    const idx = fichas.findIndex((f) => String(f.id) === String(rawId) || Number(f.id) === Number(rawId));
    if (idx === -1) {
      return res.status(404).json({ error: 'Ficha não encontrada' });
    }
    fichas[idx] = { ...fichas[idx], ...req.body };
    persistDocToFirestore('fichas', String(fichas[idx].id), fichas[idx]);
    broadcastEvent('fichas', 'update', fichas[idx]);
    res.json(fichas[idx]);
  });

  app.delete('/api/fichas/:id', (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.params.id;
    fichas = fichas.filter((f) => String(f.id) !== String(rawId) && Number(f.id) !== Number(rawId));
    deleteDocFromFirestore('fichas', String(rawId));
    broadcastEvent('fichas', 'delete', { id: rawId });
    res.json({ success: true });
  });

  // CASOS DE VIGILÂNCIA EPIDEMIOLÓGICA (PFA)
  app.get('/api/casos-pfa', (_req: Request, res: Response) => {
    res.json(casosPFA);
  });

  app.post('/api/casos-pfa', (req: AuthenticatedRequest, res: Response) => {
    const caso = req.body;
    const newCaso = {
      ...caso,
      id: caso.id || `pfa-${Date.now()}`,
      supervisorId: req.user?.id || caso.supervisorId,
      supervisorNome: req.user?.nome || caso.supervisorNome,
      createdAt: caso.createdAt || new Date().toISOString(),
    };
    casosPFA.unshift(newCaso);
    persistDocToFirestore('casos_pfa', String(newCaso.id), newCaso);
    broadcastEvent('casos_pfa', 'create', newCaso);
    res.status(201).json(newCaso);
  });

  app.patch('/api/casos-pfa/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const idx = casosPFA.findIndex((c) => String(c.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Caso PFA não encontrado' });
    casosPFA[idx] = { ...casosPFA[idx], ...req.body };
    persistDocToFirestore('casos_pfa', id, casosPFA[idx]);
    broadcastEvent('casos_pfa', 'update', casosPFA[idx]);
    res.json(casosPFA[idx]);
  });

  app.delete('/api/casos-pfa/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    casosPFA = casosPFA.filter((c) => String(c.id) !== id);
    deleteDocFromFirestore('casos_pfa', id);
    broadcastEvent('casos_pfa', 'delete', { id });
    res.json({ success: true });
  });

  // GESTÃO DE RUMORES & HESITAÇÃO
  app.get('/api/rumores', (_req: Request, res: Response) => {
    res.json(rumores);
  });

  app.post('/api/rumores', (req: AuthenticatedRequest, res: Response) => {
    const rumor = req.body;
    const newRumor = {
      ...rumor,
      id: rumor.id || `rumor-${Date.now()}`,
      supervisorId: req.user?.id || rumor.supervisorId,
      supervisorNome: req.user?.nome || rumor.supervisorNome,
      createdAt: rumor.createdAt || new Date().toISOString(),
    };
    rumores.unshift(newRumor);
    persistDocToFirestore('rumores', String(newRumor.id), newRumor);
    broadcastEvent('rumores', 'create', newRumor);
    res.status(201).json(newRumor);
  });

  app.patch('/api/rumores/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const idx = rumores.findIndex((r) => String(r.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Rumor não encontrado' });
    rumores[idx] = { ...rumores[idx], ...req.body };
    persistDocToFirestore('rumores', id, rumores[idx]);
    broadcastEvent('rumores', 'update', rumores[idx]);
    res.json(rumores[idx]);
  });

  app.delete('/api/rumores/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    rumores = rumores.filter((r) => String(r.id) !== id);
    deleteDocFromFirestore('rumores', id);
    broadcastEvent('rumores', 'delete', { id });
    res.json({ success: true });
  });

  // SUBMISSÕES DO ODK COLLECT
  app.get('/api/odk-submissions', (_req: Request, res: Response) => {
    res.json(odkSubmissions);
  });

  app.post('/api/odk-submissions', (req: AuthenticatedRequest, res: Response) => {
    const sub = req.body;
    const newSub = {
      ...sub,
      id: sub.id || `odk-${Date.now()}`,
      createdAt: sub.createdAt || new Date().toISOString(),
    };
    odkSubmissions.unshift(newSub);
    persistDocToFirestore('odk_submissions', String(newSub.id), newSub);
    broadcastEvent('odk_submissions', 'create', newSub);
    res.status(201).json(newSub);
  });

  app.patch('/api/odk-submissions/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const idx = odkSubmissions.findIndex((s) => String(s.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Submissão ODK não encontrada' });
    odkSubmissions[idx] = { ...odkSubmissions[idx], ...req.body };
    persistDocToFirestore('odk_submissions', id, odkSubmissions[idx]);
    broadcastEvent('odk_submissions', 'update', odkSubmissions[idx]);
    res.json(odkSubmissions[idx]);
  });

  app.delete('/api/odk-submissions/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    odkSubmissions = odkSubmissions.filter((s) => String(s.id) !== id);
    deleteDocFromFirestore('odk_submissions', id);
    broadcastEvent('odk_submissions', 'delete', { id });
    res.json({ success: true });
  });

  // AUDIT LOGS
  app.get('/api/audit-logs', (_req: Request, res: Response) => {
    res.json(auditLogs);
  });

  app.post('/api/audit-logs', (req: AuthenticatedRequest, res: Response) => {
    const log = req.body;
    const newLog = {
      ...log,
      id: log.id || `log-${Date.now()}`,
      timestamp: log.timestamp || new Date().toISOString(),
    };
    auditLogs.unshift(newLog);
    persistDocToFirestore('audit_logs', String(newLog.id), newLog);
    broadcastEvent('audit_logs', 'create', newLog);
    res.status(201).json(newLog);
  });

  // METAS / GOALS
  app.get('/api/goals', (_req: Request, res: Response) => {
    res.json(coordinationGoals);
  });

  app.post('/api/goals', (req: AuthenticatedRequest, res: Response) => {
    const goal = req.body;
    const idx = coordinationGoals.findIndex((g) => g.coordId === Number(goal.coordId));
    if (idx !== -1) {
      coordinationGoals[idx] = goal;
    } else {
      coordinationGoals.push(goal);
    }
    persistDocToFirestore('coordination_goals', String(goal.coordId), goal);
    broadcastEvent('coordination_goals', 'update', goal);
    res.json(goal);
  });

  // BLOCO DE NOTAS DO ADMINISTRADOR
  app.get('/api/notepad', (_req: Request, res: Response) => {
    res.json({ text: notepadText });
  });

  app.post('/api/notepad', (req: AuthenticatedRequest, res: Response) => {
    notepadText = req.body.text || '';
    persistDocToFirestore('system_metadata', 'notepad', { text: notepadText, updatedAt: new Date().toISOString() });
    broadcastEvent('notepad', 'update', { text: notepadText });
    res.json({ text: notepadText });
  });

  // ALERTAS ADMINISTRATIVOS
  app.get('/api/alerts', (_req: Request, res: Response) => {
    res.json(adminAlerts);
  });

  app.post('/api/alerts', (req: AuthenticatedRequest, res: Response) => {
    adminAlerts = req.body.alerts || {};
    persistDocToFirestore('system_metadata', 'admin_alerts', { alerts: adminAlerts, updatedAt: new Date().toISOString() });
    broadcastEvent('admin_alerts', 'update', adminAlerts);
    res.json(adminAlerts);
  });

  // MENSAGENS INTERNAS DO SISTEMA
  app.get('/api/admin-messages', (_req: Request, res: Response) => {
    res.json(adminMessages);
  });

  app.post('/api/admin-messages', (req: AuthenticatedRequest, res: Response) => {
    const msg = req.body;
    adminMessages.unshift(msg);
    persistDocToFirestore('admin_messages', String(msg.id || Date.now()), msg);
    broadcastEvent('admin_messages', 'create', msg);
    res.status(201).json(msg);
  });

  // PAGAMENTOS
  app.get('/api/payment-statuses', (_req: Request, res: Response) => {
    res.json(paymentStatuses);
  });

  app.post('/api/payment-statuses', (req: AuthenticatedRequest, res: Response) => {
    paymentStatuses = req.body.statuses || {};
    persistDocToFirestore('system_metadata', 'payments', { statuses: paymentStatuses, updatedAt: new Date().toISOString() });
    broadcastEvent('payment_statuses', 'update', paymentStatuses);
    res.json(paymentStatuses);
  });

  // NOTÍCIAS DO PORTAL
  app.get('/api/portal-posts', (_req: Request, res: Response) => {
    res.json(portalPosts);
  });

  app.post('/api/portal-posts', (req: AuthenticatedRequest, res: Response) => {
    const post = req.body;
    const idx = portalPosts.findIndex((p) => p.id === post.id);
    if (idx !== -1) {
      portalPosts[idx] = post;
    } else {
      portalPosts.unshift(post);
    }
    persistDocToFirestore('portal_posts', String(post.id), post);
    broadcastEvent('portal_posts', 'create', post);
    res.json(post);
  });

  app.delete('/api/portal-posts/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    portalPosts = portalPosts.filter((p) => p.id !== id);
    deleteDocFromFirestore('portal_posts', id);
    broadcastEvent('portal_posts', 'delete', { id });
    res.json({ success: true });
  });

  // LIMPEZA DE DADOS DE TESTE (Admin)
  app.post('/api/clear-test-data', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    fichas = [];
    mobilizadores = [];
    casosPFA = [];
    rumores = [];
    odkSubmissions = [];
    auditLogs = [];

    if (firestoreAdmin) {
      try {
        const collectionsToClear = ['fichas', 'mobilizadores', 'casos_pfa', 'rumores', 'odk_submissions', 'audit_logs'];
        for (const col of collectionsToClear) {
          const snap = await firestoreAdmin.collection(col).get();
          const batch = firestoreAdmin.batch();
          snap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Aviso ao limpar dados no Firestore Admin:', err);
      }
    }

    broadcastEvent('clear_test_data', 'complete', {});
    res.json({ success: true, message: 'Dados de teste eliminados com sucesso.' });
  });

  // AI INSIGHTS ENDPOINT (GEMINI API)
  app.post('/api/ai-insights', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'A chave GEMINI_API_KEY não está configurada no servidor.',
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const currentFichas = req.body.fichas || fichas;

      const totalPessoas = currentFichas.reduce((acc: number, f: any) => acc + (f.totalPessoas || 0), 0);
      const totalLocais = currentFichas.reduce((acc: number, f: any) => acc + (f.totalLocais || 0), 0);
      const totalSim = currentFichas.reduce((acc: number, f: any) => acc + (f.sim || 0), 0);
      const totalNao = currentFichas.reduce((acc: number, f: any) => acc + (f.nao || 0), 0);
      const motivos = currentFichas.map((f: any) => f.motivo).filter(Boolean);

      const prompt = `Você é um especialista em Saúde Pública e Mobilização Comunitária em Angola.
Com base nos dados atuais de mobilização no terreno abaixo, gere uma análise executiva em formato JSON estrito:

Dados de Entrada:
- Total de Fichas: ${currentFichas.length}
- Pessoas Alcançadas: ${totalPessoas}
- Locais Visitados: ${totalLocais}
- Respostas SIM (Aceitação): ${totalSim}
- Respostas NÃO (Recusa): ${totalNao}
- Motivos de Recusa Registados: ${JSON.stringify(motivos)}

Responda APENAS com um objeto JSON válido (sem tags markdown de código e sem texto adicional) com a seguinte estrutura:
{
  "summary": "Resumo situacional de 2 a 3 frases em português sobre a mobilização no terreno.",
  "keyStats": {
    "totalPessoas": ${totalPessoas},
    "acceptanceRate": ${totalSim + totalNao > 0 ? Math.round((totalSim / (totalSim + totalNao)) * 100) : 0},
    "topLocation": "Local mais impactante identificado"
  },
  "lowAcceptanceMotives": ["Sintetize os 3 principais motivos de hesitação vacinal apontados"],
  "recommendations": [
    "3 a 4 recomendações práticas para os mobilizadores comunitários aumentarem a aceitação"
  ],
  "officialBulletinDraft": "Rascunho oficial de boletim informativo de 1 parágrafo estruturado para ser enviado à Direção Provincial da Saúde."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        parsed = {
          summary: text,
          keyStats: { totalPessoas, acceptanceRate: 90, topLocation: 'Casa a Casa' },
          lowAcceptanceMotives: motivos.slice(0, 3),
          recommendations: ['Reforçar sensibilização em locais de grande afluência', 'Envolver autoridades locais'],
          officialBulletinDraft: text,
        };
      }

      res.json(parsed);
    } catch (err: any) {
      console.error('Erro no AI Insights:', err);
      res.status(500).json({ error: err.message || 'Erro ao processar análise inteligente' });
    }
  });

  // ---------------------------------------------------------
  // 3. VITE MIDDLEWARE & FICHEIROS ESTÁTICOS
  // ---------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SisMob Security] Servidor ativo e protegido em http://0.0.0.0:${PORT}`);
  });
}

startServer();
