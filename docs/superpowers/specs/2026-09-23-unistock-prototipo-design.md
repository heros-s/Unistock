# Unistock — desenho do protótipo das duas áreas

Status: desenho aprovado pelo usuário nesta conversa, após revisão da proposta. As decisões abaixo orientam o protótipo; não constituem políticas institucionais para uma versão operacional.

## Objetivo e limites

Criar um protótipo navegável em português para validar como o aluno consulta e solicita materiais e como a equipe confirma pedidos, registra retiradas e recebe devoluções. O sucesso será conseguir percorrer essa jornada com dados demonstrativos, compreender a próxima ação e perceber quando a disponibilidade muda.

Referências: [guia dos alunos](../../../guia_emprestimo_materiais.md), [briefing operacional](../../../briefing_controle_materiais.md) e [contexto do projeto](../../../AGENTS.md).

O repositório ainda não possui aplicação ou tecnologia estabelecida. O protótipo não terá autenticação, servidor, integração externa nem inventário real. Não será adequado à operação simultânea por funcionários. A arquitetura de produção precisará garantir autorização e consistência transacional.

## Estrutura e navegação

Um único site terá as experiências “Área do aluno” e “Área da equipe”. Um seletor identificado como “Alternar área — demonstração” permitirá avaliá-las; ele não representa controle de acesso.

O catálogo será a entrada inicial. Uma faixa discreta e persistente indicará “Protótipo · dados demonstrativos”. O aluno terá navegação para Catálogo, Minhas solicitações e Como funciona. A equipe terá Visão geral, Solicitações, Retiradas e devoluções e Materiais.

Em telas grandes, a área da equipe usará navegação lateral. No celular, haverá menu compacto, conteúdo em coluna e ações acessíveis sem rolagem horizontal da página. A navegação indicará a área e a tela atuais.

## Direção visual proposta

- Identidade textual “Unistock”, sem inventar logotipo ou identidade oficial da faculdade.
- Fundo claro, superfícies brancas, texto escuro e azul como cor principal de ações e navegação.
- Verde para conclusões, âmbar para pendências e vermelho para erros, sempre acompanhados de texto.
- Catálogo com cartões, ícones por categoria, disponibilidade e indicação “Exige devolução” ou “Sem devolução”. Não depender de fotografias para identificar materiais.
- Painel da equipe com resumo compacto e listas operacionais; as ações do atendimento terão mais destaque que os indicadores.
- Tipografia do sistema, espaçamento confortável, rótulos explícitos e foco de teclado visível.

Essa direção foi aprovada para a primeira versão do protótipo e poderá ser refinada após sua avaliação visual.

## Área do aluno

### Catálogo e detalhes

Busca por nome e filtros visíveis para Equipamentos, Materiais reutilizáveis e Materiais de consumo. Cada item mostrará nome, categoria, unidade de medida e disponibilidade atual da demonstração.

Nos detalhes, explicar o tratamento da categoria e exibir o botão “Solicitar material”. Para saldo zero, mostrar “Indisponível no momento”, sem permitir concluir nova solicitação no protótipo. Não criar fila de espera ou promessa de reserva.

### Solicitação

Um pedido conterá um material para manter a primeira validação simples. O formulário solicitará nome, turma/curso, quantidade e finalidade. A quantidade respeitará a unidade cadastrada; os materiais demonstrativos usarão unidades inteiras, como unidade e caixa.

Os campos obrigatórios serão validados, com mensagem junto ao campo e preservação dos dados digitados. A quantidade deverá ser positiva e não superar a disponibilidade exibida no envio. Essa checagem não constitui reserva nem garante disponibilidade futura.

Após o envio, exibir protocolo fictício, resumo e “Solicitação enviada. Aguarde a confirmação antes de retirar o material”. O pedido aparecerá na área da equipe sem alterar o saldo.

### Minhas solicitações e orientações

Mostrar somente a pessoa fictícia ativa na demonstração, com status, quantidades solicitada e retirada e histórico de eventos. Explicitar que essa seleção não constitui proteção de dados.

As etapas serão Solicitação enviada, Confirmada e Retirada registrada. Para retornáveis, acrescentar Devolução registrada. Consumo será concluído na retirada, sem cobrança de devolução. A previsão de devolução aparecerá apenas quando tiver sido registrada pela equipe.

A tela Como funciona resumirá o guia existente, sem acrescentar multas, prazos fixos ou regras de cancelamento.

## Área da equipe

### Visão geral e solicitações

Exibir contagens calculadas a partir da demonstração: solicitações aguardando confirmação, pedidos confirmados aguardando retirada e empréstimos em aberto. Cada contador levará à lista correspondente.

