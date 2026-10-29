# Autenticação da área da equipe — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exigir login (cadastro por e-mail com nome, sobrenome, senha e confirmação) para acessar `#/equipe/...`, mantendo a área do aluno aberta.

**Architecture:** Site estático no GitHub Pages; Supabase Auth (plano gratuito) acessado só por `src/auth.mjs`, que recebe o cliente por injeção para ser testável em Node. Validação e guarda de rota são funções puras em `src/domain/`. A restrição de e-mail é imposta no servidor por um trigger SQL em `auth.users`.

**Tech Stack:** JS ESM sem build, `node --test`, `@supabase/supabase-js` v2 por CDN, SQL (Postgres do Supabase).

**Spec:** `docs/superpowers/specs/2026-10-29-acesso-equipe-design.md`

## Global Constraints

- Textos de interface em português do Brasil, claros, no tom das telas existentes.
- Sem dependências npm e sem etapa de build; o Supabase vem de CDN com versão exata fixada (a mais recente 2.x conferida no momento da implementação), nunca `latest`.
- Só a URL do projeto e a chave **anon** entram no repositório. Chave `service_role` nunca.
- Domínio permitido: `uniguacu.com.br`. Os e-mails de exceção **não** são versionados: ficam na tabela `acessos_extras`, preenchida pelo usuário no painel.
- A área do aluno permanece sem login. Dados do protótipo continuam em memória e fictícios.
- Senha: mínimo 8 caracteres; confirmação igual à senha. Confirmação de e-mail obrigatória (configuração do painel).
- Erros de formulário seguem o padrão existente: `DomainError(field, message)`, `showError`, dados digitados preservados.
- `AGENTS.md` está no `.gitignore`: atualizar localmente, **não** commitar.

## Review Focus

- E-mail digitado com espaços ou maiúsculas (`"  Ana@UniGuacu.com.br "`) é normalizado (trim + minúsculas) antes de validar e enviar.
- E-mail fora do domínio mas permitido pelo servidor (Gmail de exceção) **não** pode ser barrado pela validação do cliente.
- Destino pós-login (`next`) só aceita rotas que começam com `#/equipe`; `https://…`, `//…` ou `#/aluno` caem no padrão `#/equipe/resumo` (evita redirecionamento aberto).
- Enquanto a sessão ainda está sendo carregada na abertura da página, a área da equipe não aparece nem redireciona prematuramente.
- Falha ao carregar o Supabase (CDN fora do ar, sem rede): mensagem clara no login e a área da equipe continua bloqueada.
- Senha com espaços nas pontas não é alterada (`trim` só no e-mail e nos nomes).
- Duplo clique em "Criar conta" não envia duas requisições.
- Sair estando em `#/equipe/...` leva ao login, sem deixar conteúdo da equipe na tela.

---

### Task 1: Validação de cadastro e login

**Files:**
- Create: `src/domain/auth-validation.mjs`
- Test: `tests/auth-validation.test.mjs`

**Interfaces:**
- Consumes: `DomainError`, `requiredText` de `src/domain/validation.mjs`.
- Produces:
  - `validateSignUp({nome, sobrenome, email, senha, confirmacao}) -> {nome, sobrenome, email, senha}` (nome/sobrenome com trim, e-mail com trim + minúsculas, senha intacta); lança `DomainError` com `field` em `nome|sobrenome|email|senha|confirmacao`.
  - `validateSignIn({email, senha}) -> {email, senha}`; lança `DomainError` com `field` em `email|senha`.

- [ ] **Step 1: Write the failing tests** em `tests/auth-validation.test.mjs`, uma por linha, com estas asserções:
  - dados válidos retornam e-mail normalizado: entrada `'  Ana@UniGuacu.com.br '` → `'ana@uniguacu.com.br'`; nome `' Ana '` → `'Ana'`.
  - e-mail `gmail.com` **é aceito** (`herosdefreitas@gmail.com` passa).
  - campos vazios lançam `DomainError` com `field` `nome`, `sobrenome`, `email`, `senha` (um teste por campo; mensagem `'Preencha este campo.'`).
  - e-mail `'sem-arroba'` e `'a@b'` lançam `field==='email'`, mensagem `'Informe um e-mail válido.'`.
  - senha `'1234567'` lança `field==='senha'`, mensagem `'A senha precisa ter pelo menos 8 caracteres.'`; `'12345678'` passa.
  - `confirmacao` diferente lança `field==='confirmacao'`, mensagem `'As senhas não coincidem.'`.
  - senha `' abcdefg '` (espaços nas pontas) volta idêntica, sem trim.
  - `validateSignIn` exige e-mail válido e senha não vazia; normaliza o e-mail.
