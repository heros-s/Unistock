// data.mjs — leitura e escrita do acervo no Supabase (tabelas e funções de supabase/dados.sql).
// Recebe getClient (de auth.mjs) para usar a mesma sessão do login da equipe.
import {DomainError} from './domain/validation.mjs';
import {emptyState} from './domain/inventory.mjs';

const PAGE = 1000; // limite padrão de linhas por resposta do Supabase
const MSG = {
  connection:'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.',
  session:'Sua sessão expirou. Entre novamente na área da equipe.',
  duplicate:'Este registro já foi salvo. Atualize a página para ver a situação atual.',
  generic:'Não foi possível salvar. Tente novamente.'
};

const toMaterial = r => ({id:r.id, name:r.nome, category:r.categoria, measure:r.medida});
const toUnit = r => ({code:r.codigo, materialId:r.material_id, status:r.status});
const toRequest = r => ({id:r.id, materialId:r.material_id, quantity:r.quantidade, name:r.nome,
  course:r.curso, purpose:r.finalidade, at:r.criado_em});
const toConfirmation = r => ({requestId:r.solicitacao_id, at:r.em});
const toPickup = r => ({requestId:r.solicitacao_id, quantity:r.quantidade, codes:r.codigos ?? [],
  operator:r.responsavel, at:r.em, dueAt:r.previsao_devolucao ?? null});
const toReturn = r => ({requestId:r.solicitacao_id, at:r.em, condition:r.condicao, notes:r.observacoes ?? ''});
const toGiftOut = r => ({id:r.id, materialId:r.material_id, quantity:r.quantidade, recipient:r.destinatario,
  operator:r.responsavel, at:r.em, notes:r.observacoes ?? ''});
const toMovement = r => ({materialId:r.material_id, requestId:r.solicitacao_id ?? null, kind:r.tipo, delta:r.delta});

/** Converte o erro do Supabase em DomainError com o campo a destacar na tela. */
export function toDomainError(error) {
  if (error instanceof DomainError) return error;
  const code = error && error.code;
  if (code === 'P0001') return new DomainError(error.hint || 'form', error.message || MSG.generic);
  if (code === '23505') return new DomainError('form', MSG.duplicate);
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return new DomainError('form', MSG.session);
  if (!code || /fetch|network|failed/i.test(String(error && error.message))) return new DomainError('form', MSG.connection);
  return new DomainError('form', MSG.generic);
}

async function run(promise) {
  let result;
  try { result = await promise; } catch (error) { throw toDomainError(error); }
  if (result && result.error) throw toDomainError(result.error);
  return result ? result.data : null;
}

async function selectAll(client, table, order) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const page = await run(client.from(table).select('*').order(order, {ascending:true}).range(from, from + PAGE - 1));
    rows.push(...(page ?? []));
    if (!page || page.length < PAGE) return rows;
  }
}

/**
 * @param getClient função que devolve (Promise) o cliente supabase-js.
 * @param local {requestIds(), addRequestId(id)} — solicitações enviadas deste navegador.
 */
export function createBackend(getClient, local) {
  const client = async () => {
    try { return await getClient(); } catch (error) { throw toDomainError(error); }
  };
  const rpc = async (name, params) => run((await client()).rpc(name, params));

  async function load(scope) {
    const c = await client();
    const state = emptyState();
    const [materials, units, movements] = await Promise.all([
      selectAll(c, 'materiais', 'nome'), selectAll(c, 'unidades', 'codigo'), selectAll(c, 'movimentos', 'id')]);
    state.materials = materials.map(toMaterial);
    state.units = units.map(toUnit);
    state.movements = movements.map(toMovement);
    if (scope === 'team') {
      const [requests, confirmations, pickups, returns, giftOuts] = await Promise.all([
        selectAll(c, 'solicitacoes', 'criado_em'), selectAll(c, 'confirmacoes', 'em'), selectAll(c, 'retiradas', 'em'),
        selectAll(c, 'devolucoes', 'em'), selectAll(c, 'saidas_brinde', 'em')]);
      Object.assign(state, {requests:requests.map(toRequest), confirmations:confirmations.map(toConfirmation),
        pickups:pickups.map(toPickup), returns:returns.map(toReturn), giftOuts:giftOuts.map(toGiftOut)});
    } else {
      const ids = local.requestIds();
      if (ids.length) {
        const own = await run(c.rpc('consultar_solicitacoes', {p_ids:ids})) ?? {};
        Object.assign(state, {requests:(own.solicitacoes ?? []).map(toRequest),
          confirmations:(own.confirmacoes ?? []).map(toConfirmation), pickups:(own.retiradas ?? []).map(toPickup),
          returns:(own.devolucoes ?? []).map(toReturn)});
      }
    }
    // Um pedido só aparece com o material carregado (ex.: brinde oculto para quem não é da equipe).
    const known = new Set(state.materials.map(m => m.id));
    state.requests = state.requests.filter(r => known.has(r.materialId));
    return state;
  }

  return {
    load,
    material: p => rpc('cadastrar_material', {p_id:p.id, p_nome:p.name, p_categoria:p.category, p_medida:p.measure,
      p_quantidade:p.quantity, p_codigos:p.codes ?? []}),
    async request(p) {
      try {
        await rpc('solicitar_material', {p_id:p.id, p_material_id:p.materialId, p_quantidade:p.quantity,
          p_nome:p.name, p_curso:p.course, p_finalidade:p.purpose});
      } catch (error) {
        // Reenvio após falha de rede: o pedido já foi gravado na primeira tentativa.
        if (!(error instanceof DomainError && error.field === 'id' && /já foi enviada/.test(error.message))) throw error;
      }
      local.addRequestId(p.id);
    },
    confirm: p => rpc('confirmar_solicitacao', {p_solicitacao_id:p.requestId}),
    pickup: p => rpc('registrar_retirada', {p_solicitacao_id:p.requestId, p_quantidade:p.quantity, p_codigos:p.codes ?? [],
      p_responsavel:p.operator, p_em:p.at, p_previsao_devolucao:p.dueAt ?? null}),
    return: p => rpc('registrar_devolucao', {p_solicitacao_id:p.requestId, p_em:p.at, p_condicao:p.condition,
      p_observacoes:p.notes ?? ''}),
    gift: p => rpc('registrar_saida_brinde', {p_id:p.id, p_material_id:p.materialId, p_quantidade:p.quantity,
      p_destinatario:p.recipient, p_responsavel:p.operator, p_em:p.at, p_observacoes:p.notes ?? ''})
  };
}
