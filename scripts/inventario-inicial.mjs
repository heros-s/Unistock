// inventario-inicial.mjs — acervo real levantado em docs/lista_materiais.md (nov/2026).
// Fonte única da carga inicial: `node scripts/carga-inicial.mjs` gera supabase/carga_inicial.sql.
// Categorias: equipment (devolve, com patrimônio), reusable (devolve), consumable (descartável),
// gift (brinde: só a equipe registra a saída, sem devolução).
const item = (id, name, category, measure, quantity, codes = []) => ({id, name, category, measure, quantity, codes});
const range = (from, to) => Array.from({length:to-from+1}, (_, i) => String(from+i));

export const inventarioInicial = [
  // Equipamentos: cada unidade identificada pelo número de patrimônio.
  item('projetor', 'Projetor', 'equipment', 'unidade', 3, ['11533','11706','11627']),
  item('computador', 'Computador', 'equipment', 'unidade', 11, ['1145', ...range(9501, 9510)]),
  item('caixa-de-som', 'Caixa de som', 'equipment', 'unidade', 1, ['9547']),

  // Reutilizáveis: voltam para o acervo após o uso.
  item('apresentador-sem-fio', 'Apresentador sem fio', 'reusable', 'unidade', 3),
  item('kit-apagador-com-marcadores', 'Apagador com marcadores (kit)', 'reusable', 'kit', 2),
  item('apagador', 'Apagador de quadro branco', 'reusable', 'unidade', 6),
  item('perfurador', 'Perfurador de papel', 'reusable', 'unidade', 1),
  item('calculadora', 'Calculadora', 'reusable', 'unidade', 1),
  item('pistola-cola-quente', 'Pistola de cola quente', 'reusable', 'unidade', 1),
  item('marcador-verde', 'Marcador de quadro branco verde', 'reusable', 'unidade', 4),
  item('marcador-azul', 'Marcador de quadro branco azul', 'reusable', 'unidade', 6),
  item('marcador-vermelho', 'Marcador de quadro branco vermelho', 'reusable', 'unidade', 2),
  item('marcador-preto', 'Marcador de quadro branco preto', 'reusable', 'unidade', 3),

  // Consumo: descartáveis, a retirada encerra o pedido.
  item('caneta-azul', 'Caneta azul', 'consumable', 'unidade', 4),
  item('caneta-preta', 'Caneta preta', 'consumable', 'unidade', 90),
  item('caneta-bic-caixa', 'Caneta Bic (caixa)', 'consumable', 'caixa', 1),
  item('post-it', 'Post-it', 'consumable', 'pacote', 1),
  item('grampos', 'Grampos', 'consumable', 'caixa', 1),
  item('reabastecedor-marcador-preto', 'Reabastecedor de marcador preto', 'consumable', 'unidade', 2),
  item('reabastecedor-marcador-vermelho', 'Reabastecedor de marcador vermelho', 'consumable', 'unidade', 1),
  item('reabastecedor-marcador-azul', 'Reabastecedor de marcador azul', 'consumable', 'unidade', 1),
  item('baloes', 'Balões', 'consumable', 'pacote', 2),
  item('papel-a4-branco', 'Papel A4 branco (pacote com 500 folhas)', 'consumable', 'pacote', 1),
  item('papel-a4-verde', 'Papel A4 verde (pacote com 100 folhas)', 'consumable', 'pacote', 1),
  item('papel-a4-rosa', 'Papel A4 rosa (pacote com 100 folhas)', 'consumable', 'pacote', 1),
  item('papel-fotografico', 'Papel fotográfico', 'consumable', 'pacote', 1),
  item('bastao-cola-quente', 'Bastão de cola quente', 'consumable', 'unidade', 3),
  item('fita-dupla-face', 'Fita dupla face', 'consumable', 'rolo', 1),
  item('fita-crepe', 'Fita crepe', 'consumable', 'rolo', 2),
  item('lapis-de-cor', 'Lápis de cor', 'consumable', 'caixa', 2),
  item('massinha', 'Massinha de modelar', 'consumable', 'caixa', 2),
  item('eva-verde', 'EVA verde', 'consumable', 'folha', 1),
  item('eva-amarelo', 'EVA amarelo', 'consumable', 'folha', 3),
  item('eva-azul', 'EVA azul', 'consumable', 'folha', 1),
  item('eva-vermelho', 'EVA vermelho', 'consumable', 'folha', 2),
  item('eva-branco', 'EVA branco', 'consumable', 'folha', 1),

  // Brindes: fora do catálogo do aluno.
  item('brinde-garrafa', 'Garrafa', 'gift', 'unidade', 200),
  item('brinde-garrafa-termica', 'Garrafa térmica', 'gift', 'unidade', 7),
  item('brinde-bone', 'Boné', 'gift', 'unidade', 7),
  item('brinde-kit-churrasco', 'Kit churrasco', 'gift', 'kit', 6),
  item('brinde-pacote-vinho', 'Pacote de vinho', 'gift', 'pacote', 37),
  item('brinde-vinho-cabernet', 'Vinho Cabernet Sauvignon', 'gift', 'unidade', 12),
  item('brinde-porta-prato', 'Porta-prato', 'gift', 'unidade', 4),
  item('brinde-caderneta-dia-de-campo', 'Caderneta "Dia de Campo"', 'gift', 'unidade', 35),
  item('brinde-lixeira-carro-dia-de-campo', 'Lixeira de carro "Dia de Campo"', 'gift', 'unidade', 92),
  item('brinde-abridor-dia-de-campo', 'Abridor de garrafa "Dia de Campo"', 'gift', 'unidade', 33),
  item('brinde-copo-termico', 'Copo térmico', 'gift', 'unidade', 7),
  item('brinde-kit-terere', 'Kit copo de tereré', 'gift', 'kit', 1),
  item('brinde-kit-chimarrao', 'Kit copo de chimarrão', 'gift', 'kit', 1),
  item('brinde-bola-volei', 'Bola de vôlei', 'gift', 'unidade', 12),
  item('brinde-mouse-pad', 'Mouse pad com apoio', 'gift', 'unidade', 5)
];
