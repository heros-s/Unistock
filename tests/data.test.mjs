import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackend, toDomainError} from '../src/data.mjs';
import {createLocalData} from '../src/local.mjs';
import {DomainError} from '../src/domain/validation.mjs';
import {availability} from '../src/domain/inventory.mjs';

const ID='11111111-2222-4333-8444-555555555555';
function memoryStorage() {
  const map=new Map();
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};
}
function fakeClient(tables={},rpcs={}) {
  const calls=[];
  return {calls,
    from(table) {
      const query={select(){return query;},order(column){query.column=column;return query;},
        range(from,to){calls.push(['from',table,from,to]);
          const rows=(tables[table]??[]).slice(from,to+1);
          return Promise.resolve({data:rows,error:null});}};
      return query;
    },
    rpc(name,params) {
      calls.push(['rpc',name,params]);
      const handler=rpcs[name];
      return Promise.resolve(handler?handler(params):{data:null,error:null});
    }};
}
const tables={
  materiais:[{id:'projetor',nome:'Projetor',categoria:'equipment',medida:'unidade'},
    {id:'caneta',nome:'Caneta',categoria:'consumable',medida:'unidade'}],
  unidades:[{codigo:'11533',material_id:'projetor',status:'available'},{codigo:'11706',material_id:'projetor',status:'loaned'}],
  movimentos:[{id:1,material_id:'caneta',solicitacao_id:null,tipo:'initial',delta:90},
    {id:2,material_id:'caneta',solicitacao_id:ID,tipo:'out',delta:-4}],
  solicitacoes:[{id:ID,material_id:'caneta',quantidade:4,nome:'Ana',curso:'Design',finalidade:'Aula',criado_em:'2026-11-03T12:00:00+00:00'},
    {id:'99999999-2222-4333-8444-555555555555',material_id:'brinde-oculto',quantidade:1,nome:'X',curso:'Y',finalidade:'Z',criado_em:'2026-11-03T12:00:00+00:00'}],
  confirmacoes:[{solicitacao_id:ID,em:'2026-11-03T12:05:00+00:00'}],
  retiradas:[{solicitacao_id:ID,quantidade:4,codigos:[],responsavel:'Equipe',em:'2026-11-03T12:10:00+00:00',previsao_devolucao:null}],
  devolucoes:[], saidas_brinde:[]
};