- [ ] **Step 2:** `npm test -- tests/auth-validation.test.mjs` → FAIL (módulo inexistente).
- [ ] **Step 3: Implement** as duas funções reutilizando `requiredText`; e-mail válido = regex simples `^[^\s@]+@[^\s@]+\.[^\s@]+$` após normalizar.
- [ ] **Step 4:** `npm test` → todos PASS.
- [ ] **Step 5: Commit** `feat: validate sign-up and sign-in input`

---

### Task 2: Guarda de rota

**Files:**
- Create: `src/domain/access.mjs`
- Test: `tests/access.test.mjs`

**Interfaces:**
- Produces:
  - `guardRoute({path, session, loading}) -> {action:'allow'} | {action:'wait'} | {action:'redirect', to:string}`. `path` é o array de segmentos (`['equipe','resumo']`), `session` é `null` ou objeto, `loading` é booleano.
  - `safeNext(value) -> string`: devolve `value` só se começar com `#/equipe`, senão `'#/equipe/resumo'`.
  - `loginUrl(nextHash) -> string`: `'#/entrar?next=' + encodeURIComponent(safeNext(nextHash))`.

- [ ] **Step 1: Write the failing tests:**
  - `path[0]==='aluno'` e `path[0]==='entrar'` → `allow` com ou sem sessão.
  - `path[0]==='equipe'`, sem sessão, `loading:false` → `redirect` com `to` igual a `loginUrl('#/equipe/<resto da rota>')`; com sessão → `allow`.
  - `path[0]==='equipe'` com `loading:true` → `wait` (nunca `allow` nem `redirect`).
  - `safeNext('#/equipe/solicitacoes')` mantém; `safeNext('https://evil.com')`, `safeNext('//evil.com')`, `safeNext('#/aluno/catalogo')`, `safeNext('')`, `safeNext(undefined)` → `'#/equipe/resumo'`.
