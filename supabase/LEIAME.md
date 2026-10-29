# Configuração do Supabase para a área da equipe

Estes passos criam o servidor de login da área da equipe. Quem faz é a pessoa responsável pelo projeto, no painel do Supabase. Nenhum e-mail real fica neste repositório, porque ele é hospedado no GitHub.

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor**, cole o conteúdo de `supabase/setup.sql` e execute. O script pode ser executado de novo sem problema.
3. Ainda no SQL Editor, insira os e-mails de exceção (quem não tem e-mail `@uniguacu.com.br` mas precisa de acesso). Troque `EMAIL_1` e `EMAIL_2` pelos endereços reais **somente no painel**, nunca em arquivos do projeto:

   ```sql
   insert into public.acessos_extras values (lower('EMAIL_1')), (lower('EMAIL_2')) on conflict do nothing;
   ```

4. Abra **Authentication → Providers → Email** e ligue **Confirm email**. Não pule este passo: sem a confirmação por e-mail não há verificação de que a pessoa é dona do endereço, e qualquer um poderia se cadastrar com um e-mail institucional que não possui. O código recusa o cadastro quando o Supabase devolve sessão imediata, mas a configuração correta é ligar a confirmação.
5. Abra **Authentication → URL Configuration** e preencha **Site URL** e **Redirect URLs** com a URL publicada no GitHub Pages, por exemplo `https://SEU-USUARIO.github.io/Unistock/` (troque pela URL real publicada). Em **Redirect URLs**, liste `http://127.0.0.1:4173/**` (testes locais com `npm start`) e `https://SEU-USUARIO.github.io/Unistock/**` (troque pela URL real). O `/**` no fim faz o endereço com barra final coincidir.
6. Abra **Project Settings → API** e copie o **Project URL** e a chave **anon public** para `src/config.mjs` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`). A chave `service_role` **nunca** vai para o código nem para o repositório.
7. Checklist manual (no site publicado ou em `http://127.0.0.1:4173`):
   - Cadastro com e-mail permitido: a tela avisa que o link de confirmação foi enviado; a pessoa só consegue entrar depois de confirmar pelo e-mail.
   - Cadastro com e-mail bloqueado: aparece "Este e-mail não tem permissão para acessar a área da equipe. Use o e-mail institucional."
   - Abrir o link de confirmação recebido por e-mail: a pessoa deve cair na área da equipe (`#/equipe/resumo`), já com a sessão iniciada.
   - Abrir de novo um link de confirmação já usado (ou expirado): deve aparecer, na tela de entrar, o aviso "O link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha ou crie a conta novamente."
   - Login com e-mail e senha confirmados.
   - Logout pelo botão "Sair".
   - Acesso direto a `#/equipe/resumo` sem sessão: deve levar a `#/entrar`.
8. Observações:
   - Limite honesto: o login apenas esconde as telas da equipe. Ele não protege dados, porque o código da equipe e os dados de demonstração são públicos e ficam por navegador.
   - O gatilho também vale quando alguém já cadastrado troca de e-mail.
   - Contas criadas antes do gatilho (trigger) não são revisadas por ele; a regra vale só para novos cadastros.
   - O envio de e-mails do plano gratuito tem limite baixo por hora e serve só para teste. Muitos cadastros seguidos podem esbarrar nesse limite.
