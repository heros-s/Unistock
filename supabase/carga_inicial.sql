-- Unistock: carga inicial do acervo (gerado por scripts/carga-inicial.mjs; nao edite a mao).
-- Execute no SQL Editor do Supabase DEPOIS de dados.sql. Pode ser repetido: materiais ja
-- cadastrados (mesmo id) sao ignorados, entao saldos alterados pelo uso nao sao sobrescritos.
do $$
declare
  item record;
begin
  for item in
    select * from (values
    ('projetor', 'Projetor', 'equipment', 'unidade', 3, array['11533', '11706', '11627']::text[]),
    ('computador', 'Computador', 'equipment', 'unidade', 11, array['1145', '9501', '9502', '9503', '9504', '9505', '9506', '9507', '9508', '9509', '9510']::text[]),
    ('caixa-de-som', 'Caixa de som', 'equipment', 'unidade', 1, array['9547']::text[]),
    ('apresentador-sem-fio', 'Apresentador sem fio', 'reusable', 'unidade', 3, '{}'::text[]),
    ('kit-apagador-com-marcadores', 'Apagador com marcadores (kit)', 'reusable', 'kit', 2, '{}'::text[]),
    ('apagador', 'Apagador de quadro branco', 'reusable', 'unidade', 6, '{}'::text[]),
    ('perfurador', 'Perfurador de papel', 'reusable', 'unidade', 1, '{}'::text[]),
    ('calculadora', 'Calculadora', 'reusable', 'unidade', 1, '{}'::text[]),
    ('pistola-cola-quente', 'Pistola de cola quente', 'reusable', 'unidade', 1, '{}'::text[]),
    ('marcador-verde', 'Marcador de quadro branco verde', 'reusable', 'unidade', 4, '{}'::text[]),
    ('marcador-azul', 'Marcador de quadro branco azul', 'reusable', 'unidade', 6, '{}'::text[]),
    ('marcador-vermelho', 'Marcador de quadro branco vermelho', 'reusable', 'unidade', 2, '{}'::text[]),
    ('marcador-preto', 'Marcador de quadro branco preto', 'reusable', 'unidade', 3, '{}'::text[]),
    ('caneta-azul', 'Caneta azul', 'consumable', 'unidade', 4, '{}'::text[]),
    ('caneta-preta', 'Caneta preta', 'consumable', 'unidade', 90, '{}'::text[]),
    ('caneta-bic-caixa', 'Caneta Bic (caixa)', 'consumable', 'caixa', 1, '{}'::text[]),
    ('post-it', 'Post-it', 'consumable', 'pacote', 1, '{}'::text[]),
    ('grampos', 'Grampos', 'consumable', 'caixa', 1, '{}'::text[]),
    ('reabastecedor-marcador-preto', 'Reabastecedor de marcador preto', 'consumable', 'unidade', 2, '{}'::text[]),
    ('reabastecedor-marcador-vermelho', 'Reabastecedor de marcador vermelho', 'consumable', 'unidade', 1, '{}'::text[]),
    ('reabastecedor-marcador-azul', 'Reabastecedor de marcador azul', 'consumable', 'unidade', 1, '{}'::text[]),
    ('baloes', 'Balões', 'consumable', 'pacote', 2, '{}'::text[]),
    ('papel-a4-branco', 'Papel A4 branco (pacote com 500 folhas)', 'consumable', 'pacote', 1, '{}'::text[]),
    ('papel-a4-verde', 'Papel A4 verde (pacote com 100 folhas)', 'consumable', 'pacote', 1, '{}'::text[]),
    ('papel-a4-rosa', 'Papel A4 rosa (pacote com 100 folhas)', 'consumable', 'pacote', 1, '{}'::text[]),
    ('papel-fotografico', 'Papel fotográfico', 'consumable', 'pacote', 1, '{}'::text[]),
    ('bastao-cola-quente', 'Bastão de cola quente', 'consumable', 'unidade', 3, '{}'::text[]),
    ('fita-dupla-face', 'Fita dupla face', 'consumable', 'rolo', 1, '{}'::text[]),
    ('fita-crepe', 'Fita crepe', 'consumable', 'rolo', 2, '{}'::text[]),
    ('lapis-de-cor', 'Lápis de cor', 'consumable', 'caixa', 2, '{}'::text[]),
    ('massinha', 'Massinha de modelar', 'consumable', 'caixa', 2, '{}'::text[]),
    ('eva-verde', 'EVA verde', 'consumable', 'folha', 1, '{}'::text[]),
    ('eva-amarelo', 'EVA amarelo', 'consumable', 'folha', 3, '{}'::text[]),
    ('eva-azul', 'EVA azul', 'consumable', 'folha', 1, '{}'::text[]),
    ('eva-vermelho', 'EVA vermelho', 'consumable', 'folha', 2, '{}'::text[]),
    ('eva-branco', 'EVA branco', 'consumable', 'folha', 1, '{}'::text[]),
    ('brinde-garrafa', 'Garrafa', 'gift', 'unidade', 200, '{}'::text[]),
    ('brinde-garrafa-termica', 'Garrafa térmica', 'gift', 'unidade', 7, '{}'::text[]),
    ('brinde-bone', 'Boné', 'gift', 'unidade', 7, '{}'::text[]),
    ('brinde-kit-churrasco', 'Kit churrasco', 'gift', 'kit', 6, '{}'::text[]),
    ('brinde-pacote-vinho', 'Pacote de vinho', 'gift', 'pacote', 37, '{}'::text[]),
    ('brinde-vinho-cabernet', 'Vinho Cabernet Sauvignon', 'gift', 'unidade', 12, '{}'::text[]),
    ('brinde-porta-prato', 'Porta-prato', 'gift', 'unidade', 4, '{}'::text[]),
    ('brinde-caderneta-dia-de-campo', 'Caderneta "Dia de Campo"', 'gift', 'unidade', 35, '{}'::text[]),
    ('brinde-lixeira-carro-dia-de-campo', 'Lixeira de carro "Dia de Campo"', 'gift', 'unidade', 92, '{}'::text[]),
    ('brinde-abridor-dia-de-campo', 'Abridor de garrafa "Dia de Campo"', 'gift', 'unidade', 33, '{}'::text[]),
    ('brinde-copo-termico', 'Copo térmico', 'gift', 'unidade', 7, '{}'::text[]),
    ('brinde-kit-terere', 'Kit copo de tereré', 'gift', 'kit', 1, '{}'::text[]),
    ('brinde-kit-chimarrao', 'Kit copo de chimarrão', 'gift', 'kit', 1, '{}'::text[]),
    ('brinde-bola-volei', 'Bola de vôlei', 'gift', 'unidade', 12, '{}'::text[]),
    ('brinde-mouse-pad', 'Mouse pad com apoio', 'gift', 'unidade', 5, '{}'::text[])
    ) as t(id, nome, categoria, medida, quantidade, codigos)
  loop
    if not exists (select 1 from public.materiais where id = item.id) then
      perform privado.inserir_material(item.id, item.nome, item.categoria, item.medida, item.quantidade, item.codigos, null);
    end if;
  end loop;
end;
$$;
