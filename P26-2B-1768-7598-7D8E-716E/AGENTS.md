# Documentação de Engenharia de Agentes e Harness (P26-2B-1768-7598-7D8E-716E)

> **Requisito da Rubrica (25 pontos):** Uso obrigatório de no mínimo **3 agentes diferentes** (sendo obrigatoriamente **1 agente dedicado a teste e validação**), documentando em qual *harness* operaram e relacionando as *skills* na pasta `skills/`.

## 1. Ambiente de Orquestração (Harness Utilizado)

- **Harness Principal:** Claude (claude.ai) em modo agente, com ferramentas de sistema de arquivos, terminal Linux (Node.js 22), busca na web e Chrome headless (Playwright). Uma sessão orquestradora fez a primeira versão do projeto e depois criou **3 subagentes independentes** (instâncias separadas, cada uma com contexto próprio e escopo de escrita restrito).
- **Modelo(s) Base:** Claude Opus 5.5 (Anthropic), no orquestrador e nos 3 subagentes.
- **Estratégia de Coordenação:** Os agentes operaram de forma modular sobre a subpasta `P26-2B-1768-7598-7D8E-716E/`, compartilhando especificações de banco de dados D1, contratos JSON das Cloudflare Pages Functions e verificação automatizada via `validar-local.mjs` e `tests/teste-api.mjs`.
  1. **Rodada 1 (em paralelo):** o Agente 1 revisou e corrigiu o backend e o Agente 2 a interface. Cada um podia escrever **apenas** nos seus diretórios (`functions/`, `lib/`, `migrations/` × `public/`), e os contratos JSON ficaram congelados entre eles.
  2. **Auditoria independente:** o Agente 3 testou tudo do zero **sem ler os relatórios** dos outros agentes, só com permissão de escrita em `tests/`. Defeitos de produção foram reportados, e não corrigidos por ele.
  3. **Rodada 2:** o orquestrador devolveu cada defeito ao agente dono do código (backend → Agente 1, interface → Agente 2), e o Agente 3 fez o reteste de regressão.
- **Relatórios completos de cada agente:** [`docs/agentes/`](./docs/agentes/).

---

## 2. Agentes Criados e Responsabilidades (Mínimo de 3 Agentes)

### Agente 1: Arquiteto Serverless, Cloudflare D1 e Segurança Discord OAuth2
- **Papel:** Modelagem do esquema relacional SQLite no Cloudflare D1 (`migrations/`), implementação do fluxo de autenticação Discord OAuth2 e validação das regras de negócio no servidor (`functions/` e `lib/`).
- **Skill Utilizada:** [`skills/serverless-d1-discord/SKILL.md`](./skills/serverless-d1-discord/SKILL.md)
- **Escopo de escrita:** `functions/**`, `lib/**`, `migrations/**`.
- **Entregas Realizadas:**
  - Validação da frota no servidor (malha 10x10, sobreposição, composição) e matriz do oponente oculta: o tiro responde só "água", "acerto" ou "navio afundado".
  - Sessão em cookie `HttpOnly` assinado (HMAC-SHA256) e OAuth2 com `state` anti-CSRF. Queries sempre `prepare().bind()`.
  - **Rodada 1:** corrigiu condições de corrida reais:
    - derrota contada duas vezes num abandono concorrente;
    - duas partidas ativas criadas por dois "new" simultâneos, resolvido com o índice único parcial em `migrations/0003_partida_ativa_unica.sql`;
    - encerramento da partida e placar gravados fora de transação, agora num único `db.batch` com `changes() = 1`.
  - **Rodada 1:** criou `functions/api/_middleware.js`, que transforma exceções em JSON 500 sem detalhes internos, e limitou o corpo das requisições por bytes.
  - **Rodada 2 (defeito D1 do Agente 3):** todas as rotas respondem 405 em JSON com o cabeçalho `Allow` quando o método está errado. O `ensureSchema` ficou alinhado ao `CHECK` da migração.

