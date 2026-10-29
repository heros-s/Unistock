# Unistock — autenticação da área da equipe

Status: desenho aprovado pelo usuário na conversa de 2026-10-29. Complementa o [desenho do protótipo](2026-09-23-unistock-prototipo-design.md), cuja premissa "sem autenticação" passa a valer apenas para a área do aluno.

## Objetivo e sucesso

Exigir login para acessar a área da equipe ("lado do professor"). Cadastro por e-mail com nome, sobrenome, e-mail, senha e confirmação de senha. A área do aluno permanece aberta.

Sucesso: sem sessão válida, nenhuma rota `#/equipe/...` é exibida; só e-mails permitidos conseguem criar conta; o fluxo cadastro → confirmação de e-mail → login → logout funciona de ponta a ponta no site publicado.

## Decisões

- **Hospedagem:** GitHub Pages (estático, sem build). Servidor Node próprio não existe em produção.
- **Provedor:** Supabase Auth, plano gratuito. Conta e projeto criados pelo usuário; nenhuma credencial secreta entra no repositório.
- **Quem pode se cadastrar:** e-mails do domínio `uniguacu.com.br` e uma lista de exceções pontuais (dois endereços iniciais informados pelo usuário).
- **Confirmação de e-mail:** obrigatória ("Confirm email" ligado no Supabase).
- **Papéis:** um único perfil de acesso à equipe. Papéis detalhados, aprovação e remoção de acessos seguem indefinidos (AGENTS.md).

## Arquitetura

- `src/auth.mjs`: único módulo que conhece o Supabase. Interface: `signUp({nome, sobrenome, email, senha})`, `signIn(email, senha)`, `signOut()`, `getSession()`, `onChange(callback)`. Carrega `@supabase/supabase-js` como módulo ESM por CDN.
- `src/config.mjs`: URL do projeto e chave anônima (pública por design; a segurança vem do servidor).
- `src/domain/auth-validation.mjs`: validações puras (campos obrigatórios, formato do e-mail, domínio, senha com no mínimo 8 caracteres, confirmação igual à senha), reutilizando `DomainError`.
- Guarda de rota em `src/main.mjs`: rota `#/equipe/...` sem sessão redireciona para `#/entrar`, guardando o destino para voltar após o login.
- `scripts/serve.mjs`: incluir os módulos novos na lista de rotas.
- Dados de demonstração continuam em memória. Quando forem para o banco, a Row Level Security usará esta autenticação.

## Restrição de acesso no servidor

A validação de domínio na tela só dá mensagem clara e pode ser contornada. A proteção real é `supabase/setup.sql`, executado pelo usuário no SQL Editor:

1. Tabela `public.acessos_extras (email text primary key)` com RLS ligada e nenhuma política (inacessível pela chave anônima).
2. Função e trigger `before insert` em `auth.users` que rejeitam o cadastro quando o e-mail, em minúsculas, não termina em `@uniguacu.com.br` e não está em `acessos_extras`.

Os e-mails de exceção **não são versionados**: o usuário os insere pelo painel (`insert into public.acessos_extras values ('...')`), pois o repositório é hospedado no GitHub. O README do script traz o comando com marcadores no lugar dos endereços.

Observação: o Supabase só aplica a regra a novos cadastros; contas criadas antes do trigger não são revisadas.

## Telas e fluxo

- `#/entrar`: abas "Entrar" e "Criar conta", em português, com o padrão de formulário existente (mensagem junto ao campo, resumo de erros, dados digitados preservados).
- Cadastro: nome, sobrenome (guardados em `user_metadata`), e-mail, senha, confirmar senha.
- Após o cadastro: "Enviamos um link de confirmação para seu e-mail. Confirme para entrar." Sem sessão até a confirmação.
- E-mail não permitido: mensagem "Este e-mail não tem permissão para acessar a área da equipe. Use o e-mail institucional." (o servidor também rejeita).
- Credenciais inválidas ou e-mail não confirmado: mensagens distintas e sem revelar se o e-mail existe.
- Cabeçalho da equipe: nome da pessoa e botão "Sair". O seletor "Alternar área" leva ao login quando não houver sessão.
- Rodapé: trocar "Demonstração sem autenticação…" por texto que diga que só a área da equipe exige login e que os dados do protótipo continuam fictícios.

## Fora do escopo

- "Esqueci a senha" (não confirmado pelo usuário; pequeno de acrescentar depois).
- Papéis, aprovação e revogação de acessos.
- SMTP próprio: o envio padrão do Supabase gratuito tem limite baixo de e-mails por hora e serve só para teste.
- Proteção dos dados do protótipo: continuam em memória e no código servido, portanto não são confidenciais.

## Testes

- Unitários: validação (campos vazios, e-mail inválido, domínio, e-mail de exceção tratado pelo servidor e não pelo cliente, senha curta, confirmação diferente) e guarda de rota, com `auth` substituído por um duplo.
- `tests/server.test.mjs` atualizado para as novas rotas.
- Manual, com o projeto Supabase do usuário: cadastro com e-mail permitido e bloqueado, confirmação, login, logout, acesso direto a `#/equipe/resumo` sem sessão.

## Documentos a manter coerentes

AGENTS.md (remover "sem autenticação" como limite, registrar a regra de acesso da equipe e a pendência de papéis) e a spec do protótipo (nota apontando para este documento).