- [ ] **Step 2:** rodar o teste → FAIL.
- [ ] **Step 3: Implement** as três funções puras.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: add team route guard`

---

### Task 3: Módulo de autenticação (Supabase injetado)

**Files:**
- Create: `src/auth.mjs`, `src/config.mjs`
- Test: `tests/auth.test.mjs`

**Interfaces:**
- Consumes: `validateSignUp`, `validateSignIn` (Task 1), `DomainError`.
- Produces:
  - `createAuth(loadClient: () => Promise<SupabaseClient>) -> {signUp, signIn, signOut, getSession, onChange}`; o cliente é carregado de forma preguiçosa e uma única vez.
  - `signUp(input) -> Promise<{needsConfirmation:true}>`: valida, chama `client.auth.signUp({email, password, options:{data:{nome, sobrenome}, emailRedirectTo}})`. `emailRedirectTo` vem de uma opção `redirectTo` de `createAuth(loadClient, {redirectTo})`.
  - `signIn(input) -> Promise<Session>`; `signOut() -> Promise<void>`; `getSession() -> Promise<Session|null>`; `onChange(cb) -> unsubscribe`, com `cb(session|null)`.
  - `Session` = `{email, nome, sobrenome}` derivado de `user` e `user_metadata`.
  - `defaultLoadClient()` (exportada, não testada em Node): `import()` dinâmico do `@supabase/supabase-js` pelo CDN fixado e `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` de `config.mjs`.
  - `config.mjs` exporta `SUPABASE_URL` e `SUPABASE_ANON_KEY` com marcadores `'COLE_AQUI'`; `createAuth` falha com `DomainError('config', 'O acesso da equipe ainda não foi configurado.')` quando algum ainda for o marcador.
- Mapeamento de erros (todos como `DomainError`, `field:'form'`), com estes textos exatos:
  - signUp rejeitado pelo trigger (erro com `status===500` ou mensagem contendo `Database error`) → `'Este e-mail não tem permissão para acessar a área da equipe. Use o e-mail institucional.'`
  - signIn `Invalid login credentials` → `'E-mail ou senha incorretos.'`
  - signIn `Email not confirmed` → `'Confirme seu e-mail pelo link que enviamos antes de entrar.'`
  - falha ao carregar o cliente → `'Não foi possível conectar ao serviço de acesso. Verifique sua conexão e tente novamente.'`
  - qualquer outro → `'Não foi possível concluir. Tente novamente.'`

- [ ] **Step 1: Write the failing tests** com um cliente falso (objeto com `auth.signUp/signInWithPassword/signOut/getSession/onAuthStateChange` registrando chamadas):
  - `signUp` válido chama o cliente com e-mail normalizado, `data:{nome,sobrenome}` e `emailRedirectTo`; resolve `{needsConfirmation:true}`.
  - `signUp` inválido lança `DomainError` e **não** chama o cliente.
  - e-mail Gmail passa para o cliente (exceções são decididas pelo servidor).
  - erro `{status:500, message:'Database error saving new user'}` vira a mensagem de e-mail sem permissão.
  - os dois erros de `signIn` e o erro genérico viram as mensagens acima.
  - `getSession` sem sessão → `null`; com sessão → `{email, nome, sobrenome}`.
  - `loadClient` que rejeita → mensagem de conexão; `loadClient` é chamado uma só vez em duas operações.
  - chaves ainda `'COLE_AQUI'` → erro de configuração (testar com `createAuth(loadClient,{redirectTo, config:{url:'COLE_AQUI', key:'COLE_AQUI'}})`; o padrão da opção `config` é o de `config.mjs`).
  - segundo envio de `signUp` enquanto o primeiro está pendente não dispara nova chamada ao cliente (devolve a mesma promessa).
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: Implement** `src/auth.mjs` e `src/config.mjs`. Fixar a versão exata do CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@<versão>/+esm`) conferindo a última 2.x no momento.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: add Supabase auth module`

---

### Task 4: Tela de login/cadastro e integração

**Files:**
- Create: `src/ui/login.mjs`
- Modify: `src/main.mjs` (sessão, guarda, cabeçalho, rodapé, rota `entrar`), `scripts/serve.mjs` (rotas novas), `src/styles.css` (abas e estados, reaproveitando classes existentes), `tests/server.test.mjs`
- Test: `tests/server.test.mjs`

**Interfaces:**
- Consumes: `createAuth`/`defaultLoadClient` (Task 3), `guardRoute`/`safeNext`/`loginUrl` (Task 2), `field`, `showError`, `errorSummary`, `heading`, `notice` de `src/ui/dom.mjs`.
- Produces: `renderLogin({route, auth, navigate}) -> HTMLElement` com abas "Entrar" e "Criar conta" (escolhidas por `?aba=cadastro`), formulários com os campos `email`, `senha` e, no cadastro, `nome`, `sobrenome`, `confirmacao`; botão desabilitado durante o envio.

- [ ] **Step 1: Write the failing test:** em `tests/server.test.mjs`, `GET` de `/src/auth.mjs`, `/src/config.mjs`, `/src/domain/access.mjs`, `/src/domain/auth-validation.mjs`, `/src/ui/login.mjs` → status 200 e `text/javascript`; `/supabase/setup.sql` → 404.
- [ ] **Step 2:** rodar → FAIL (404 nas rotas novas).
- [ ] **Step 3: Implement.** Adicionar os módulos à lista de `scripts/serve.mjs`.
- [ ] **Step 4: Implement `src/ui/login.mjs`.** Cadastro bem-sucedido troca o formulário por `notice('Enviamos um link de confirmação para seu e-mail. Confirme para entrar.')`; login bem-sucedido navega para `safeNext(route.params.get('next'))`; erros pelo `showError`, preservando os campos.
- [ ] **Step 5: Modify `src/main.mjs`.**
  - `let session=null, loading=true`; `auth.getSession()` na abertura resolve `loading` e chama `render()`; `auth.onChange` atualiza `session` e chama `render()`.
  - `redirectTo` de `createAuth` = `location.origin + location.pathname` (funciona sob o subcaminho do GitHub Pages).
  - No início de `render`, aplicar `guardRoute`: `wait` mostra um estado "Verificando acesso…" no lugar do conteúdo; `redirect` faz `location.replace(to)`; rota `entrar` renderiza `renderLogin`.
  - Se a sessão existir e a rota for `entrar`, redirecionar para `safeNext(next)`.
  - Cabeçalho da equipe: nome e sobrenome da sessão no avatar e botão "Sair" (`auth.signOut()` e depois `#/aluno/catalogo`). O seletor de área: escolher "Área da equipe" sem sessão passa pelo guarda e cai no login.
  - Rodapé: substituir "Demonstração sem autenticação. A seleção de área ou pessoa não protege dados." por "Somente a área da equipe exige login. Os dados desta demonstração são fictícios e a seleção de pessoa do aluno não protege dados."
