import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../src/demo.mjs';
import {availability, addMaterial} from '../src/domain/inventory.mjs';
import {requestMaterial,confirmRequest,recordPickup,recordReturn,requestStatus} from '../src/domain/workflow.mjs';
const at='2026-10-05T12:00:00.000Z'; // Data de teste fictícia, sem relação com o briefing.
function pending(id='r1',materialId='notebook',quantity=1) {
  return {id,studentId:'DEMO-ALUNO-1',name:'Ana Exemplo',course:'Design',
    materialId,quantity,purpose:'Atividade demonstrativa',at};
}
function confirmed(s,id='r1',materialId='notebook',quantity=1) {
  return confirmRequest(requestMaterial(s,pending(id,materialId,quantity)),{requestId:id,at});
}
const pickup=(requestId='r1',changes={})=>({requestId,quantity:1,codes:['DEMO-N-01'],
  at,dueAt:'2026-10-05T15:00:00.000Z',operator:'Equipe Exemplo',...changes});
const returned=(changes={})=>({requestId:'r1',at:'2026-10-05T14:00:00.000Z',
  condition:'ok',notes:'Conferido na demonstração',...changes});

test('solicitação e confirmação não diminuem saldo; retirada e devolução sim',()=>{
  let s=confirmed(createDemoState());
  assert.equal(availability(s,'notebook'),2);
  s=recordPickup(s,pickup());
  assert.equal(availability(s,'notebook'),1);
  assert.equal(requestStatus(s,'r1'),'loaned');
  s=recordReturn(s,returned());
  assert.equal(availability(s,'notebook'),2);
  assert.equal(requestStatus(s,'r1'),'returned');
  assert.throws(()=>recordReturn(s,returned()),/devolução/i);
});
test('última caixa só pode ser entregue uma vez; falha não altera estado',()=>{
  let s=confirmed(createDemoState(),'r1','lapis',3);
  s=confirmed(s,'r2','lapis',3);
  s=recordPickup(s,pickup('r1',{quantity:3,codes:[],dueAt:null}));
  const snapshot=structuredClone(s);
  assert.equal(availability(s,'lapis'),0);
  assert.equal(requestStatus(s,'r1'),'completed');
  assert.throws(()=>recordPickup(s,pickup('r2',{quantity:3,codes:[],dueAt:null})),/dispon/i);
  assert.throws(()=>recordPickup(s,pickup('r1',{quantity:3,codes:[],dueAt:null})),/retirada/i);
  assert.throws(()=>recordReturn(s,returned()),/consumo/i);
  assert.deepEqual(s,snapshot);
});
test('devolução com problema não libera equipamento nem reutilizável',()=>{
  for(const materialId of ['notebook','tesoura']) {
    let s=confirmed(createDemoState(),'r1',materialId);
    const original=availability(s,materialId);
    s=recordPickup(s,pickup('r1',{codes:materialId==='notebook'?['DEMO-N-01']:[]}));
    s=recordReturn(s,returned({condition:'problem',notes:'Problema fictício para avaliação'}));
    assert.equal(availability(s,materialId),original-1);
    if(materialId==='notebook') assert.equal(s.units.find(u=>u.code==='DEMO-N-01').status,'review');
  }
});
test('rejeita unidade incorreta, datas incoerentes e confirmação duplicada',()=>{
  const s=confirmed(createDemoState());
  assert.throws(()=>confirmRequest(s,{requestId:'r1',at}),/confirma/i);
  for(const change of [{codes:['DEMO-INEXISTENTE']},{codes:['DEMO-N-01','DEMO-N-01']},
    {at:'data inválida'},{dueAt:'2026-10-04T12:00:00.000Z'},
    {at:'2026-10-04T12:00:00.000Z'},{quantity:0},{quantity:2},{operator:' '}])
    assert.throws(()=>recordPickup(s,pickup('r1',change)));
  const out=recordPickup(s,pickup());
  assert.throws(()=>recordReturn(out,returned({at:'2026-10-04T12:00:00.000Z'})),/data|horário/i);
});
test('entrega menor registra só a quantidade entregue e não aceita segunda retirada',()=>{
  let s=confirmed(createDemoState(),'r1','tesoura',3);
  s=recordPickup(s,pickup('r1',{quantity:2,codes:[]}));
  assert.equal(s.requests[0].quantity,3);
  assert.equal(s.pickups[0].quantity,2);
  assert.equal(availability(s,'tesoura'),2);
  assert.throws(()=>recordPickup(s,pickup('r1',{codes:[]})),/retirada/i);
  s=recordReturn(s,returned());
  assert.equal(availability(s,'tesoura'),4);
});
test('bloqueia pedido duplicado, aluno inexistente e quantidade maior que saldo',()=>{
  const initial=createDemoState();
  const once=requestMaterial(initial,pending());
  assert.throws(()=>requestMaterial(once,pending()),/solicitação/i);
  for(const change of [{studentId:'ausente'},{quantity:0},{quantity:1.5},
    {quantity:3},{name:' '},{course:' '},{purpose:' '},{at:'inválida'}])
    assert.throws(()=>requestMaterial(initial,{...pending(),...change}));
});
test('não entrega unidade que pertence a outro material',()=>{
  let s=addMaterial(createDemoState(),{id:'camera',name:'Câmera',category:'equipment',
    measure:'unidade',quantity:1,codes:['DEMO-C-01']});
  s=confirmed(s);
  const before=structuredClone(s);
  assert.throws(()=>recordPickup(s,pickup('r1',{codes:['DEMO-C-01']})),
    error=>error.field==='codes');
  assert.deepEqual(s,before);
});
test('não pula confirmação nem registra confirmação anterior ao pedido',()=>{
  const s=requestMaterial(createDemoState(),pending());
  const before=structuredClone(s);
  assert.throws(()=>recordPickup(s,pickup()),/confirma/i);
  assert.throws(()=>confirmRequest(s,{requestId:'r1',at:'2026-10-04T12:00:00Z'}),
    error=>error.field==='at');
  assert.deepEqual(s,before);
});