### Agente 2: Especialista em Interface Web Vanilla (HTML5, CSS3 e DOM)
- **Papel:** Construção da interface responsiva e acessível utilizando exclusivamente HTML5 semântico, CSS3 moderno (sem sombras em fontes) e JavaScript puro (Vanilla JS), consumindo as rotas serverless via `fetch`.
- **Skill Utilizada:** [`skills/vanilla-dom-ui/SKILL.md`](./skills/vanilla-dom-ui/SKILL.md)
- **Escopo de escrita:** `public/**`.
- **Entregas Realizadas:**
  - Componentes visuais em `public/index.html`, `public/styles.css` e `public/app.js`: posicionamento horizontal/vertical com pré-visualização e combate com um `fetch` por bombardeio.
  - Inclusão do cabeçalho de perfil do Discord (`user_id`, nome e avatar) e rodapé oficial com a Chave Única `P26-2B-1768-7598-7D8E-716E`.
  - **Rodada 1:** corrigiu 10 problemas:
    - falha de rede travava o jogo;
    - o foco do teclado se perdia a cada tiro;
    - eram necessárias 200 paradas de Tab, agora resolvidas com um único ponto de Tab por malha e navegação por setas;
    - a seleção de navio tinha papel ARIA incorreto;
    - o avatar não tinha fallback;
    - apareciam telas em branco quando o D1 estava fora;
    - uma partida "fantasma" continuava após um 409;
    - "Desistir" não bloqueava novos disparos;
    - o contraste do navio já posicionado era baixo;
    - havia problemas de toque no celular.
  - **Rodada 2 (defeito D3 do Agente 3):** o ranking passou a truncar nomes longos com reticências, mantendo as colunas visíveis em 360–390px.

### Agente 3: Agente de Teste, Auditoria de Segurança e Validação (Obrigatório)
- **Papel:** Verificação independente de ponta a ponta: inspeção de contratos de API, tentativa de contorno das validações do servidor, auditoria da rubrica de 100 pontos e execução de testes funcionais.
- **Skill Utilizada:** [`skills/teste-validacao/SKILL.md`](./skills/teste-validacao/SKILL.md)
- **Escopo de escrita:** apenas `tests/**`. Ele não corrigiu código de produção, só reportou.
- **Metodologia:**
  - Executou as Functions no **runtime real da Cloudflare (workerd)** via `wrangler pages dev` com D1 local.
  - Rodou uma bateria adversária HTTP: cookies forjados, IDOR, 48 payloads hostis, SQL injection, rajadas concorrentes e varredura de vazamento em todas as respostas.
  - Testou a interface com Playwright: partida completa, celular 360/390px e contagem de requisições por clique.
  - Consultou a documentação oficial da Cloudflare sobre `db.batch`, índices parciais, `_middleware` e precedência de `onRequestVerb`.
- **Entregas Realizadas:**
  - `tests/teste-api.mjs` ampliado para **79 casos** (79 aprovados, 0 reprovados).
  - Bateria de ataque HTTP final: **115 OK, 0 falhas**. A frota inimiga não aparece em nenhuma resposta.
  - Defeitos encontrados:
    - **D1:** GET em rotas só-POST devolvia o HTML (corrigido pelo Agente 1).
    - **D2:** `database_id` de exemplo no `wrangler.jsonc` impede o binding (README corrigido; o ID real é gerado no deploy).
    - **D3:** ranking cortado no celular (corrigido pelo Agente 2).
    - **D4:** logout não revoga um token já copiado (risco aceito: a sessão expira em 7 dias).
  - **Riscos residuais documentados:**
    - `changes()` e `RETURNING` dentro de `db.batch` foram confirmados no D1 local (miniflare), mas não aparecem na documentação oficial. Por isso, depois do deploy, é preciso jogar uma partida até o fim e conferir `/api/placar`.
    - O `validar-local.mjs` oficial não estava disponível no ambiente dos agentes; os itens determinísticos foram reproduzidos manualmente.

---

## 3. Casos de Teste Documentados (`tests/teste-api.mjs`, 79 casos)

| Seção | Casos | O que cobre |
|---|---|---|
| 1. Regras do jogo | 12 | Limites 10x10, coordenadas negativas/não inteiras, sobreposição, navio repetido, orientação, 500 frotas aleatórias válidas, IA sem tiro repetido |
| 2. Sessão assinada | 4 | Payload adulterado, outro segredo, cookie antigo sem assinatura |
| 3. Endpoints + D1 | 26 | 401 sem sessão, 400 payload inválido, 403 IDOR, 404, 409 tiro repetido/após o fim, sem vazamento da frota inimiga, vitória e derrota atualizando o placar |
| 4. Discord OAuth2 | 4 | Sem credenciais, redirect com `state`, `state` inválido, callback completo gravando no D1 |
| 5. Rubrica | 5 | Sem frameworks, sem `text-shadow`, Chave Única no rodapé, MIT, queries parametrizadas |
| 6. Auditoria adversária (Agente 3) | 28 | Sessão expirada/malformada, payloads hostis, corridas concorrentes, placar sem contagem dupla, SQL injection, middleware, 405 em JSON com `Allow`, CHECK do esquema |

Para rodar (Node 22+), dentro desta pasta: `node tests/teste-api.mjs`.