- [ ] **Step 6:** `npm test` e `npm run check` → PASS. Subir `npm start` e conferir no navegador (com `config.mjs` ainda com marcadores) que: `#/equipe/resumo` redireciona para `#/entrar?next=…`; a tela de login mostra o erro de configuração sem quebrar; a área do aluno abre normalmente.
- [ ] **Step 7: Commit** `feat: require login for the team area`

---

### Task 5: Servidor (SQL), configuração e documentos

**Files:**
- Create: `supabase/setup.sql`, `supabase/LEIAME.md`
- Modify: `docs/superpowers/specs/2026-10-29-acesso-equipe-design.md`, `docs/superpowers/specs/2026-09-23-unistock-prototipo-design.md` (nota), `AGENTS.md` (local, não commitar)

**Interfaces:**
- Consumes: nada de tarefas anteriores. Produz o que o usuário executa no painel.

- [ ] **Step 1: Write `supabase/setup.sql`** (idempotente):
  - `create table if not exists public.acessos_extras (email text primary key)` com `alter table … enable row level security` e sem políticas.
  - Função `public.validar_email_permitido()` (`security definer`, `set search_path = ''`) que, `before insert on auth.users`, compara `lower(new.email)` com o sufixo `@uniguacu.com.br` ou com `public.acessos_extras`; se não bater, `raise exception 'email_nao_permitido'`.
  - `drop trigger if exists` + `create trigger` ligando a função a `auth.users`.
  - Comentário no topo: não contém e-mails reais; ver `LEIAME.md`.
- [ ] **Step 2: Write `supabase/LEIAME.md`** em português com os passos do usuário, na ordem:
  1. criar projeto gratuito em supabase.com;
  2. SQL Editor → colar e executar `setup.sql`;
  3. inserir as exceções com `insert into public.acessos_extras values ('EMAIL_1'), ('EMAIL_2');` (marcadores, nunca endereços reais no arquivo);
  4. Authentication → Providers → Email → ligar "Confirm email";
  5. Authentication → URL Configuration → *Site URL* e *Redirect URLs* com a URL publicada no GitHub Pages (e `http://127.0.0.1:4173` para testes locais);
  6. Project Settings → API → copiar *Project URL* e a chave *anon public* para `src/config.mjs`; avisar que `service_role` nunca vai para o código;
  7. checklist manual: cadastro com e-mail permitido (recebe link; só entra após confirmar), com e-mail bloqueado (mensagem de sem permissão), login, logout, acesso direto a `#/equipe/resumo` sem sessão;
  8. observação: contas criadas antes do trigger não são revisadas; o envio de e-mails do plano gratuito tem limite baixo por hora.
- [ ] **Step 3: Corrigir a spec** (`2026-10-29-acesso-equipe-design.md`): em "Telas e fluxo" e "Testes", deixar explícito que a validação do cliente confere só o formato do e-mail e que a decisão de domínio/exceção é do servidor, cuja rejeição aparece como "Este e-mail não tem permissão…". Acrescentar nota no topo da spec do protótipo: "A premissa 'sem autenticação' vale agora só para a área do aluno; ver 2026-10-29-acesso-equipe-design.md."
- [ ] **Step 4: Atualizar `AGENTS.md` localmente:** trocar "Não há definição de … autenticação" por: a área da equipe exige login por e-mail via Supabase Auth, restrito ao domínio institucional e a exceções no servidor; papéis detalhados, aprovação e revogação continuam pendentes. Não adicionar ao git (arquivo ignorado).
- [ ] **Step 5:** `git status` não mostra e-mails reais nem `AGENTS.md`; `grep -ri "gmail" . --exclude-dir=.git --exclude-dir=node_modules` não encontra endereços no repositório versionado.
- [ ] **Step 6: Commit** `docs: add Supabase setup for team authentication`

---

## Self-review

- **Cobertura da spec:** cadastro/validação (T1), guarda e `next` (T2), módulo, mensagens e carga preguiçosa (T3), telas, cabeçalho, rodapé, rotas do servidor (T4), trigger, tabela de exceções, passos do painel, docs coerentes (T5). "Esqueci a senha", papéis e SMTP ficam fora, como na spec.
- **Ponto ajustado em relação à spec:** a validação do cliente não checa domínio (senão barraria as duas exceções); T5 corrige o texto da spec.
- **Consistência de tipos:** `Session={email,nome,sobrenome}`, `guardRoute` devolve `allow|wait|redirect`, `loginUrl`/`safeNext` usados com os mesmos nomes em T2 e T4.
- **Limite de verificação:** o fluxo real (e-mail de confirmação, trigger) só pode ser conferido com o projeto Supabase do usuário; T4 verifica só o comportamento sem configuração.
