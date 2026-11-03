import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../src/store.mjs';
import {createDemoState} from './fixtures.mjs';
import {DomainError} from '../src/domain/validation.mjs';

function fakeBackend(seed=createDemoState()) {
  const calls=[];
  let server=seed;
  return {calls, setServer:s=>{server=s;},
    load:async scope=>{calls.push(['load',scope]);return structuredClone(server);},
    request:async p=>{calls.push(['request',p.id]);},
    confirm:async p=>{calls.push(['confirm',p.requestId]);}};
}
const request={id:'r',name:'Ana Exemplo',course:'Design',materialId:'cartolina',quantity:2,purpose:'Atividade',at:'2026-10-05T12:00:00Z'};

test('carrega do servidor e não expõe estado mutável',async()=>{
  const backend=fakeBackend(), store=createStore(backend);
  await store.load('public');
  assert.equal(store.scope,'public');
  const reader=store.getState(); reader.materials.length=0;
  assert.ok(store.getState().materials.length>0);
});
test('valida antes de gravar: erro de domínio não chama o servidor',async()=>{
  const backend=fakeBackend(), store=createStore(backend);
  await store.load('public');
  await assert.rejects(store.dispatch('request',{...request,quantity:999}),error=>error instanceof DomainError&&error.field==='quantity');
  await assert.rejects(store.dispatch('desconhecida',{}),/desconhecida/);
  assert.deepEqual(backend.calls,[['load','public']]);
});
test('grava e recarrega o estado oficial do servidor',async()=>{
  const backend=fakeBackend(), store=createStore(backend);
  await store.load('team');
  backend.setServer({...createDemoState(),requests:[{...request,at:'2026-10-05T12:00:01Z'}]});
  const state=await store.dispatch('request',request);
  assert.deepEqual(backend.calls,[['load','team'],['request','r'],['load','team']]);
  assert.equal(state.requests[0].at,'2026-10-05T12:00:01Z');
});
test('falha do servidor preserva o estado; falha só na recarga usa a projeção local',async()=>{
  const backend=fakeBackend(), store=createStore(backend);
  await store.load('team');
  const before=store.getState();
  backend.request=async()=>{throw new DomainError('form','Sem conexão');};
  await assert.rejects(store.dispatch('request',request),/Sem conexão/);
  assert.deepEqual(store.getState(),before);
  backend.request=async()=>{};
  backend.load=async()=>{throw new Error('offline');};
  const state=await store.dispatch('request',request);
  assert.equal(state.requests.length,1);
});
test('resposta de carga antiga não sobrescreve a mais recente',async()=>{
  let release;
  const slow=new Promise(resolve=>{release=resolve;});
  const backend={load:async scope=>scope==='public'?(await slow,{...createDemoState(),materials:[]}):createDemoState()};
  const store=createStore(backend);
  const first=store.load('public');
  await store.load('team');
  release(); await first;
  assert.equal(store.scope,'team');
  assert.ok(store.getState().materials.length>0);
});
