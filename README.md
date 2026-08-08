# SISMOB — Sistema de Mobilização Social de Saúde (Angola)

O **SISMOB** é uma plataforma web completa para a gestão, acompanhamento e consolidação de atividades de mobilização comunitária de saúde em Angola (vacinação, prevenção e sensibilização pública).

---

## 🚀 Funcionalidades Principais

- **Dashboard Executivo e Estatísticas**: Visão em tempo real do total de fichas submetidas, pessoas alcançadas, locais visitados e taxas de aceitação (SIM/NÃO).
- **Relatórios Oficiais por Supervisores**: Módulo para gerar relatórios diários ou gerais (cumulativos) agregados por supervisores e coordenações.
- **Exportação Formada em Excel (.xlsx) e PDF**:
  - **Excel**: Tabelas com formatação oficial, agrupadas por supervisor e ficha detalhada.
  - **PDF**: Relatórios oficiais prontos para impressão com cabeçalho institucional e resumo de indicadores.
- **Gestão de Coordenações e Bairros**: Cadastro de coordenações com suporte a modal de checklist de bairros integrados.
- **Gestão de Mobilizadores e Supervisores**: Atribuição de equipas no terreno por coordenação operacional.
- **Registo de Fichas de Campo**: Formulário para submissão de dados de mobilização com validações e totais calculados automaticamente.
- **Assistente de Inteligência Artificial**: Análise e recomendação inteligente de estratégias de campo alimentada pela API Gemini.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React (Ícones)
- **Compilação**: Vite
- **Persistência de Dados**: Firebase Firestore & Firebase Authentication
- **Relatórios & Gráficos**: jsPDF, jsPDF-AutoTable, XLSX (SheetJS), Recharts
- **Backend / API AI**: Node.js / Express com SDK `@google/genai`

---

## 📦 Como Instalar e Executar Localmente

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU-USUARIO/sismob-app.git
cd sismob-app
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o ficheiro `.env.example` para `.env`:
```bash
cp .env.example .env
```
Edite o `.env` com a sua chave de API Gemini (se aplicável):
```env
GEMINI_API_KEY="SuaChaveAqui"
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O projeto estará disponível em `http://localhost:3000`.

---

## 📤 Instruções para Subir para o GitHub

Se ainda não criou o repositório no GitHub:

1. Aceda ao [GitHub](https://github.com/new) e crie um **Novo Repositório** (ex: `sismob-app`).
2. No seu terminal local, execute os seguintes comandos dentro da pasta do projeto:

```bash
# Inicializar o repositório Git (se ainda não estiver inicializado)
git init

# Adicionar todos os ficheiros
git add .

# Criar o primeiro commit
git commit -m "feat: versão inicial do projeto SISMOB com relatórios por supervisores e exportação Excel/PDF"

# Definir a branch principal
git branch -M main

# Associar ao seu repositório no GitHub
git remote add origin https://github.com/SEU-USUARIO/sismob-app.git

# Enviar para o GitHub
git push -u origin main
```

---

## 📝 Licença

Este projeto foi desenvolvido para apoio ao serviço de saúde pública de Angola. Todos os direitos reservados.