test('carga da equipe converte as tabelas para o estado do domínio',async()=>{
  const client=fakeClient(tables);
  const state=await createBackend(async()=>client,createLocalData(memoryStorage())).load('team');
  assert.deepEqual(state.materials[0],{id:'projetor',name:'Projetor',category:'equipment',measure:'unidade'});
  assert.equal(availability(state,'projetor'),1);
  assert.equal(availability(state,'caneta'),86);
  assert.equal(state.requests.length,1,'pedido de material não carregado é descartado');
  assert.deepEqual(state.pickups[0],{requestId:ID,quantity:4,codes:[],operator:'Equipe',at:'2026-11-03T12:10:00+00:00',dueAt:null});
});
test('carga pública lê só os pedidos deste navegador pela função do servidor',async()=>{
  const local=createLocalData(memoryStorage());
  const client=fakeClient(tables,{consultar_solicitacoes:()=>({data:{solicitacoes:[tables.solicitacoes[0]],
    confirmacoes:tables.confirmacoes,retiradas:[],devolucoes:[]},error:null})});
  const backend=createBackend(async()=>client,local);
  let state=await backend.load('public');
  assert.equal(state.requests.length,0);
  assert.ok(!client.calls.some(c=>c[0]==='rpc'),'sem pedidos guardados não consulta o servidor');
  assert.ok(!client.calls.some(c=>c[1]==='solicitacoes'),'não lê a tabela de pedidos sem login');
  local.addRequestId(ID);
  state=await backend.load('public');
  assert.deepEqual(client.calls.at(-1),['rpc','consultar_solicitacoes',{p_ids:[ID]}]);
  assert.equal(state.requests[0].name,'Ana');
  assert.equal(state.confirmations.length,1);
});
test('carga pagina tabelas com mais de mil linhas',async()=>{
  const many=Array.from({length:2500},(_,i)=>({id:i+1,material_id:'caneta',solicitacao_id:null,tipo:'initial',delta:1}));
  const client=fakeClient({...tables,movimentos:many});
  const state=await createBackend(async()=>client,createLocalData(memoryStorage())).load('public');
  assert.equal(state.movements.length,2500);
  assert.deepEqual(client.calls.filter(c=>c[1]==='movimentos').map(c=>c[2]),[0,1000,2000]);
});
test('ações chamam as funções do servidor com os parâmetros esperados',async()=>{
  const local=createLocalData(memoryStorage());
  const client=fakeClient(tables);
  const backend=createBackend(async()=>client,local);
  await backend.request({id:ID,materialId:'caneta',quantity:2,name:'Ana',course:'Design',purpose:'Aula'});
  assert.deepEqual(local.requestIds(),[ID]);
  await backend.material({id:'m',name:'Computador',category:'equipment',measure:'unidade',quantity:1,codes:['9501']});
  await backend.pickup({requestId:ID,quantity:1,codes:[],operator:'Equipe',at:'2026-11-03T12:00:00.000Z',dueAt:null});
  await backend.gift({id:ID,materialId:'bone',quantity:1,recipient:'Evento',operator:'Equipe',at:'2026-11-03T12:00:00.000Z',notes:''});
  assert.deepEqual(client.calls.map(c=>c[1]),['solicitar_material','cadastrar_material','registrar_retirada','registrar_saida_brinde']);
  assert.deepEqual(client.calls[1][2],{p_id:'m',p_nome:'Computador',p_categoria:'equipment',p_medida:'unidade',p_quantidade:1,p_codigos:['9501']});
  assert.equal(client.calls[2][2].p_previsao_devolucao,null);
});
test('erros do servidor viram mensagens com o campo a destacar',async()=>{
  const client=fakeClient(tables,{registrar_retirada:()=>({data:null,error:{code:'P0001',message:'Quantidade indisponível. Confira o saldo atual.',hint:'quantity'}})});
  const backend=createBackend(async()=>client,createLocalData(memoryStorage()));
  await assert.rejects(backend.pickup({requestId:ID,quantity:9,codes:[],operator:'E',at:'x'}),
    error=>error instanceof DomainError&&error.field==='quantity'&&/indisponível/.test(error.message));
  assert.match(toDomainError({message:'TypeError: Failed to fetch',code:''}).message,/conexão/);
  assert.match(toDomainError({code:'42501',message:'permission denied'}).message,/sessão/);
  assert.match(toDomainError({code:'23505',message:'duplicate'}).message,/já foi salvo/);
  await assert.rejects(createBackend(async()=>{throw new Error('cdn');},createLocalData(memoryStorage())).load('public'),
    error=>error instanceof DomainError);
});
test('reenvio de pedido já gravado é tratado como sucesso e guarda o id',async()=>{
  const local=createLocalData(memoryStorage());
  const client=fakeClient(tables,{solicitar_material:()=>({data:null,error:{code:'P0001',message:'Esta solicitação já foi enviada.',hint:'id'}})});
  await createBackend(async()=>client,local).request({id:ID,materialId:'caneta',quantity:1,name:'A',course:'B',purpose:'C'});
  assert.deepEqual(local.requestIds(),[ID]);
});
test('armazenamento local ignora dados inválidos e falhas do navegador',()=>{
  const storage=memoryStorage();
  storage.setItem('unistock:solicitacoes',JSON.stringify(['não-é-uuid',ID,42]));
  assert.deepEqual(createLocalData(storage).requestIds(),[ID]);
  const broken={getItem(){throw new Error('bloqueado');},setItem(){throw new Error('bloqueado');}};
  const local=createLocalData(broken);
  assert.deepEqual(local.requestIds(),[]);
  assert.equal(local.addRequestId(ID),false);
  assert.deepEqual(local.requester(),{name:'',course:''});
  assert.deepEqual(createLocalData(null).requestIds(),[]);
});