O detalhe de uma solicitação mostrará solicitante, turma/curso, material, quantidade e finalidade. “Confirmar solicitação” criará um evento separado. A confirmação não registrará retirada nem alterará estoque.

Como a política de reserva está pendente, a interface explicará “Nesta demonstração, a confirmação não reserva o material”. Essa convenção técnica do protótipo não deverá ser transportada para produção como regra institucional.

### Retirada

Em um pedido confirmado, registrar quantidade efetivamente entregue, data e horário, pessoa responsável pelo registro e, para equipamentos, códigos das unidades disponíveis. Para retornáveis, registrar a previsão de devolução combinada, sem sugerir um prazo institucional.

A quantidade entregue deverá ser positiva e não superar a solicitada ou a disponível. Para equipamentos, a quantidade de códigos selecionados deverá corresponder à quantidade entregue. Após a entrega, unidades identificadas ficarão emprestadas; reutilizáveis reduzirão sua quantidade disponível; consumo terá a saída registrada e o saldo reduzido.

O protótipo aceitará uma única retirada por solicitação. Se a quantidade entregue for menor, registrar claramente a diferença e informar que não existe entrega posterior do restante nesta demonstração. Entregas parceladas ficam fora deste primeiro recorte.

Revalidar disponibilidade ao registrar a retirada e impedir saldo negativo ou unidade já emprestada. Em caso de indisponibilidade, preservar o formulário e explicar o motivo. Impedir repetição da mesma retirada.

### Devolução

Para empréstimos em aberto, registrar data e horário efetivos e estado do material. O primeiro protótipo demonstrará devolução integral e uma única vez, identificando as unidades retornadas quando aplicável.

Após conferência sem problemas, retornar as unidades ou quantidades à disponibilidade. Se houver problema, registrar a devolução e manter o material fora do disponível, com a indicação “Aguardando avaliação”. Não definir punição, reparo ou descarte. A instituição deverá definir o tratamento e a liberação desses itens antes da operação real.

### Materiais

Permitir consultar e cadastrar materiais demonstrativos com nome, categoria, unidade de medida e saldo inicial fictício; equipamentos terão códigos únicos por unidade. Duplicação de códigos e saldo inicial negativo serão rejeitados.

Itens com movimentação terão seus dados estruturais preservados no protótipo: não haverá troca de categoria, unidade de medida ou edição direta de saldo. Correções, reposições e auditoria operacional terão desenho próprio em uma etapa posterior.

## Dados e implementação proposta

Usar HTML, CSS e JavaScript em módulos, sem dependências externas para executar a experiência. Essa escolha serve ao protótipo e não define a tecnologia de produção.

Separar navegação e renderização, regras das transições e dados de demonstração. Aluno e equipe compartilharão o mesmo estado em memória na página. Ao recarregar, os dados retornarão ao cenário inicial; a interface informará esse comportamento e oferecerá “Reiniciar demonstração”.

Separar material, unidade identificada, solicitação, confirmação, retirada, devolução e movimento de estoque. Quantidade solicitada e quantidade entregue serão campos diferentes. Disponibilidade será derivada das movimentações e da condição das unidades, nunca de um número decorativo independente.

Usar pessoas fictícias, códigos com prefixo DEMO e datas explicitamente demonstrativas. Não importar a planilha nem tratar os saldos do briefing como estoque real. Não completar o ano do exemplo de 23/09.

## Verificação da experiência

1. Buscar, filtrar e solicitar um item; confirmar que o saldo permanece igual após solicitação e confirmação.
2. Alternar para a equipe, registrar retirada e verificar o reflexo imediato no catálogo e no acompanhamento do aluno.
3. Devolver um retornável em boas condições e verificar a recomposição da disponibilidade; repetir com problema e verificar que não fica disponível.
4. Retirar consumo e verificar a baixa sem criar devolução.
5. Tentar duas retiradas para a última unidade, envio repetido, quantidade inválida e código duplicado; verificar mensagens e ausência de saldo negativo.
6. Navegar por teclado e em larguras de celular e desktop; verificar foco, rótulos, leitura dos status, estados vazios e ausência de conteúdo cortado.
7. Reiniciar e recarregar a demonstração; verificar o retorno consistente dos dados e a sinalização de que nada foi salvo para operação real.

## Decisões que continuam institucionais

Inventário real, identidade visual oficial, autenticação, permissões, local de retirada, reserva, expiração, cancelamento, atrasos, tratamento de danos, reposições e correções. Nenhuma dessas definições é requisito para validar o protótipo com dados fictícios, mas precisam ser resolvidas conforme o escopo antes de uma versão operacional.
