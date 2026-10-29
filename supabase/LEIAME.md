# Configuração do Supabase para a área da equipe

Estes passos criam o servidor de login da área da equipe. Quem faz é a pessoa responsável pelo projeto, no painel do Supabase. Nenhum e-mail real fica neste repositório, porque ele é hospedado no GitHub.

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor**, cole o conteúdo de `supabase/setup.sql` e execute. O script pode ser executado de novo sem problema.
3. Ainda no SQL Editor, insira os e-mails de exceção (quem não tem e-mail `@uniguacu.com.br` mas precisa de acesso). Troque `EMAIL_1` e `EMAIL_2` pelos endereços reais, em minúsculas, **somente no painel**, nunca em arquivos do projeto:

   ```sql
   insert into public.acessos_extras values ('EMAIL_1'), ('EMAIL_2');
   ```

4. Abra **Authentication → Providers → Email** e ligue **Confirm email**.
5. Abra **Authentication → URL Configuration** e preencha **Site URL** e **Redirect URLs** com a URL publicada no GitHub Pages, por exemplo `https://SEU-USUARIO.github.io/Unistock/` (troque pela URL real publicada). Acrescente também `http://127.0.0.1:4173` para testes locais (`npm start`).
6. Abra **Project Settings → API** e copie o **Project URL** e a chave **anon public** para `src/config.mjs` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`). A chave `service_role` **nunca** vai para o código nem para o repositório.
   Aviso: depois de preencher `src/config.mjs`, o comando `npm test` pode mostrar falha em um teste ("config padrão" em `tests/auth.test.mjs`), que espera os valores `COLE_AQUI`, até ele ser atualizado.
7. Checklist manual (no site publicado ou em `http://127.0.0.1:4173`):
   - Cadastro com e-mail permitido: a tela avisa que o link de confirmação foi enviado; a pessoa só consegue entrar depois de confirmar pelo e-mail.
   - Cadastro com e-mail bloqueado: aparece "Este e-mail não tem permissão para acessar a área da equipe. Use o e-mail institucional."
   - Login com e-mail e senha confirmados.
   - Logout pelo botão "Sair".
   - Acesso direto a `#/equipe/resumo` sem sessão: deve levar a `#/entrar`.
8. Observações:
   - Contas criadas antes do gatilho (trigger) não são revisadas por ele; a regra vale só para novos cadastros.
   - O envio de e-mails do plano gratuito tem limite baixo por hora e serve só para teste. Muitos cadastros seguidos podem esbarrar nesse limite.
