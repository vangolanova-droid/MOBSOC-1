import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// In-memory data store with default seeds
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
    senha: 'admin123',
    tipo: 'admin',
    coordId: null,
    coordNome: 'Acesso Global',
  },
  {
    id: 2,
    nome: 'João Supervisor Norte',
    email: 'joao@sismob.ao',
    senha: 'sup123',
    tipo: 'supervisor',
    coordId: 1,
    coordNome: 'Coordenação Norte (Sumbe Urbano)',
  },
  {
    id: 3,
    nome: 'Maria Silva Sul',
    email: 'maria@sismob.ao',
    senha: 'sup123',
    tipo: 'supervisor',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
  },
  {
    id: 4,
    nome: 'Mateus Centro',
    email: 'mateus@sismob.ao',
    senha: 'sup123',
    tipo: 'supervisor',
    coordId: 3,
    coordNome: 'Coordenação Centro (Aeroporto / Bumba)',
  },
];

let mobilizadores: any[] = [
  {
    id: 1,
    nome: 'Afonso Neto',
    morada: 'Bairro 15 de Março, Sumbe',
    telefone: '923456789',
    funcao: 'Mobilizador Comunitário',
    coordId: 1,
    coordNome: 'Coordenação Norte (Sumbe Urbano)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    nome: 'Teresa Amélia',
    morada: 'Bairro Chingo, Sumbe',
    telefone: '912345678',
    funcao: 'Mobilizador Comunitário',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    nome: 'Domingos Vunge',
    morada: 'Bairro Quissala, Sumbe',
    telefone: '934567890',
    funcao: 'Mobilizador Comunitário',
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
    mobilizador: 'Afonso Neto',
    telefone: '923456789',
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
  {
    id: 1722700000002,
    provincia: 'CUANZA-SUL',
    municipio: 'SUMBE',
    comuna: 'SEDE',
    bairro: 'Chingo',
    data: '2026-08-02',
    mobilizador: 'Teresa Amélia',
    telefone: '912345678',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    userId: 3,
    tableData: {
      casa: [64, 264],
      igreja: [1, 60],
      pracas: [2, 90],
      paragem: [2, 45],
      creche: [0, 0],
      escola: [1, 70],
      agua: [3, 40],
      outros: [1, 20],
    },
    totalLocais: 74,
    totalPessoas: 589,
    sim: 130,
    nao: 8,
    motivo: 'Criança adentrou a escola',
    createdAt: new Date('2026-08-02T11:15:00Z').toISOString(),
  },
  {
    id: 1722700000003,
    provincia: 'CUANZA-SUL',
    municipio: 'SUMBE',
    comuna: 'SEDE',
    bairro: 'Quissala',
    data: '2026-08-03',
    mobilizador: 'Domingos Vunge',
    telefone: '934567890',
    coordId: 2,
    coordNome: 'Coordenação Sul (Chingo / Quissala)',
    userId: 3,
    tableData: {
      casa: [54, 223],
      igreja: [2, 110],
      pracas: [4, 130],
      paragem: [3, 55],
      creche: [2, 42],
      escola: [2, 120],
      agua: [5, 65],
      outros: [3, 45],
    },
    totalLocais: 75,
    totalPessoas: 790,
    sim: 180,
    nao: 15,
    motivo: 'Dúvidas sobre efeitos secundários',
    createdAt: new Date('2026-08-03T09:00:00Z').toISOString(),
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Coordenações
  app.get('/api/coordenacoes', (_req, res) => {
    res.json(coordenacoes);
  });

  app.post('/api/coordenacoes', (req, res) => {
    const { nome, coordenador } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome da coordenação é obrigatório' });
    }
    const newCoord = { id: Date.now(), nome, coordenador: coordenador || '' };
    coordenacoes.push(newCoord);
    res.status(201).json(newCoord);
  });

  app.patch('/api/coordenacoes/:id', (req, res) => {
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

  app.delete('/api/coordenacoes/:id', (req, res) => {
    const id = parseInt(req.params.id);
    coordenacoes = coordenacoes.filter((c) => c.id !== id);
    res.json({ success: true });
  });

  // Utilizadores
  app.get('/api/users', (_req, res) => {
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { nome, email, senha, tipo, coordId, fotoUrl } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email já registado no sistema' });
    }
    const coord = coordenacoes.find((c) => c.id === coordId);
    const newUser = {
      id: Date.now(),
      nome,
      email,
      senha,
      tipo: tipo || 'supervisor',
      coordId: tipo === 'admin' ? null : coordId || null,
      coordNome: tipo === 'admin' ? 'Acesso Global' : coord?.nome || '—',
      coordenadorNome: tipo === 'admin' ? 'Direção Geral de Saúde' : coord?.coordenador || '—',
      fotoUrl: fotoUrl || '',
    };
    users.push(newUser);
    res.status(201).json(newUser);
  });

  app.patch('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    const { nome, senha, coordId, fotoUrl } = req.body;
    if (nome) users[userIndex].nome = nome;
    if (senha) users[userIndex].senha = senha;
    if (fotoUrl !== undefined) users[userIndex].fotoUrl = fotoUrl;
    if (coordId !== undefined) {
      users[userIndex].coordId = coordId;
      const c = coordenacoes.find((x) => x.id === coordId);
      users[userIndex].coordNome = c ? c.nome : '—';
      users[userIndex].coordenadorNome = c ? c.coordenador || '—' : '—';
    }
    res.json(users[userIndex]);
  });

  app.delete('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    users = users.filter((u) => u.id !== id);
    res.json({ success: true });
  });

  // Mobilizadores
  app.get('/api/mobilizadores', (_req, res) => {
    res.json(mobilizadores);
  });

  app.post('/api/mobilizadores', (req, res) => {
    const { nome, morada, telefone, funcao, coordId, supervisorId, supervisorNome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do mobilizador é obrigatório' });
    }
    const c = coordenacoes.find((x) => x.id === Number(coordId));
    const newMob = {
      id: Date.now(),
      nome,
      morada: morada || '',
      telefone: telefone || '',
      funcao: funcao || 'Mobilizador Comunitário',
      coordId: coordId ? Number(coordId) : null,
      coordNome: c ? c.nome : 'Geral',
      supervisorId: supervisorId ? Number(supervisorId) : null,
      supervisorNome: supervisorNome || '',
      createdAt: new Date().toISOString(),
    };
    mobilizadores.push(newMob);
    res.status(201).json(newMob);
  });

  app.delete('/api/mobilizadores/:id', (req, res) => {
    const id = parseInt(req.params.id);
    mobilizadores = mobilizadores.filter((m) => m.id !== id);
    res.json({ success: true });
  });

  // Fichas
  app.get('/api/fichas', (_req, res) => {
    res.json(fichas);
  });

  app.post('/api/fichas', (req, res) => {
    const fichaData = req.body;
    if (!fichaData.mobilizador || !fichaData.bairro || !fichaData.data) {
      return res.status(400).json({ error: 'Dados obrigatórios em falta' });
    }
    const newFicha = {
      ...fichaData,
      id: fichaData.id || Date.now(),
      createdAt: new Date().toISOString(),
    };
    fichas.unshift(newFicha);
    res.status(201).json(newFicha);
  });

  app.delete('/api/fichas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    fichas = fichas.filter((f) => f.id !== id);
    res.json({ success: true });
  });

  // AI Insights Endpoint (Gemini API)
  app.post('/api/ai-insights', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error:
            'A chave GEMINI_API_KEY não está configurada no servidor. Por favor adicione nas definições.',
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

  // Vite Middleware handling
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SisMob] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
