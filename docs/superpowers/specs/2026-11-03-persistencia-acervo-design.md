# Unistock — persistência do acervo e dos empréstimos

Status: decisões tomadas pelo usuário em 2026-11-03. Substitui a premissa "dados em memória" do [desenho do protótipo](2026-09-23-unistock-prototipo-design.md) e usa o login do [acesso da equipe](2026-10-29-acesso-equipe-design.md).

## Decisões

- **Onde:** Supabase (mesmo projeto do login). Tabelas, RLS e funções em `supabase/dados.sql`; acervo inicial em `supabase/carga_inicial.sql`.
- **Aluno:** continua sem login. "Minhas solicitações" lista os ids guardados no `localStorage` do navegador que enviou o pedido; o servidor só devolve solicitações cujo id (UUID) o navegador apresenta. Saem as pessoas fictícias e o botão "Reiniciar demonstração".
- **Brindes:** nova categoria `gift`, só para a equipe. Não aparecem no catálogo do aluno (bloqueado também no RLS). A equipe registra a saída direto (brinde, quantidade, para quem, responsável, data), sem solicitação e sem devolução.
- **Equipamentos:** o código de cada unidade é o número de patrimônio (letras, números e hífen), não mais `DEMO-…`.
- **Medidas:** unidade, caixa, pacote, rolo, kit, folha.

## Arquitetura

- `src/domain/*` continua puro e valida cada ação antes de enviar (mensagem imediata junto ao campo).
- `src/data.mjs` lê as tabelas (paginando de 1000 em 1000) e chama uma função `rpc` por ação. Erros de regra voltam com `errcode P0001`, mensagem em português e o campo no `hint`.
- `src/store.mjs` é assíncrono: valida → grava → recarrega o estado oficial.
- As funções do servidor repetem as regras e bloqueiam a linha do material (`for update`), então duas retiradas simultâneas do último item não deixam saldo negativo. Nenhum papel da API escreve direto nas tabelas.
- Ao navegar, a tela usa o estado carregado e busca a versão atual em segundo plano; não redesenha sobre formulário aberto.

## Classificação da lista (`docs/lista_materiais.md`)

Fonte: `scripts/inventario-inicial.mjs`. Critérios e casos duvidosos:

- **Equipamentos (devolve, com patrimônio):** projetores 11533, 11706, 11627; computadores 1145 e 9501–9510; caixa de som 9547.
- **Reutilizáveis (devolve):** apresentador sem fio, apagadores (com e sem marcadores), perfurador, calculadora, pistola de cola quente e **marcadores de quadro branco**. Os marcadores ficaram como devolvíveis porque a lista traz reabastecedores, o que indica que são recarregados e reaproveitados. Os reabastecedores são consumo.
- **Consumo (descartável):** canetas, post-it, grampos, balões, papéis (A4, coloridos, fotográfico), bastões de cola quente, fitas, lápis de cor, massinha, EVA.
- **Brindes:** todos os itens abaixo de "Brinde" na lista. Ajustes de nome: "garrafas terminar" → "Garrafa térmica"; "lixos de carro" → "Lixeira de carro"; "pacotes de vinho" mantido como "Pacote de vinho" (confirmar o que é).

## Fora do escopo

Ajuste de saldo, reposição, edição de cadastro, liberação de itens "aguardando avaliação", papéis na equipe e login de aluno.
