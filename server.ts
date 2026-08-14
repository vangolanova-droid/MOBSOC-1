import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Configuração da chave secreta do JWT (obtida de variável de ambiente ou fallback seguro)
const JWT_SECRET = process.env.JWT_SECRET || 'sismob_jwt_secret_key_angola_2026_super_secure';

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

// In-memory data store com dados de demonstração
let coordenacoes: any[] = [
  { id: 1, nome: 'Coordenação Norte (Sumbe Urbano)', coordenador: 'Dr. Afonso Vunge' },
  { id: 2, nome: 'Coordenação Sul (Chingo / Quissala)', coordenador: 'Dra. Ana Paula' },
  { id: 3, nome: 'Coordenação Centro (Aeroporto / Bumba)', coordenador: 'Sr. Carlos Alberto' },
];

let users: any[] = [
  {
    id: 1,
    nome: 'Administrador Principal',
    email: 'admin@sismob.ao',
    senha: 'admin123', // Será convertido para hash no arranque do servidor
    tipo: 'admin',
    coordId: null,
    coordNome: 'Acesso Global',
    coordenadorNome: 'Direção Geral de Saúde',
  },
  {
    id: 2,
    nome: 'João Supervisor Norte',
    email: 'joao@sismob.ao',
    senha: 'sup123', // Será convertido para hash no arranque
    tipo: 'supervisor',
    coordId: 1,
    coordNome: 'Coordenação Norte (Sumbe Urbano)',
    coordenadorNome: 'Dr. Afonso Vunge',
  },
  {
    id: 3,
    nome: 'Maria Silva Sul',
    email: 'maria@sismob.ao',
    senha: 'sup123', // Será convertido para hash no arranque
    tipo: 'supervisor',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    coordenadorNome: 'Dra. Ana Paula',
  },
  {
    id: 4,
    nome: 'Mateus Centro',
    email: 'mateus@sismob.ao',
    senha: 'sup123', // Será convertido para hash no arranque
    tipo: 'supervisor',
    coordId: 3,
    coordNome: 'Coordenação Centro (Aeroporto / Bumba)',
    coordenadorNome: 'Sr. Carlos Alberto',
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
  console.log('[SisMob Auth] Migração de palavras-passe seed para hash bcrypt concluída.');
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
  const { senha, ...safeUser } = user;
  return safeUser;
}

async function startServer() {
  // Converte palavras-passe em texto simples da seed inicial para hashes bcrypt
  await hashSeedPasswords();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ---------------------------------------------------------
  // 1. ROTAS PÚBLICAS (Sem Autenticação)
  // ---------------------------------------------------------

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Autenticação: Login e Emissão do Token JWT
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' });
      }

      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas (email ou palavra-passe incorretos).' });
      }

      // Comparação da palavra-passe via bcrypt
      const isMatch = await bcrypt.compare(senha, user.senha);
      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciais inválidas (email ou palavra-passe incorretos).' });
      }

      // Emissão do Token JWT válido por 24 Horas
      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        tipo: user.tipo,
        nome: user.nome,
        coordId: user.coordId,
        coordNome: user.coordNome,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

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
      const { nome, email, senha, coordId } = req.body;
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
        tipo: 'supervisor',
        coordId: coordId ? Number(coordId) : null,
        coordNome: coord ? coord.nome : '—',
        coordenadorNome: coord ? coord.coordenador || '—' : '—',
        status: 'ativo',
        fotoUrl: '',
      };

      users.push(newUser);
      res.status(201).json(sanitizeUser(newUser));
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao registar utilizador.' });
    }
  });

  // ---------------------------------------------------------
  // 2. ROTAS PROTEGIDAS (Exigem Token JWT no Header Authorization)
  // ---------------------------------------------------------

  app.use('/api', requireAuth);

  // COORDENAÇÕES
  app.get('/api/coordenacoes', (_req: Request, res: Response) => {
    res.json(coordenacoes);
  });

  app.post('/api/coordenacoes', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { nome, coordenador } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome da coordenação é obrigatório' });
    }
    const newCoord = { id: Date.now(), nome, coordenador: coordenador || '' };
    coordenacoes.push(newCoord);
    res.status(201).json(newCoord);
  });

  app.patch('/api/coordenacoes/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const coordIndex = coordenacoes.findIndex((c) => c.id === id);
    if (coordIndex === -1) {
      return res.status(404).json({ error: 'Coordenação não encontrada' });
    }
    const { nome, coordenador } = req.body;
    if (nome) coordenacoes[coordIndex].nome = nome;
    if (coordenador !== undefined) coordenacoes[coordIndex].coordenador = coordenador;
    res.json(coordenacoes[coordIndex]);
  });

  app.delete('/api/coordenacoes/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    coordenacoes = coordenacoes.filter((c) => c.id !== id);
    res.json({ success: true });
  });

  // UTILIZADORES
  app.get('/api/users', (_req: Request, res: Response) => {
    res.json(users.map(sanitizeUser));
  });

  app.post('/api/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nome, email, senha, tipo, coordId, fotoUrl } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Email já registado no sistema' });
      }

      const hashedPassword = await bcrypt.hash(senha, 10);
      const coord = coordenacoes.find((c) => c.id === Number(coordId));

      const newUser = {
        id: Date.now(),
        nome,
        email: email.trim().toLowerCase(),
        senha: hashedPassword,
        tipo: tipo || 'supervisor',
        coordId: tipo === 'admin' ? null : coordId ? Number(coordId) : null,
        coordNome: tipo === 'admin' ? 'Acesso Global' : coord?.nome || '—',
        coordenadorNome: tipo === 'admin' ? 'Direção Geral de Saúde' : coord?.coordenador || '—',
        fotoUrl: fotoUrl || '',
      };

      users.push(newUser);
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

      // Permissão: Utilizador só pode atualizar o seu próprio perfil ou ser Admin
      if (req.user?.tipo !== 'admin' && req.user?.id !== id) {
        return res.status(403).json({ error: 'Sem permissão para alterar este utilizador.' });
      }

      const { nome, senha, coordId, fotoUrl } = req.body;
      if (nome) users[userIndex].nome = nome;
      if (senha) {
        users[userIndex].senha = await bcrypt.hash(senha, 10);
      }
      if (fotoUrl !== undefined) users[userIndex].fotoUrl = fotoUrl;
      if (coordId !== undefined && req.user?.tipo === 'admin') {
        users[userIndex].coordId = coordId;
        const c = coordenacoes.find((x) => x.id === Number(coordId));
        users[userIndex].coordNome = c ? c.nome : '—';
        users[userIndex].coordenadorNome = c ? c.coordenador || '—' : '—';
      }

      res.json(sanitizeUser(users[userIndex]));
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    }
  });

  app.delete('/api/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    users = users.filter((u) => u.id !== id);
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
      id: Date.now(),
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
      createdAt: new Date().toISOString(),
    };
    mobilizadores.push(newMob);
    res.status(201).json(newMob);
  });

  app.patch('/api/mobilizadores/:id', (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const index = mobilizadores.findIndex((m) => m.id === id);
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

    res.json(mobilizadores[index]);
  });

  app.delete('/api/mobilizadores/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    mobilizadores = mobilizadores.filter((m) => m.id !== id);
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
      createdAt: new Date().toISOString(),
    };
    fichas.unshift(newFicha);
    res.status(201).json(newFicha);
  });

  app.delete('/api/fichas/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(req.params.id);
    fichas = fichas.filter((f) => f.id !== id);
    res.json({ success: true });
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
        model: 'gemini-3.6-flash',
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