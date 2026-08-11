# Direatrizes e Regras Operacionais do Projeto (AGENTS.md)

## GitHub Workflow — Issues, Branches, Pull Requests e Deploys

### 1. Objetivo

Este projeto utiliza **GitHub Issues e Pull Requests (PRs)** como padrão obrigatório para organizar, desenvolver, revisar e publicar qualquer alteração no sistema.

Todas as alterações devem ser rastreáveis desde a solicitação inicial até o Deploy.

O fluxo oficial do projeto é:
**Issue → Branch → Desenvolvimento → Commit → Pull Request → Review → Merge → Deploy**

Este padrão deve ser seguido por:
* Desenvolvedores humanos;
* Agentes de IA;
* Agentes autónomos;
* Agentes de qualquer modelo;
* Ferramentas de geração ou alteração automática de código.

---

### 2. Regra Fundamental: TODA tarefa deve possuir uma Issue no GitHub

Inclui:
- **Correções**: Bugs, erros JS/TS, React, API, autenticação, banco de dados, ODK, uploads, permissões, responsividade, etc.
- **Melhorias**: Performance, UI/UX, refatoração, segurança, validações, filtros, relatórios, dashboards, etc.
- **Novas Funcionalidades**: Novas páginas, módulos, integrações, campos, exportações, permissões, etc.

---

### 3. Branches e Proteção da Branch Principal

- Nunca trabalhar diretamente na branch principal (`main` ou equivalente).
- Criar sempre uma branch específica para a Issue:
  - `feature/issue-{numero}-{descricao}`
  - `fix/issue-{numero}-{descricao}`
  - `improvement/issue-{numero}-{descricao}`
  - `refactor/issue-{numero}-{descricao}`
  - `docs/issue-{numero}-{descricao}`
  - `security/issue-{numero}-{descricao}`

---

### 4. Padrão de Commits

Commits claros e categorizados, referenciando o número da Issue:
- `feat: descrição (#123)`
- `fix: descrição (#123)`
- `improvement: descrição (#123)`
- `refactor: descrição (#123)`

Evitar commits genéricos como `update`, `changes`, `fix` ou `test`.

---

### 5. Pull Requests (PRs) e Referência Obrigatória a Issues

- **Toda alteração deve passar por um Pull Request.**
- **Mencionar obrigatoriamente a Issue no PR**: `Closes #123`, `Fixes #123` ou `Resolves #123`.
- Manter o PR pequeno e focado numa única tarefa lógica.

---

### 6. Testes e Qualidade Antes do PR e Deploy

Antes de considerar uma tarefa concluída ou abrir PR:
- [ ] Sem erros de sintaxe ou TypeScript (`npm run lint`).
- [ ] Aplicação compila e inicia sem falhas (`npm run build`).
- [ ] Testes funcionais e de interface validados.
- [ ] Alterações no banco de dados e variáveis de ambiente devidamente documentadas.
- [ ] Nenhuma exposição de chaves privadas, senhas ou secrets.

---

### 7. Sequência Operacional para Agentes de IA

1. **ENTENDER** a solicitação do utilizador.
2. **PROCURAR / MENCIONAR ISSUE** correspondente antes de implementar.
3. **ANALISAR O PROJETO** e verificar se já existem soluções/componentes reutilizáveis.
4. **DESENVOLVER** mantendo o escopo estrito da Issue.
5. **TESTAR & VERIFICAR** com `lint` e `build`.
6. **COMMITAR & VINCULAR PR** com as referências `Closes #{numero}`.
