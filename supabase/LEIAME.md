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
   - O login libera a leitura e a gravação dos dados da equipe no servidor (ver "Dados do acervo e dos empréstimos" abaixo).
   - O gatilho também vale quando alguém já cadastrado troca de e-mail.
   - Contas criadas antes do gatilho (trigger) não são revisadas por ele; a regra vale só para novos cadastros.
   - O envio de e-mails do plano gratuito tem limite baixo por hora e serve só para teste. Muitos cadastros seguidos podem esbarrar nesse limite.

## Dados do acervo e dos empréstimos

Materiais, solicitações, confirmações, retiradas, devoluções e saídas de brindes ficam salvos no Supabase. Faça uma vez, depois de `setup.sql`:

1. No **SQL Editor**, cole e execute `supabase/dados.sql` (tabelas, regras de acesso e funções). Pode ser executado de novo sem problema, por exemplo depois de uma atualização do sistema.
2. Ainda no **SQL Editor**, cole e execute `supabase/carga_inicial.sql` (acervo levantado em `docs/lista_materiais.md`). Se for executado de novo, materiais já cadastrados são ignorados, então os saldos alterados pelo uso não voltam ao valor inicial.
3. Abra o site, confira o catálogo e, na área da equipe, as telas **Materiais** e **Brindes**.

Para mudar a carga inicial, edite `scripts/inventario-inicial.mjs` e rode `npm run carga` para gerar o SQL de novo. Essa mudança só vale para materiais ainda não cadastrados; depois que o sistema está em uso, cadastre novos materiais pela tela **Materiais → Cadastrar material**.

Quem pode fazer o quê:

| Quem | Pode |
| --- | --- |
| Qualquer pessoa (sem login) | Ver o catálogo (sem os brindes), enviar solicitação e acompanhar as solicitações enviadas do próprio navegador. |
| Equipe (com login) | Ver tudo, cadastrar materiais, confirmar solicitações, registrar retiradas, devoluções e saídas de brindes. |

Todas as gravações passam por funções no servidor, que validam as regras de novo e impedem saldo negativo mesmo quando duas pessoas registram ao mesmo tempo. Nenhum papel da API grava direto nas tabelas.

Limites conhecidos:

- O aluno não tem login. "Minhas solicitações" mostra os pedidos enviados daquele navegador; em outro aparelho, ou se os dados do site forem apagados, eles não aparecem (o protocolo continua válido para a equipe).
- Como o envio de solicitação é aberto, alguém pode enviar pedidos falsos. A equipe confere cada pedido antes de confirmar.
- Qualquer conta da equipe tem as mesmas permissões (não há papéis).
- Ajuste de saldo, reposição, correção de cadastro e liberação de itens "aguardando avaliação" ainda não existem na tela. Até lá, só pelo painel do Supabase, com cuidado para manter `movimentos` e `unidades` coerentes.
